def _isoformat(value):
    return value.isoformat() if value else None


def inquiry_to_dict(inquiry, include_member=False):
    if inquiry is None:
        return None

    answer = _latest_answer(inquiry)

    data = {
        "id": inquiry.id,
        "category": inquiry.category,
        "subCategory": inquiry.sub_category,
        "title": inquiry.title,
        "content": inquiry.content,
        "status": inquiry.status,
        "relatedAnalysisId": inquiry.related_analysis_id,
        "attachmentUrl": None,
        "createdAt": _isoformat(inquiry.created_at),
        "updatedAt": _isoformat(inquiry.updated_at),
        "answer": inquiry_answer_to_dict(answer),
        "relatedAnalysis": related_analysis_to_dict(inquiry.related_analysis),
    }

    if include_member:
        data["member"] = member_summary_to_dict(inquiry.member)

    return data


def inquiry_answer_to_dict(answer):
    if answer is None:
        return None

    return {
        "id": answer.id,
        "inquiryId": answer.inquiry_id,
        "adminId": answer.admin_id,
        "content": answer.content,
        "createdAt": _isoformat(answer.created_at),
        "updatedAt": _isoformat(answer.updated_at),
    }


def member_summary_to_dict(member):
    if member is None:
        return None

    return {
        "id": member.id,
        "email": member.email,
        "nickname": member.nickname,
        "name": member.real_name,
    }


def related_analysis_to_dict(analysis_request):
    if analysis_request is None:
        return None

    hospital = analysis_request.hospital
    result = analysis_request.analysis_result

    return {
        "id": analysis_request.id,
        "hospitalName": hospital.hospital_name if hospital else None,
        "category": hospital.category if hospital else None,
        "createdAt": _isoformat(analysis_request.created_at),
        "completedAt": _isoformat(analysis_request.completed_at),
        "totalScore": result.total_score if result else None,
        "trustScore": result.trust_score if result else None,
        "adScore": result.ad_score if result else None,
        "foreignerScore": result.foreigner_score if result else None,
    }


def _latest_answer(inquiry):
    answers = list(inquiry.answers or [])
    if not answers:
        return None

    return sorted(
        answers,
        key=lambda answer: (answer.created_at is not None, answer.created_at, answer.id),
        reverse=True,
    )[0]
