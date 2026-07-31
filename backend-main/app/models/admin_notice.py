from app.extensions import db


class AdminNotice(db.Model):
    __tablename__ = "admin_notices"
    __table_args__ = (
        db.CheckConstraint("status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')", name="admin_notices_status_check"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="DRAFT", server_default="DRAFT")
    pinned = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    published_at = db.Column(db.DateTime(timezone=True))
    created_by = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    updated_by = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))


