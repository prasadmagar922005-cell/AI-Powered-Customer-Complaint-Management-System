
import io
import json
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pypdf import PdfReader

from database import engine, get_db, Base
from models import Complaint
from agent import process_complaint, correct_field


Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIVOA Complaint Management API")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://ai-powered-customer.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default dev server URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/process-complaint")
async def process_complaint_endpoint(
    text: str = Form(None),
    file: UploadFile = File(None),
):
   
    raw_text = text or ""

    if file is not None:
        file_bytes = await file.read()
        if file.filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file_bytes))
            raw_text = "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            
            raw_text = file_bytes.decode("utf-8", errors="ignore")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="No complaint text or file content provided.")

    try:
        result = process_complaint(raw_text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI extraction failed: {e}")

    return result


@app.post("/api/correct-field")
async def correct_field_endpoint(
    message: str = Form(...),
    current_form: str = Form(...),  # JSON string of the current form state
):
    try:
        current = json.loads(current_form)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="current_form must be valid JSON.")

    try:
        updates = correct_field(message, current)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI correction failed: {e}")

    return updates


@app.post("/api/commit-complaint")
async def commit_complaint(payload: dict, db: Session = Depends(get_db)):
    """Saves the finished complaint to the database."""
    complaint = Complaint(
        complaint_source=payload.get("complaint_source"),
        customer_name=payload.get("customer_name"),
        product_name=payload.get("product_name"),
        product_strength=payload.get("product_strength"),
        batch_number=payload.get("batch_number"),
        affected_quantity=payload.get("affected_quantity"),
        manufacturing_date=payload.get("manufacturing_date"),
        expiry_date=payload.get("expiry_date"),
        originating_site_block=payload.get("originating_site_block"),
        impacted_npm=payload.get("impacted_npm"),
        complaint_category=payload.get("complaint_category"),
        complaint_description=payload.get("complaint_description"),
        severity_suggested=payload.get("severity_suggested"),
        suggested_next_action=payload.get("suggested_next_action"),
        initial_risk_assessment=payload.get("initial_risk_assessment"),
        status="Committed",
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return {"id": complaint.id, "status": complaint.status}


@app.get("/api/complaints")
def list_complaints(db: Session = Depends(get_db)):
    """Returns all saved complaints, most recent first. Useful for a history view
    and for the Duplicate Complaint Detection bonus feature."""
    rows = db.query(Complaint).order_by(Complaint.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "product_name": r.product_name,
            "batch_number": r.batch_number,
            "complaint_category": r.complaint_category,
            "severity_suggested": r.severity_suggested,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

@app.get("/api/check-duplicate")
def check_duplicate(product_name: str, batch_number: str, db: Session = Depends(get_db)):
    """
    Bonus feature: Duplicate Complaint Detection.
    Looks for existing committed complaints with the same product name AND batch
    number.
    """
    matches = (
        db.query(Complaint)
        .filter(
            Complaint.product_name.ilike(product_name),
            Complaint.batch_number.ilike(batch_number),
        )
        .all()
    )
    return {
        "duplicate_count": len(matches),
        "matches": [
            {
                "id": m.id,
                "customer_name": m.customer_name,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in matches
        ],
    }