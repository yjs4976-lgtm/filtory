from app.extensions import db


class AdminFaq(db.Model):
    __tablename__ = "admin_faqs"
    __table_args__ = (
        db.CheckConstraint("status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')", name="admin_faqs_status_check"),
        db.CheckConstraint("sort_order >= 0", name="admin_faqs_sort_order_check"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    category = db.Column(db.String(50), nullable=False, default="GENERAL", server_default="GENERAL")
    question = db.Column(db.String(300), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="DRAFT", server_default="DRAFT")
    sort_order = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    published_at = db.Column(db.DateTime(timezone=True))
    created_by = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    updated_by = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))


