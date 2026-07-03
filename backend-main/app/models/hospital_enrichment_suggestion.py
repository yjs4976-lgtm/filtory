from app.extensions import db


class HospitalEnrichmentSuggestion(db.Model):
    __tablename__ = "hospital_enrichment_suggestions"
    __table_args__ = (
        db.CheckConstraint(
            "status in ('pending', 'approved', 'rejected', 'applied')",
            name="hospital_enrichment_suggestions_status_check",
        ),
        db.CheckConstraint(
            "source_type in ('user_input', 'admin', 'provider', 'ocr', 'analysis')",
            name="hospital_enrichment_suggestions_source_type_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    hospital_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.hospitals.id", ondelete="CASCADE"),
        nullable=False,
    )
    analysis_request_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.analysis_requests.id", ondelete="SET NULL"),
    )
    source_member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    source_type = db.Column(db.String(30), nullable=False, default="user_input", server_default="user_input")
    status = db.Column(db.String(20), nullable=False, default="pending", server_default="pending")
    suggested_english_name = db.Column(db.String(255))
    suggested_homepage_url = db.Column(db.Text)
    suggested_has_english_info = db.Column(db.Boolean)
    suggested_has_english_reviews = db.Column(db.Boolean)
    suggested_has_photos = db.Column(db.Boolean)
    reviewer_member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    reviewed_at = db.Column(db.DateTime(timezone=True))
    reject_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    def __repr__(self):
        return f"<HospitalEnrichmentSuggestion id={self.id} status={self.status}>"
