"""
LLM output parser for structured fraud decisions.
Uses Pydantic for type-safe parsing of LLM responses.
"""

from typing import Literal
from pydantic import BaseModel, Field


class FraudDecision(BaseModel):
    """Structured output from the LLM fraud analyst."""
    action: Literal["HARD_BLOCK", "SOFT_CHALLENGE", "APPROVE"] = Field(
        description="The enforcement action to take on this transaction."
    )
    reason: str = Field(
        description="Clear explanation of why this action was chosen, referencing specific risk factors."
    )


def parse_llm_response(raw_text: str) -> FraudDecision:
    """
    Parse raw LLM text output into a structured FraudDecision.
    Handles cases where the LLM wraps JSON in markdown code blocks.
    """
    import json

    # Strip markdown code fences if present
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        data = json.loads(text)
        return FraudDecision(**data)
    except (json.JSONDecodeError, ValueError):
        # If LLM output isn't valid JSON, try to extract action from text
        text_upper = raw_text.upper()
        if "HARD_BLOCK" in text_upper:
            action = "HARD_BLOCK"
        elif "SOFT_CHALLENGE" in text_upper:
            action = "SOFT_CHALLENGE"
        else:
            action = "APPROVE"

        return FraudDecision(
            action=action,
            reason=f"[Parsed from unstructured LLM output] {raw_text[:300]}"
        )
