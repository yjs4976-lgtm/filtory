import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

POLICY_PATH = Path(__file__).resolve().parents[2] / "shared" / "filtory_policy.json"
with POLICY_PATH.open(encoding="utf-8") as policy_file:
    FILTORY_POLICY = json.load(policy_file)


def next_free_usage_reset(now=None):
    seoul_now = (now or datetime.now(tz=ZoneInfo("Asia/Seoul"))).astimezone(ZoneInfo("Asia/Seoul"))
    year, month = seoul_now.year, seoul_now.month
    if month == 12:
        year, month = year + 1, 1
    else:
        month += 1
    return datetime(year, month, 1, tzinfo=ZoneInfo("Asia/Seoul"))


def format_korean_date(value):
    return f"{value.year}년 {value.month}월 {value.day}일"
