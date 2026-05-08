from __future__ import annotations

import logging
from collections import Counter
from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_FEEDBACK_CODE_KO: dict[str, str] = {
    "hip_sag": "엉덩이 처짐",
    "hip_high": "엉덩이 과상승",
    "depth_low": "가동범위 부족",
    "body_line_bad": "몸통 일직선 불량",
    "good": "정자세",
}

_EXERCISE_NAME_KO: dict[str, str] = {
    "pushup": "푸시업",
    "squat": "스쿼트",
    "lunge": "런지",
    "plank": "플랭크",
}


def _summarize_rep_feedbacks(rep_feedback_codes: list[str | None]) -> str:
    total = len(rep_feedback_codes)
    if total == 0:
        return "반복 데이터 없음"

    counter: Counter[str] = Counter(
        code for code in rep_feedback_codes if code and code != "good"
    )
    good_count = sum(1 for code in rep_feedback_codes if not code or code == "good")

    lines = [f"총 {total}회 수행"]
    if good_count:
        lines.append(f"- 정자세: {good_count}회")
    for code, count in counter.most_common():
        label = _FEEDBACK_CODE_KO.get(code, code)
        lines.append(f"- {label}: {count}회")
    return "\n".join(lines)


def generate_workout_feedback(
    *,
    exercise_type: str,
    total_reps: int,
    duration_seconds: int,
    rep_feedback_codes: list[str | None],
) -> str | None:
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY가 설정되지 않아 AI 피드백을 생성하지 않습니다.")
        return None

    exercise_name = _EXERCISE_NAME_KO.get(exercise_type, exercise_type)
    rep_summary = _summarize_rep_feedbacks(rep_feedback_codes)
    duration_min = duration_seconds // 60
    duration_sec = duration_seconds % 60
    duration_label = f"{duration_min}분 {duration_sec}초" if duration_min else f"{duration_sec}초"

    prompt = f"""사용자가 {exercise_name} {total_reps}회를 {duration_label} 동안 수행했습니다.

[반복별 자세 감지 결과]
{rep_summary}

위 데이터를 바탕으로 자세에 대한 구체적인 피드백을 한국어로 작성해주세요.

작성 기준:
- 어떤 자세 문제가 몇 번 반복됐는지 언급
- 해당 문제가 왜 발생하는지 원인 설명
- 다음 운동에서 어떻게 교정할 수 있는지 동작 수준의 구체적인 조언 제공
- 잘 수행된 부분이 있다면 함께 언급
- 300자 이내, 헤더나 목록 없이 자연스러운 문장으로 작성"""

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 전문 퍼스널 트레이너입니다. 운동 자세 데이터를 보고 사용자가 실제로 교정할 수 있는 구체적이고 실용적인 피드백을 제공합니다.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=400,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as exc:
        logger.error("OpenAI 피드백 생성 실패: %s", exc)
        return None
