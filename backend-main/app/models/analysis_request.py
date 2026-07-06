from app.extensions import db


class AnalysisRequest(db.Model):
    __tablename__ = "analysis_requests"
    __table_args__ = (
        db.CheckConstraint(
            "analysis_type in ('single_review', 'multi_review', 'place_only', 'full')",
            name="analysis_requests_type_check",
        ),
        db.CheckConstraint(
            "request_status in ('pending', 'analyzing', 'success', 'failed', 'canceled')",
            name="analysis_requests_status_check",
        ),
        db.CheckConstraint(
            "input_language in ('ko', 'en', 'unknown')",
            name="analysis_requests_input_language_check",
        ),
        db.CheckConstraint(
            "output_language in ('ko', 'en')",
            name="analysis_requests_output_language_check",
        ),
        db.CheckConstraint("review_count >= 0", name="analysis_requests_review_count_check"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    hospital_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.hospitals.id", ondelete="CASCADE"),
        nullable=False,
    )
    analysis_type = db.Column(
        db.String(30),
        nullable=False,
        default="single_review",
        server_default="single_review",
    )
    request_status = db.Column(
        db.String(30),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    input_language = db.Column(db.String(20), nullable=False, default="ko", server_default="ko")
    output_language = db.Column(db.String(20), nullable=False, default="ko", server_default="ko")
    review_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    request_options_json = db.Column(db.JSON)
    error_message = db.Column(db.Text)
    started_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))
    deleted_at = db.Column(db.DateTime(timezone=True))
    deleted_by = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="analysis_requests", foreign_keys=[member_id])
    hospital = db.relationship("Hospital", back_populates="analysis_requests")
    reviews = db.relationship(
        "Review",
        back_populates="analysis_request",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    analysis_result = db.relationship(
        "AnalysisResult",
        back_populates="analysis_request",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    inquiries = db.relationship("Inquiry", back_populates="related_analysis")

    def __repr__(self):
        return f"<AnalysisRequest id={self.id} status={self.request_status}>"
