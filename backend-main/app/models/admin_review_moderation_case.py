from app.extensions import db


class AdminReviewModerationCase(db.Model):
    __tablename__ = "admin_review_moderation_cases"
    __table_args__ = (
        db.CheckConstraint(
            """case_type in (
              'ad_suspicion',
              'repetition_pattern',
              'inappropriate_content',
              'user_report',
              'wrong_hospital_info',
              'manual_review',
              'other'
            )""",
            name="admin_review_moderation_cases_type_check",
        ),
        db.CheckConstraint(
            """status in (
              'pending',
              'reviewing',
              'resolved',
              'rejected',
              'ignored',
              'hidden'
            )""",
            name="admin_review_moderation_cases_status_check",
        ),
        db.CheckConstraint(
            "priority in ('low', 'normal', 'high', 'urgent')",
            name="admin_review_moderation_cases_priority_check",
        ),
        db.CheckConstraint(
            """
              review_id is not null
              or analysis_result_id is not null
              or review_report_id is not null
            """,
            name="admin_review_moderation_cases_has_target_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    hospital_id = db.Column(db.BigInteger, db.ForeignKey("public.hospitals.id", ondelete="CASCADE"))
    review_id = db.Column(db.BigInteger, db.ForeignKey("public.reviews.id", ondelete="CASCADE"))
    analysis_result_id = db.Column(db.BigInteger, db.ForeignKey("public.analysis_results.id", ondelete="CASCADE"))
    review_report_id = db.Column(db.BigInteger, db.ForeignKey("public.review_reports.id", ondelete="SET NULL"))
    case_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="pending", server_default="pending")
    priority = db.Column(db.String(20), nullable=False, default="normal", server_default="normal")
    reason = db.Column(db.Text)
    score_snapshot = db.Column(db.JSON, nullable=False, default=dict, server_default=db.text("'{}'"))
    assigned_admin_member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    resolved_admin_member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    admin_memo = db.Column(db.Text)
    resolved_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    hospital = db.relationship("Hospital", back_populates="admin_review_cases")
    review = db.relationship("Review", back_populates="admin_moderation_cases")
    analysis_result = db.relationship("AnalysisResult", back_populates="admin_moderation_cases")
    review_report = db.relationship("ReviewReport", back_populates="admin_moderation_cases")
    assigned_admin_member = db.relationship("Member", foreign_keys=[assigned_admin_member_id])
    resolved_admin_member = db.relationship("Member", foreign_keys=[resolved_admin_member_id])

    def __repr__(self):
        return f"<AdminReviewModerationCase id={self.id} status={self.status}>"
