from app.schemas.review_analysis_schema import ReviewAnalyzeRequest, ReviewAnalyzeResponse


class MockReviewAnalysisService:
    MODEL_VERSION = "mock-review-analyzer-v1"

    @classmethod
    def analyze(cls, payload: ReviewAnalyzeRequest) -> ReviewAnalyzeResponse:
        return ReviewAnalyzeResponse(
            trustScore=78,
            grade="B",
            trustGrade="양호",
            trustLevelKey="high",
            adSuspicion="보통",
            adSuspicionLevel="medium",
            repetitionLevel="low",
            informationCompleteness="medium",
            informationLevel="보통",
            positiveSignals=[
                "진료 과정에 대한 구체적인 언급이 있습니다.",
                "직원 친절도와 시설 청결에 대한 내용이 포함되어 있습니다.",
            ],
            warningSignals=[
                "일부 표현이 과하게 긍정적으로 반복됩니다.",
                "광고성 리뷰에서 자주 보이는 문장이 일부 포함되어 있습니다.",
            ],
            globalAccessibilityScore=3,
            globalAccessibilityMaxScore=5,
            globalAccessibilityChecks={
                "googleMapLink": True,
                "englishName": True,
                "englishGuide": False,
                "homepageOrBookingLink": True,
                "photoInfo": False,
            },
            detectedPatterns=[
                "일부 표현이 과하게 긍정적으로 반복됩니다.",
                "광고성 리뷰에서 자주 보이는 문장이 일부 포함되어 있습니다.",
            ],
            suspiciousPhrases=[
                "과하게 긍정적인 표현",
                "광고성 리뷰에서 자주 보이는 문장",
            ],
            repetitivePhrases=[],
            summary="리뷰 전반은 자연스럽지만 일부 광고성 표현이 포함되어 있습니다.",
            recommendation="참고는 가능하지만, 여러 리뷰와 병원 정보를 함께 확인하는 것이 좋습니다.",
            modelVersion=cls.MODEL_VERSION,
        )
