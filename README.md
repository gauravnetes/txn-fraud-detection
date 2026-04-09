# tx.verify() — Real-Time Payment Fraud Detection

A 3-layer, low-latency fraud detection system for digital payments. Routes real-time transactions through behavioral profiling, graph-based fraud ring detection, and an LLM reasoning engine.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          tx.verify() Architecture                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Payment Gateway                                                            │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │  Layer 0: Go API Gateway (Gin)              :8080       │               │
│   │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │               │
│   │  │ Redis Feature│  │ /api/v1/     │  │  Client Pkg  │   │               │
│   │  │    Store     │  │   verify     │  │  (ml, graph, │   │               │
│   │  │   :6379      │  │   check-     │  │   llm)       │   │               │
│   │  │             │  │   recipient  │  │              │   │               │
│   │  └─────────────┘  └──────┬───────┘  └──────────────┘   │               │
│   └──────────────────────────┼──────────────────────────────┘               │
│                              │                                               │
│          ┌───────────────────┼───────────────────┐                          │
│          ▼                   ▼                    ▼                          │
│   ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐                 │
│   │  Layer 1:   │   │  Layer 2:    │   │  Layers 3 & 4:  │                 │
│   │  ML Engine  │   │ Graph Engine │   │  Reasoning +    │                 │
│   │  (FastAPI)  │   │  (FastAPI)   │   │  Civic Actions  │                 │
│   │   :8001     │   │   :8002      │   │  (FastAPI)      │                 │
│   │             │   │              │   │   :8003          │                 │
│   │ Isolation   │   │  Neo4j       │   │  LangChain +    │                 │
│   │ Forest      │   │  Cypher      │   │  OpenAI         │                 │
│   │ Anomaly     │   │  Hop-based   │   │  Slack Alert    │                 │
│   │ Detection   │   │  Risk        │   │  Account Freeze │                 │
│   └─────────────┘   └──────────────┘   └─────────────────┘                 │
│                              │                                               │
│                       ┌──────┴───────┐                                      │
│                       │   Neo4j DB   │                                      │
│                       │  :7474/:7687 │                                      │
│                       └──────────────┘                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Language | Port | Description |
|---|---|---|---|
| **Gateway** | Go (Gin) | `:8080` | API orchestrator, Redis feature store |
| **ML Engine** | Python (FastAPI) | `:8001` | Isolation Forest anomaly detection |
| **Graph Engine** | Python (FastAPI) | `:8002` | Neo4j hop-based fraud network risk |
| **Reasoning Engine** | Python (FastAPI) | `:8003` | LLM fraud analyst + civic actions |
| **Redis** | — | `:6379` | User behavioral feature store |
| **Neo4j** | — | `:7687` | Fraud relationship graph DB |

## Quick Start

### 1. Start Infrastructure
```bash
docker compose up -d
```

### 2. Set Up Python Environments
```bash
# ML Engine
cd 2-ml-engine && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt

# Graph Engine
cd 3-graph-engine && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt

# Reasoning Engine
cd 4-reasoning-engine && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt
```

### 3. Seed the Graph (after Neo4j is up)
```bash
cd 3-graph-engine && python seed_graph.py
```

### 4. Start All Services
```bash
# Terminal 1: ML Engine
cd 2-ml-engine && python main.py

# Terminal 2: Graph Engine
cd 3-graph-engine && python main.py

# Terminal 3: Reasoning Engine (set OPENAI_API_KEY for LLM mode)
cd 4-reasoning-engine && python main.py

# Terminal 4: Go Gateway
cd 1-gateway-service && go run .
```

### 5. Test the System

**Full transaction verification:**
```bash
curl -X POST http://localhost:8080/api/v1/verify ^
  -H "Content-Type: application/json" ^
  -d "{\"tx_id\":\"TXN-001\",\"user_id\":\"USR-42\",\"amount\":95000,\"timestamp\":\"2026-04-09T12:00:00Z\",\"device_id\":\"UNKNOWN-DEVICE\",\"ip_address\":\"192.168.1.100\",\"location\":\"Lagos,NG\",\"target_account\":\"FRAUD-ACC-001\"}"
```

**Pre-flight recipient check (Truecaller-style):**
```bash
curl "http://localhost:8080/api/v1/check-recipient?account=FRAUD-ACC-001"
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt connection URI |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `txverify123` | Neo4j password |
| `OPENAI_API_KEY` | *(empty)* | OpenAI API key for LLM mode. If unset, uses deterministic rule engine. |

## How It Works

1. **Transaction arrives** → Go Gateway receives POST at `/api/v1/verify`
2. **Layer 1 (Behavioral)** → Redis features + ML anomaly score (0-100)
3. **Layer 2 (Network)** → Neo4j checks hops to known fraud nodes
4. **Escalation Logic** → If score > 60 OR network risk is HIGH, escalate
5. **Layer 3 (Reasoning)** → LLM/Rule engine decides: APPROVE / SOFT_CHALLENGE / HARD_BLOCK
6. **Layer 4 (Civic)** → Slack alert + account freeze for blocked transactions
7. **Response** → Final verdict returned to payment gateway

## Dataset

The ML Engine is trained on the [PaySim](https://www.kaggle.com/datasets/ealaxi/paysim1) synthetic financial dataset (6M+ transactions). Place the CSV as `2-ml-engine/model/PS_20174392719_1491204439457_log.csv` and run:

```bash
cd 2-ml-engine && python model/train.py
```
