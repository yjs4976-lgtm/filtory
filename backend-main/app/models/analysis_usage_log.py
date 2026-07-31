from app.extensions import db


class AnalysisUsageLog(db.Model):
    __tablename__ = "analysis_usage_logs"
    __table_args__ = (
        db.UniqueConstraint(
            "member_id",
            "analysis_result_id",
            name="analysis_usage_logs_unique_member_analysis",
        ),
        db.CheckConstraint(
            "usage_type in ('FREE_BASE', 'PLUS', 'REWARDED', 'ADMIN_GRANTED')",
            name="analysis_usage_logs_usage_type_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    analysis_result_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.analysis_results.id", ondelete="CASCADE"),
        nullable=False,
    )
    usage_type = db.Column(db.String(30), nullable=False)
    period_key = db.Column(db.String(7), nullable=False, index=True)
    charged_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member")
    analysis_result = db.relationship("AnalysisResult")
