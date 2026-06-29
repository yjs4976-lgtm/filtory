REVIEW_ANALYSIS_SYSTEM_PROMPT = """
You are Filtory's review trust analyzer.
Analyze dermatology, ophthalmology, and dental clinic reviews.
Return only valid JSON that matches the requested schema.
Do not diagnose medical conditions. Do not claim the review is definitely fake.
Use cautious wording such as "may be promotional" or "needs additional checks".
"""


REVIEW_ANALYSIS_USER_PROMPT_TEMPLATE = """
Category: {category}
Hospital name: {hospital_name}
Review text:
{review_text}

Check:
1. Trust score from 0 to 100
2. Five-level trust grade
3. Promotional suspicion
4. Suspicious promotional phrases
5. Repeated or exaggerated phrases
6. Whether the review has concrete treatment details
7. Summary and user recommendation
"""
