import re


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(email):
    return bool(email and EMAIL_PATTERN.match(email))


def validate_required(payload, fields):
    missing_fields = [field for field in fields if not payload.get(field)]

    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")


def validate_email(email):
    if not is_valid_email(email):
        raise ValueError("Invalid email")


def validate_password(password):
    if not password or len(password) < 8 or len(password) > 72:
        raise ValueError("Password does not meet the security policy")
    if any(character.isspace() for character in password):
        raise ValueError("Password does not meet the security policy")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password does not meet the security policy")
    if not re.search(r"\d", password):
        raise ValueError("Password does not meet the security policy")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError("Password does not meet the security policy")


def validate_one_of(value, allowed_values, field_name):
    if value not in allowed_values:
        raise ValueError(f"Invalid {field_name}")


def validate_report_target(data):
    if not any(data.get(field) for field in ["hospital_id", "review_id", "analysis_result_id"]):
        raise ValueError("hospital_id, review_id, or analysis_result_id is required")
