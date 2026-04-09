"""
tx.verify() — Layers 3 & 4: Reasoning Engine + Civic Integration
A FastAPI service that uses an LLM (via LangChain) to make final
fraud decisions, with tool bindings for Slack alerts and account freezing.

Falls back to a deterministic rule engine if OPENAI_API_KEY is not set.

Port: 8003
"""

import os
import json
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [REASONING] %(message)s")
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
SYSTEM_PROMPT_PATH = Path(__file__).parent / "prompts" / "system_prompt.txt"


# ─── Pydantic Models ─────────────────────────────────────────────────
class Layer1Result(BaseModel):
    anomaly_score: float = 0.0
    is_new_device: bool = False
    velocity_spike: bool = False


class Layer2Result(BaseModel):
    network_risk: str = "LOW"
    hops_to_fraud: int = -1
    flagged_entity: Optional[str] = None


class TransactionInfo(BaseModel):
    tx_id: str
    user_id: str
    amount: float
    timestamp: str
    device_id: str
    ip_address: str
    location: Optional[str] = ""
    target_account: str


class EvaluatePayload(BaseModel):
    transaction: TransactionInfo
    layer_1_result: Layer1Result
    layer_2_result: Layer2Result


class EvaluateResponse(BaseModel):
    action: str
    reason: str


# ─── Civic MCP Tool Stubs ────────────────────────────────────────────
# These simulate Slack and PostgreSQL actions via Civic MCP.
# In production, replace with real HTTP calls to the Civic Control Plane.

def slack_alert(tx_id: str, user_id: str, action: str, reason: str) -> str:
    """Post a fraud alert to #fraud-alerts Slack channel."""
    alert = {
        "channel": "#fraud-alerts",
        "text": f"🚨 *FRAUD ALERT* — `{action}`",
        "blocks": {
            "tx_id": tx_id,
            "user_id": user_id,
            "action": action,
            "reason": reason,
        }
    }
    logger.info("📢 [CIVIC/SLACK] Alert posted → %s", json.dumps(alert, indent=2))
    return f"Slack alert posted for {tx_id}"


def freeze_account(user_id: str, reason: str) -> str:
    """Freeze a user's account in the database."""
    logger.info("🔒 [CIVIC/POSTGRES] Account FROZEN → user_id=%s, reason=%s", user_id, reason)
    return f"Account {user_id} frozen successfully"


# ─── Deterministic Rule Engine (Fallback) ────────────────────────────
def rule_engine_evaluate(payload: EvaluatePayload) -> EvaluateResponse:
    """
    Deterministic fallback when OpenAI is unavailable.
    Implements the decision matrix from the system prompt.
    """
    score = payload.layer_1_result.anomaly_score
    risk = payload.layer_2_result.network_risk.upper()
    hops = payload.layer_2_result.hops_to_fraud
    tx = payload.transaction

    reasons = []

    # Build reasoning from factors
    if score > 80:
        reasons.append(f"Very high anomaly score ({score:.1f}/100)")
    elif score > 60:
        reasons.append(f"Elevated anomaly score ({score:.1f}/100)")
    else:
        reasons.append(f"Normal anomaly score ({score:.1f}/100)")

    if risk == "HIGH":
        reasons.append(f"HIGH network risk (target is {hops} hop(s) from known fraud)")
    elif risk == "MEDIUM":
        reasons.append(f"MEDIUM network risk (target is {hops} hop(s) from known fraud)")

    if payload.layer_1_result.is_new_device:
        reasons.append("Transaction from unrecognized device")
    if payload.layer_1_result.velocity_spike:
        reasons.append("Velocity spike detected (amount >> 24h average)")

    # Decision matrix
    if score > 80 and risk in ("HIGH", "MEDIUM"):
        action = "HARD_BLOCK"
    elif score > 60 and risk == "HIGH":
        action = "HARD_BLOCK"
    elif score > 60 or risk == "HIGH":
        action = "SOFT_CHALLENGE"
    elif risk == "MEDIUM":
        action = "APPROVE"
    else:
        action = "APPROVE"

    reason = f"[Rule Engine] {'; '.join(reasons)}."

    # Execute civic actions
    if action == "HARD_BLOCK":
        slack_alert(tx.tx_id, tx.user_id, action, reason)
        freeze_account(tx.user_id, reason)
    elif action == "SOFT_CHALLENGE":
        slack_alert(tx.tx_id, tx.user_id, action, reason)

    return EvaluateResponse(action=action, reason=reason)


# ─── LLM-Based Evaluation (Primary) ──────────────────────────────────
def llm_evaluate(payload: EvaluatePayload) -> EvaluateResponse:
    """
    Uses LangChain + OpenAI to evaluate the transaction.
    The LLM acts as a Fraud Analyst with access to civic tools.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage
    from llm.parser import parse_llm_response

    # Load system prompt
    system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")

    # Build the human message with full context
    context = f"""
## Transaction Under Review

**Transaction ID**: {payload.transaction.tx_id}
**User ID**: {payload.transaction.user_id}
**Amount**: ${payload.transaction.amount:,.2f}
**Timestamp**: {payload.transaction.timestamp}
**Device ID**: {payload.transaction.device_id}
**IP Address**: {payload.transaction.ip_address}
**Location**: {payload.transaction.location}
**Target Account**: {payload.transaction.target_account}

## Layer 1 — ML Behavioral Analysis
- **Anomaly Score**: {payload.layer_1_result.anomaly_score}/100
- **New Device**: {payload.layer_1_result.is_new_device}
- **Velocity Spike**: {payload.layer_1_result.velocity_spike}

## Layer 2 — Graph Network Analysis
- **Network Risk**: {payload.layer_2_result.network_risk}
- **Hops to Fraud**: {payload.layer_2_result.hops_to_fraud}
- **Flagged Entity**: {payload.layer_2_result.flagged_entity or "None"}

Please evaluate this transaction and respond with your decision in the specified JSON format.
"""

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.1,
        api_key=OPENAI_API_KEY,
    )

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=context),
        ])

        decision = parse_llm_response(response.content)
        logger.info("🧠 LLM Decision: action=%s", decision.action)

        # Execute civic actions based on LLM decision
        tx = payload.transaction
        if decision.action == "HARD_BLOCK":
            slack_alert(tx.tx_id, tx.user_id, decision.action, decision.reason)
            freeze_account(tx.user_id, decision.reason)
        elif decision.action == "SOFT_CHALLENGE":
            slack_alert(tx.tx_id, tx.user_id, decision.action, decision.reason)

        return EvaluateResponse(action=decision.action, reason=decision.reason)

    except Exception as e:
        logger.error("LLM call failed: %s. Falling back to rule engine.", e)
        return rule_engine_evaluate(payload)


# ─── FastAPI App ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    if OPENAI_API_KEY:
        logger.info("✅ OpenAI API key detected. Running in LLM mode (gpt-4o-mini).")
    else:
        logger.info("⚠️ No OPENAI_API_KEY set. Running in DETERMINISTIC rule engine mode.")
    yield

app = FastAPI(title="tx.verify — Reasoning Engine (Layers 3 & 4)", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "service": "reasoning-engine",
        "status": "ok",
        "mode": "llm" if OPENAI_API_KEY else "rule_engine",
    }


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(payload: EvaluatePayload):
    """
    Called by the Go Gateway when a transaction is flagged.
    Routes to LLM or rule engine depending on API key availability.
    """
    logger.info(
        "⚡ Evaluating TxID=%s | Score=%.1f | Risk=%s",
        payload.transaction.tx_id,
        payload.layer_1_result.anomaly_score,
        payload.layer_2_result.network_risk,
    )

    if OPENAI_API_KEY:
        return llm_evaluate(payload)
    else:
        return rule_engine_evaluate(payload)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
