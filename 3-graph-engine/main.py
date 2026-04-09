"""
tx.verify() — Layer 2: Graph Engine
A FastAPI service that queries Neo4j to evaluate network risk
for incoming transactions. Checks hop-distance to known fraud nodes
and detects transaction ring patterns.

Port: 8002
"""

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from neo4j import GraphDatabase

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [GRAPH] %(message)s")
logger = logging.getLogger(__name__)

# ─── Neo4j Connection ─────────────────────────────────────────────────
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "txverify123")

driver = None

def get_driver():
    """Get or create Neo4j driver with graceful fallback."""
    global driver
    if driver is None:
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            driver.verify_connectivity()
            logger.info("✅ Connected to Neo4j at %s", NEO4J_URI)
        except Exception as e:
            logger.warning("⚠️ Neo4j unavailable (%s). Running in FALLBACK mode.", e)
            driver = None
    return driver


# ─── Cypher Queries (inline for clarity) ──────────────────────────────
QUERY_HOPS_TO_FRAUD = """
MATCH (target:Account {id: $target_account})
MATCH (fraud:Account {flagged: true})
WHERE target <> fraud
MATCH path = shortestPath((target)-[:SENT_TO*1..3]-(fraud))
RETURN length(path) AS hops, fraud.id AS flagged_entity
ORDER BY hops ASC
LIMIT 1
"""

QUERY_RING_CHECK = """
MATCH (target:Account {id: $target_account})
MATCH ring = (target)-[:SENT_TO*2..4]->(target)
RETURN length(ring) AS ring_size
LIMIT 1
"""

QUERY_ACCOUNT_FLAGGED = """
MATCH (a:Account {id: $target_account})
RETURN a.flagged AS flagged
"""


# ─── Pydantic Models ─────────────────────────────────────────────────
class TransactionPayload(BaseModel):
    tx_id: str
    user_id: str
    amount: float
    timestamp: str
    device_id: str
    ip_address: str
    location: Optional[str] = ""
    target_account: str


class NetworkCheckResponse(BaseModel):
    network_risk: str  # LOW, MEDIUM, HIGH, UNKNOWN
    hops_to_fraud: int
    flagged_entity: Optional[str] = None


class RecipientCheckResponse(BaseModel):
    account: str
    status: str  # SUSPICIOUS, CLEAN, UNKNOWN
    network_risk: str
    hops_to_fraud: int


# ─── Core Logic ───────────────────────────────────────────────────────
def evaluate_network_risk(target_account: str) -> dict:
    """
    Runs Cypher queries against Neo4j to determine network risk.
    Returns dict with network_risk, hops_to_fraud, flagged_entity.
    """
    db = get_driver()
    if db is None:
        logger.warning("Neo4j offline — returning UNKNOWN risk for %s", target_account)
        return {"network_risk": "UNKNOWN", "hops_to_fraud": -1, "flagged_entity": None}

    try:
        with db.session() as session:
            # 1. Check if the target itself is flagged
            direct = session.run(QUERY_ACCOUNT_FLAGGED, target_account=target_account)
            record = direct.single()
            if record and record["flagged"]:
                logger.info("🚨 Target %s is DIRECTLY flagged as fraud!", target_account)
                return {"network_risk": "HIGH", "hops_to_fraud": 0, "flagged_entity": target_account}

            # 2. Check shortest path to any fraud node
            result = session.run(QUERY_HOPS_TO_FRAUD, target_account=target_account)
            hop_record = result.single()

            if hop_record:
                hops = hop_record["hops"]
                flagged = hop_record["flagged_entity"]
                if hops == 1:
                    risk = "HIGH"
                elif hops == 2:
                    risk = "MEDIUM"
                else:
                    risk = "LOW"
                logger.info("🔗 %s is %d hop(s) from fraud node %s → risk=%s", target_account, hops, flagged, risk)
                return {"network_risk": risk, "hops_to_fraud": hops, "flagged_entity": flagged}

            # 3. Check for ring membership (bonus signal)
            ring_result = session.run(QUERY_RING_CHECK, target_account=target_account)
            ring_record = ring_result.single()
            if ring_record:
                logger.info("🔄 %s is part of a transaction ring (size=%d)", target_account, ring_record["ring_size"])
                return {"network_risk": "MEDIUM", "hops_to_fraud": -1, "flagged_entity": None}

            # 4. Clean — no connections to fraud
            logger.info("✅ %s has no fraud connections", target_account)
            return {"network_risk": "LOW", "hops_to_fraud": -1, "flagged_entity": None}

    except Exception as e:
        logger.error("Neo4j query failed: %s", e)
        return {"network_risk": "UNKNOWN", "hops_to_fraud": -1, "flagged_entity": None}


# ─── FastAPI App ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    get_driver()  # attempt connection at startup
    yield
    global driver
    if driver:
        driver.close()
        logger.info("Neo4j driver closed.")

app = FastAPI(title="tx.verify — Graph Engine (Layer 2)", lifespan=lifespan)


@app.get("/health")
async def health():
    db = get_driver()
    return {
        "service": "graph-engine",
        "status": "ok",
        "neo4j_connected": db is not None,
    }


@app.post("/check-network", response_model=NetworkCheckResponse)
async def check_network(payload: TransactionPayload):
    """
    Called by the Go Gateway during transaction verification.
    Evaluates the target account's proximity to known fraud nodes.
    """
    logger.info("⚡ Checking network for TxID=%s, Target=%s", payload.tx_id, payload.target_account)
    result = evaluate_network_risk(payload.target_account)
    return NetworkCheckResponse(**result)


@app.get("/check-recipient", response_model=RecipientCheckResponse)
async def check_recipient(account: str):
    """
    Pre-flight endpoint — Truecaller-style lookup.
    Called BEFORE a transaction is initiated to warn the user.
    """
    logger.info("🔍 Pre-flight check for recipient: %s", account)
    result = evaluate_network_risk(account)
    status = "SUSPICIOUS" if result["network_risk"] in ("HIGH", "MEDIUM") else "CLEAN"
    if result["network_risk"] == "UNKNOWN":
        status = "UNKNOWN"
    return RecipientCheckResponse(
        account=account,
        status=status,
        network_risk=result["network_risk"],
        hops_to_fraud=result["hops_to_fraud"],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
