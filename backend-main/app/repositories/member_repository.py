from app.extensions import db
from sqlalchemy import func, or_
from app.models import EmailVerificationToken, Member, MemberTermsAgreement, PasswordResetToken, SocialAccount


class MemberRepository:
    # Repository는 SQLAlchemy query를 한 곳에 모아 Service가 ORM 세부 문법을 덜 알게 해준다.
    @staticmethod
    def get_by_id(member_id):
        # db.session.get()은 primary key 조회 전용 API라 단건 조회에 가장 단순하다.
        return db.session.get(Member, member_id)

    @staticmethod
    def get_by_email(email):
        normalized_email = str(email or "").strip().lower()
        if not normalized_email:
            return None

        # func.lower/trim은 DB 함수 호출 표현식이다. 이메일 비교를 대소문자/공백에 덜 민감하게 만든다.
        return Member.query.filter(
            func.lower(func.trim(Member.email)) == normalized_email
        ).first()

    @staticmethod
    def get_by_login_id(login_id):
        normalized_login_id = str(login_id or "").strip().lower()
        return Member.query.filter(
            func.lower(func.trim(Member.login_id)) == normalized_login_id
        ).first()

    @staticmethod
    def get_by_login_identifier(identifier):
        members = MemberRepository.list_by_login_identifier(identifier)
        return members[0] if members else None

    @staticmethod
    def list_by_login_identifier(identifier, for_update=False):
        normalized_identifier = str(identifier or "").strip().lower()
        if not normalized_identifier:
            return []

        # or_는 SQL의 OR 조건을 Python 코드에서 조합하는 SQLAlchemy helper다.
        query = Member.query.filter(
            or_(
                func.lower(func.trim(Member.email)) == normalized_identifier,
                func.lower(func.trim(Member.login_id)) == normalized_identifier,
            )
        ).order_by(Member.id.asc())

        if for_update:
            query = query.with_for_update()

        return query.all()

    @staticmethod
    def list_by_login_identifier_for_update(identifier):
        return MemberRepository.list_by_login_identifier(identifier, for_update=True)

    @staticmethod
    def get_by_nickname(nickname):
        return (
            Member.query.filter(func.lower(func.trim(Member.nickname)) == nickname)
            .order_by(Member.id.asc())
            .first()
        )

    @staticmethod
    def get_active_by_name_and_phone(real_name, phone):
        return (
            Member.query
            .filter(
                Member.real_name == real_name,
                Member.phone == phone,
                Member.active.is_(True),
                Member.deleted_at.is_(None),
            )
            .order_by(Member.created_at.desc())
            .first()
        )

    @staticmethod
    def list_active(limit=20, offset=0):
        return (
            Member.query
            .filter(Member.active.is_(True), Member.deleted_at.is_(None))
            .order_by(Member.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def create(data):
        member = Member(**data)
        db.session.add(member)
        return member

    @staticmethod
    def update(member, data):
        for key, value in data.items():
            setattr(member, key, value)
        return member

    @staticmethod
    def create_social_account(data):
        social_account = SocialAccount(**data)
        db.session.add(social_account)
        return social_account

    @staticmethod
    def delete_social_accounts_by_member_id(member_id):
        if not member_id:
            return 0

        # bulk delete는 개별 객체를 로딩하지 않고 SQL DELETE를 실행한다.
        # synchronize_session=False는 세션에 로드된 객체 동기화를 생략해 단순 삭제를 빠르게 처리한다.
        return (
            SocialAccount.query
            .filter(SocialAccount.member_id == member_id)
            .delete(synchronize_session=False)
        )

    @staticmethod
    def create_terms_agreement(data):
        agreement = MemberTermsAgreement(**data)
        db.session.add(agreement)
        return agreement

    @staticmethod
    def get_social_account(provider, social_id):
        return (
            SocialAccount.query
            .filter(
                SocialAccount.provider == provider,
                SocialAccount.social_id == social_id,
            )
            .first()
        )

    @staticmethod
    def create_password_reset_token(data):
        token = PasswordResetToken(**data)
        db.session.add(token)
        return token

    @staticmethod
    def create_email_verification_token(data):
        token = EmailVerificationToken(**data)
        db.session.add(token)
        return token

    @staticmethod
    def get_password_reset_token(token_hash):
        return PasswordResetToken.query.filter(PasswordResetToken.token_hash == token_hash).first()

    @staticmethod
    def get_email_verification_token(token_hash):
        return EmailVerificationToken.query.filter(EmailVerificationToken.token_hash == token_hash).first()

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
