DEFAULT_PAGE = 1
DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


def get_pagination_params(args):
    page = _to_positive_int(args.get("page"), DEFAULT_PAGE)
    per_page = _to_positive_int(args.get("per_page"), DEFAULT_PER_PAGE)
    per_page = min(per_page, MAX_PER_PAGE)

    return {
        "page": page,
        "per_page": per_page,
        "limit": per_page,
        "offset": (page - 1) * per_page,
    }


def build_pagination_meta(page, per_page, count=None):
    meta = {
        "page": page,
        "per_page": per_page,
    }

    if count is not None:
        meta["count"] = count

    return meta


def _to_positive_int(value, default):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default

    return number if number > 0 else default
