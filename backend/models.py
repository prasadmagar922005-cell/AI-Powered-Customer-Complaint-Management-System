"""
The one database table this project needs: `complaints`.
Every column here matches a field in the frontend form (see complaintSlice.js)
so that the data flowing through the whole app stays consistent.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)

    # Section 1 - Origin & Customer Details
    complaint_source = Column(String(255))
    customer_name = Column(String(255))

    # Section 2 - Product & Batch Identification
    product_name = Column(String(255))
    product_strength = Column(String(100))
    batch_number = Column(String(100))
    affected_quantity = Column(String(100))
    manufacturing_date = Column(String(100))
    expiry_date = Column(String(100))

    # Section 3 - Facility & Material Impact
    originating_site_block = Column(String(255))
    impacted_npm = Column(String(255))

    # Section 4 - Defect Analysis
    complaint_category = Column(String(255))
    complaint_description = Column(Text)

    # AI Copilot Risk Assessment
    severity_suggested = Column(String(50))
    suggested_next_action = Column(Text)
    initial_risk_assessment = Column(Text)

    # Meta
    status = Column(String(50), default="Committed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
