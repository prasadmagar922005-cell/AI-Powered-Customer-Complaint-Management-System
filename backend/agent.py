
import os
import json
from typing import TypedDict, Optional
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq

load_dotenv()


llm = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,  # 0 = as deterministic/consistent as possible, good for data extraction
)

FIELD_NAMES = [
    "complaint_source", "customer_name",
    "product_name", "product_strength", "batch_number", "affected_quantity",
    "manufacturing_date", "expiry_date",
    "originating_site_block", "impacted_npm",
    "complaint_category", "complaint_description",
]


def clean_json(raw_text: str) -> dict:
    """
    LLMs sometimes wrap JSON in ```json fences or add a stray sentence.
    This strips common wrappers before parsing. Raises if it still can't parse,
    so the caller can decide to retry.
    """
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def call_llm_for_json(prompt: str, retries: int = 2) -> dict:
    """Calls the LLM and guarantees we either get a dict back or raise a clear error."""
    last_error = None
    for attempt in range(retries + 1):
        response = llm.invoke(prompt)
        try:
            return clean_json(response.content)
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            prompt = (
                f"{prompt}\n\nYour previous reply was not valid JSON. "
                f"Reply with ONLY a valid JSON object, no markdown, no explanation."
            )
    raise ValueError(f"LLM did not return valid JSON after {retries + 1} attempts: {last_error}")


class ComplaintState(TypedDict):
    raw_text: str
    extracted: Optional[dict]
    risk: Optional[dict]


def extract_fields(state: ComplaintState) -> dict:
    prompt = f"""You are a data-extraction assistant for a pharmaceutical Quality Management System.

Extract the following fields from the complaint text below. Return STRICT JSON only —
no markdown fences, no commentary — with exactly these keys:
{json.dumps(FIELD_NAMES)}

Rules:
- If a field isn't mentioned, use null (do not guess).
- Dates: keep the format the customer used (e.g. "March 2026").
- complaint_category: a short 2-4 word category (e.g. "Product Defect - Discoloration",
  "Foreign Matter Contamination", "Packaging Damage").
- complaint_description: a clean 1-2 sentence professional summary of the issue,
  written the way a QA analyst would write it in a formal record.

Complaint text:
\"\"\"
{state['raw_text']}
\"\"\"
"""
    extracted = call_llm_for_json(prompt)
    return {"extracted": extracted}


def assess_risk(state: ComplaintState) -> dict:
    prompt = f"""You are a QA risk-assessment assistant for a pharmaceutical manufacturer
(API and FDF - Active Pharmaceutical Ingredient and Finished Dosage Form).

Given this extracted complaint data, return STRICT JSON only with exactly these keys:
- "severity_suggested": one of "Minor", "Major", "Critical"
- "suggested_next_action": a short action phrase (e.g. "Route to QA Investigation & Issue Replacement")
- "initial_risk_assessment": 1-2 sentences explaining the likely cause and impact

Complaint data:
{json.dumps(state['extracted'])}
"""
    risk = call_llm_for_json(prompt)
    return {"risk": risk}


# Build the graph: two nodes, run in sequence.
_graph = StateGraph(ComplaintState)
_graph.add_node("extract_fields", extract_fields)
_graph.add_node("assess_risk", assess_risk)
_graph.set_entry_point("extract_fields")
_graph.add_edge("extract_fields", "assess_risk")
_graph.add_edge("assess_risk", END)
complaint_graph = _graph.compile()


def process_complaint(raw_text: str) -> dict:
    """Runs the full graph and returns one merged dict: fields + risk assessment."""
    result = complaint_graph.invoke({"raw_text": raw_text})
    return {**result["extracted"], **result["risk"]}


def correct_field(message: str, current_form: dict) -> dict:
    """
    Used for chat-based corrections, e.g. user types:
    "actually the batch number is BMX240602 and quantity is 48 capsules"

    Returns ONLY the fields that should change.
    """
    prompt = f"""The user is correcting a pharmaceutical complaint form via chat.

Current form data (JSON):
{json.dumps(current_form)}

User's correction message:
"{message}"

Return STRICT JSON containing ONLY the fields (from this list: {json.dumps(FIELD_NAMES)})
that should change, with their new values. Do not include unchanged fields.
"""
    return call_llm_for_json(prompt)
