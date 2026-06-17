from app.extensions import db


class ReviewReport(db.Model):
    __tablename__ = "review_reports"
    __table_args__ = (
        db.CheckConstraint(
            """report_type in (
              'spam',
              'ad_suspicion',
              'inaccurate_analysis',
              'inappropriate_content',
              'wrong_hospital_info',
              'other'
            )""",
            name="review_reports_type_check",
        ),
        db.CheckConstraint(
            "status in ('pending', 'reviewing', 'resolved', 'rejected')",
            name="review_reports_status_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    reporter_member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    hospital_id = db.Column(db.BigInteger, db.ForeignKey("public.hospitals.id", ondelete="CASCADE"))
    review_id = db.Column(db.BigInteger, db.ForeignKey("public.reviews.id", ondelete="CASCADE"))
    analysis_result_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.analysis_results.id", ondelete="CASCADE"),
    )
    report_type = db.Column(db.String(50), nullable=False)
    report_reason = db.Column(db.Text)
    status = db.Column(db.String(30), nullable=False, default="pending", server_default="pending")
    admin_member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    admin_memo = db.Column(db.Text)
    resolved_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    reporter_member = db.relationship(
        "Member",
        foreign_keys=[reporter_member_id],
        back_populates="submitted_reports",
    )
    admin_member = db.relationship(
        "Member",
        foreign_keys=[admin_member_id],
        back_populates="assigned_reports",
    )
    hospital = db.relationship("Hospital", back_populates="reports")
    review = db.relationship("Review", back_populates="reports")
    analysis_result = db.relationship("AnalysisResult", back_populates="reports")

    def __repr__(self):
        return f"<ReviewReport id={self.id} status={self.status}>"
