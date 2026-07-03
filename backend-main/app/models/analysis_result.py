from app.extensions import db


class AnalysisResult(db.Model):
    __tablename__ = "analysis_results"
    __table_args__ = (
        db.CheckConstraint(
            "total_score is null or (total_score >= 0 and total_score <= 100)",
            name="analysis_total_score_check",
        ),
        db.CheckConstraint(
            "trust_score is null or (trust_score >= 0 and trust_score <= 100)",
            name="analysis_trust_score_check",
        ),
        db.CheckConstraint(
            "ad_score is null or (ad_score >= 0 and ad_score <= 100)",
            name="analysis_ad_score_check",
        ),
        db.CheckConstraint(
            "place_score is null or (place_score >= 0 and place_score <= 100)",
            name="analysis_place_score_check",
        ),
        db.CheckConstraint(
            "foreigner_score is null or (foreigner_score >= 0 and foreigner_score <= 100)",
            name="analysis_foreigner_score_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    hospital_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.hospitals.id", ondelete="CASCADE"),
        nullable=False,
    )
    review_id = db.Column(db.BigInteger, db.ForeignKey("public.reviews.id", ondelete="CASCADE"))
    request_id = db.Column(db.BigInteger, db.ForeignKey("public.analysis_requests.id", ondelete="CASCADE"))
    total_score = db.Column(db.Integer)
    trust_score = db.Column(db.Integer)
    ad_score = db.Column(db.Integer)
    place_score = db.Column(db.Integer)
    foreigner_score = db.Column(db.Integer)
    trust_level = db.Column(db.String(30))
    ad_suspicion = db.Column(db.String(30))
    repetition_suspicion = db.Column(db.String(30))
    summary_ko = db.Column(db.Text)
    summary_en = db.Column(db.Text)
    evidence_json = db.Column(db.JSON)
    ai_model = db.Column(db.String(100))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="analysis_results")
    hospital = db.relationship("Hospital", back_populates="analysis_results")
    review = db.relationship("Review", back_populates="analysis_results")
    analysis_request = db.relationship("AnalysisRequest", back_populates="analysis_result")
    reports = db.relationship(
        "ReviewReport",
        back_populates="analysis_result",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    admin_moderation_cases = db.relationship(
        "AdminReviewModerationCase",
        back_populates="analysis_result",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<AnalysisResult id={self.id} total_score={self.total_score}>"
