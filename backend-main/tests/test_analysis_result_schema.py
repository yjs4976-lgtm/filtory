from types import SimpleNamespace

from app.schemas.analysis_schema import analysis_result_to_canonical_dict


def _analysis_result(raw_response):
    return SimpleNamespace(
        total_score=71,
        trust_score=71,
        ad_score=22,
        place_score=63,
        foreigner_score=40,
        trust_level="safe",
        ad_suspicion="low",
        summary_ko="요약",
        summary_en=None,
        evidence_json={"rawResponse": raw_response},
        ai_model="test-model",
    )


def test_canonical_result_promotes_nested_score_breakdown_values():
    canonical = analysis_result_to_canonical_dict(
        _analysis_result(
            {
                "scoreBreakdown": {
                    "evidenceScore": 68,
                    "risk_score": 24,
                    "specificityScore": 73,
                    "diversity_score": 81,
                }
            }
        )
    )

    assert canonical["evidenceScore"] == 68
    assert canonical["riskScore"] == 24
    assert canonical["specificityScore"] == 73
    assert canonical["diversityScore"] == 81
    assert canonical["scoreBreakdown"]["risk_score"] == 24


def test_top_level_score_keeps_priority_over_nested_breakdown():
    canonical = analysis_result_to_canonical_dict(
        _analysis_result(
            {
                "evidenceScore": 77,
                "scoreBreakdown": {"evidenceScore": 68},
            }
        )
    )

    assert canonical["evidenceScore"] == 77
