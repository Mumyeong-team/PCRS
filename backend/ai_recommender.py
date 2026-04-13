# ai_recommender.py

"""
ai_recommender.py
=================
rule-based 추천 결과를 AI API에 전달해 자연스러운 스타일 설명 텍스트를 생성하는 모듈.

지원 API:
  - OpenAI   : gpt-4o
  - Anthropic: claude-3-5-sonnet-latest

설계 원칙:
  - AI는 체형을 재분석하지 않는다.
  - classifier + recommender가 생성한 결과만 근거로 설명 문장을 생성한다.
  - 모든 에러는 파이프라인을 중단하지 않고 fallback JSON으로 처리한다.

사전 준비:
  pip install openai anthropic

환경변수 (사용할 API 하나만 설정):
  export OPENAI_API_KEY="sk-..."
  export ANTHROPIC_API_KEY="sk-ant-..."
"""

import os
import json
import re
from typing import Dict, List


# ────────────────────────────────────────────────
# 상수
# ────────────────────────────────────────────────

OPENAI_MODEL : str = "gpt-4o"
CLAUDE_MODEL : str = "claude-3-5-sonnet-latest"
MAX_TOKENS   : int = 1024
TEMPERATURE  : float = 0.5

# AI 출력에서 반드시 존재해야 하는 키 목록
REQUIRED_OUTPUT_KEYS: List[str] = [
    "summary",
    "top_explanation",
    "bottom_explanation",
    "avoid_explanation",
    "styling_tip",
]

# 체형 레이블 → 한국어 변환 테이블
BODY_TYPE_KOR: Dict[str, str] = {
    "inverted_triangle": "역삼각형",
    "triangle"         : "삼각형",
    "rectangle"        : "직사각형",
    "hourglass"        : "모래시계형",
    "round"            : "둥근형",
    "balanced"         : "균형형",
}

PROPORTION_KOR: Dict[str, str] = {
    "long_upper_body"    : "상체가 긴 비율",
    "long_legs"          : "하체(다리)가 긴 비율",
    "balanced_proportion": "상하체 균형 비율",
}

LIMB_KOR: Dict[str, str] = {
    "long_arms"     : "팔이 긴 편",
    "short_arms"    : "팔이 짧은 편",
    "balanced_limbs": "팔 길이 균형",
}

GENDER_KOR: Dict[str, str] = {
    "male"       : "남성",
    "female"     : "여성",
    "unspecified": "성별 미지정",
}


# ────────────────────────────────────────────────
# 폴백 응답 생성
# ────────────────────────────────────────────────

def _make_fallback(error_message: str) -> Dict[str, str]:
    """
    에러 발생 시 파이프라인이 중단되지 않도록 안전한 fallback 딕셔너리를 반환합니다.
    Python 3.8+ 호환 방식으로 작성합니다 (dict union 연산자 미사용).

    Args:
        error_message (str): 에러 원인 설명 문자열

    Returns:
        dict: 모든 REQUIRED_OUTPUT_KEYS가 빈 문자열로 채워진 딕셔너리.
              "summary" 에는 안내 문구, "error" 키에 에러 원인이 포함됩니다.
    """
    result = {key: "" for key in REQUIRED_OUTPUT_KEYS}
    result["summary"] = "스타일 설명을 생성하지 못했습니다."
    result["error"]   = error_message
    return result


# ────────────────────────────────────────────────
# 프롬프트 생성
# ────────────────────────────────────────────────

def build_system_prompt() -> str:
    """
    AI에게 역할·출력 형식·제약을 지시하는 시스템 프롬프트를 반환합니다.

    핵심 지시:
      1. 체형을 직접 재분석하거나 새로운 판단을 내리지 말 것.
      2. 제공된 분류 결과와 추천 목록만을 근거로 설명할 것.
      3. 출력은 반드시 순수 JSON만 반환할 것 (마크다운 코드블록 금지).

    Returns:
        str: 시스템 프롬프트 문자열
    """
    return (
        "당신은 패션 스타일링 전문가입니다.\n"
        "다음 규칙을 반드시 지켜주세요:\n\n"
        "1. 체형 분석은 이미 완료되었습니다. "
        "체형을 다시 분석하거나 새로운 판단을 내려서는 안 됩니다.\n"
        "2. 제공된 체형 분류 결과(body_type, proportion, limb_type)와 "
        "추천 결과(top, bottom, avoid, fit, extra_tip)만을 근거로 설명을 작성하세요.\n"
        "3. 출력은 반드시 아래 JSON 형식만 사용하세요. "
        "마크다운 코드블록(```), 추가 설명, 전후 텍스트는 절대 포함하지 마세요.\n\n"
        "출력 JSON 형식:\n"
        "{\n"
        '  "summary": "전체 체형과 스타일 방향을 2~3문장으로 요약",\n'
        '  "top_explanation": "추천 상의 아이템을 자연스러운 문장으로 설명",\n'
        '  "bottom_explanation": "추천 하의 아이템을 자연스러운 문장으로 설명",\n'
        '  "avoid_explanation": "피해야 할 아이템과 이유를 자연스럽게 설명",\n'
        '  "styling_tip": "전체 스타일링 팁을 1~2문장으로 정리"\n'
        "}\n\n"
        "언어: 반드시 한국어로 작성하세요.\n"
        "길이: 각 필드는 1~3문장, 실제 서비스에 적합한 자연스러운 문체로 작성하세요."
    )


def build_user_prompt(classification: dict, recommendation: dict) -> str:
    """
    분류 결과와 추천 결과를 AI에게 전달하는 유저 메시지를 생성합니다.

    영문 레이블을 한국어로 변환해 전달합니다.
    영문 코드를 그대로 넘기면 AI가 내부 지식으로 재해석할 위험이 있습니다.

    Args:
        classification (dict): classify_all() 반환값
        recommendation (dict): recommend_style() 반환값

    Returns:
        str: 유저 프롬프트 문자열
    """
    gender_kor     = GENDER_KOR.get(classification.get("gender", ""),     "성별 미지정")
    body_type_kor  = BODY_TYPE_KOR.get(classification.get("body_type",  ""),
                                       classification.get("body_type",  ""))
    proportion_kor = PROPORTION_KOR.get(classification.get("proportion", ""),
                                        classification.get("proportion", ""))
    limb_kor       = LIMB_KOR.get(classification.get("limb_type", ""),
                                  classification.get("limb_type", ""))

    top_items    = ", ".join(recommendation.get("top",    []))
    bottom_items = ", ".join(recommendation.get("bottom", []))
    avoid_items  = ", ".join(recommendation.get("avoid",  []))
    fit_desc     = recommendation.get("fit",       "")
    extra_tip    = recommendation.get("extra_tip", "")

    return (
        "[체형 분류 결과]\n"
        f"- 성별: {gender_kor}\n"
        f"- 체형: {body_type_kor}\n"
        f"- 상하체 비율: {proportion_kor}\n"
        f"- 팔 길이 유형: {limb_kor}\n\n"
        "[rule-based 스타일 추천 결과]\n"
        f"- 추천 상의: {top_items}\n"
        f"- 추천 하의: {bottom_items}\n"
        f"- 핏 방향: {fit_desc}\n"
        f"- 피해야 할 아이템: {avoid_items}\n"
        f"- 추가 팁: {extra_tip}\n\n"
        "위 정보만을 바탕으로 지정된 JSON 형식의 스타일 설명을 작성해주세요."
    )


# ────────────────────────────────────────────────
# JSON 파싱 및 검증
# ────────────────────────────────────────────────

def parse_ai_response(raw_text: str) -> dict:
    """
    AI 응답 텍스트에서 JSON 객체를 안전하게 추출·파싱합니다.

    파싱 시도 순서:
      1. 텍스트 그대로 json.loads() 시도
      2. ```json ... ``` 마크다운 블록 추출 후 재시도
      3. 첫 번째 { ... } 블록을 정규식으로 추출 후 재시도
      4. 모두 실패 시 ValueError 발생

    Args:
        raw_text (str): AI가 반환한 원시 응답 텍스트

    Returns:
        dict: 파싱된 JSON 딕셔너리

    Raises:
        ValueError: 세 단계 모두 파싱에 실패했을 때
    """
    text = raw_text.strip()

    # 1단계: 그대로 파싱
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2단계: 마크다운 코드블록 제거 후 파싱
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 3단계: 중괄호 블록 추출 후 파싱 (전후에 불필요한 텍스트가 있는 경우)
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"AI 응답에서 유효한 JSON을 추출할 수 없습니다. "
        f"응답 앞부분: {raw_text[:200]!r}"
    )


def validate_output_keys(parsed: dict) -> dict:
    """
    파싱된 딕셔너리에 REQUIRED_OUTPUT_KEYS가 모두 포함되어 있는지 확인합니다.
    누락된 키 또는 str이 아닌 값은 빈 문자열("")로 채워
    항상 일관된 구조를 보장합니다.

    Args:
        parsed (dict): parse_ai_response()의 반환값

    Returns:
        dict: 모든 REQUIRED_OUTPUT_KEYS가 str 타입으로 보장된 딕셔너리
    """
    for key in REQUIRED_OUTPUT_KEYS:
        if key not in parsed or not isinstance(parsed[key], str):
            parsed[key] = ""
    return parsed


# ────────────────────────────────────────────────
# API 호출 (내부 함수)
# ────────────────────────────────────────────────

def _call_openai(system_prompt: str, user_prompt: str) -> str:
    """
    OpenAI Chat Completions API를 호출하고 응답 텍스트를 반환합니다.

    모델: gpt-4o
    temperature: TEMPERATURE (0.5)

    Args:
        system_prompt (str): 시스템 메시지
        user_prompt   (str): 유저 메시지

    Returns:
        str: AI 응답 원문 텍스트

    Raises:
        ImportError     : openai 패키지 미설치
        EnvironmentError: OPENAI_API_KEY 환경변수 누락
        Exception       : API 호출 실패 (네트워크 오류, 한도 초과 등)
    """
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError(
            "openai 패키지가 필요합니다. 설치: pip install openai"
        )

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY 환경변수가 설정되지 않았습니다. "
            "export OPENAI_API_KEY='sk-...' 로 설정해주세요."
        )

    client   = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=TEMPERATURE,
        max_tokens=MAX_TOKENS,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
    )
    return response.choices[0].message.content


def _call_claude(system_prompt: str, user_prompt: str) -> str:
    """
    Anthropic Claude Messages API를 호출하고 응답 텍스트를 반환합니다.

    모델: claude-3-5-sonnet-latest
    temperature: TEMPERATURE (0.5)

    Args:
        system_prompt (str): 시스템 메시지
        user_prompt   (str): 유저 메시지

    Returns:
        str: AI 응답 원문 텍스트

    Raises:
        ImportError     : anthropic 패키지 미설치
        EnvironmentError: ANTHROPIC_API_KEY 환경변수 누락
        ValueError      : API가 빈 응답을 반환했을 때
        Exception       : API 호출 실패 (네트워크 오류, 한도 초과 등)
    """
    try:
        import anthropic
    except ImportError:
        raise ImportError(
            "anthropic 패키지가 필요합니다. 설치: pip install anthropic"
        )

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. "
            "export ANTHROPIC_API_KEY='sk-ant-...' 로 설정해주세요."
        )

    client  = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # 방어적 검사: content가 비어 있으면 명확한 에러 발생
    if not message.content:
        raise ValueError(
            "Claude API가 빈 content를 반환했습니다. "
            "API 상태 또는 요청 내용을 확인해주세요."
        )

    return message.content[0].text


# ────────────────────────────────────────────────
# 공개 인터페이스
# ────────────────────────────────────────────────

def recommend_with_ai(
    classification: dict,
    recommendation: dict,
    provider: str = "openai",
) -> dict:
    """
    rule-based 추천 결과를 AI API에 전달해 자연스러운 스타일 설명을 생성합니다.

    AI는 체형을 재분석하지 않으며, 반드시 classification과 recommendation에
    담긴 정보만을 바탕으로 설명 문장을 생성합니다.

    에러는 세 단계로 분리 처리되며, 어떤 경우에도 파이프라인을 중단하지 않습니다:
      - 설정 오류 (패키지 미설치, API 키 누락): "[설정 오류]" 접두사
      - API 호출 오류 (네트워크, 한도 초과 등): "[API 오류]" 접두사
      - 응답 파싱 오류 (JSON 추출 실패):       "[파싱 오류]" 접두사

    Args:
        classification (dict): classifier.classify_all() 반환값
            예) {
                "gender"    : "male",
                "body_type" : "inverted_triangle",
                "proportion": "balanced_proportion",
                "limb_type" : "balanced_limbs",
            }
        recommendation (dict): recommender.recommend_style() 반환값
            예) {
                "top"      : ["슬림핏 티셔츠", "V넥 니트"],
                "bottom"   : ["와이드 팬츠"],
                "fit"      : "하체에 볼륨을 줘 균형을 맞춤",
                "avoid"    : ["어깨 강조 상의"],
                "extra_tip": "하체 중심 스타일링 추천",
            }
        provider (str): 사용할 AI API. "openai" 또는 "claude". (기본값: "openai")

    Returns:
        dict: AI가 생성한 스타일 설명 딕셔너리.
            정상 응답:
            {
                "summary"           : str,
                "top_explanation"   : str,
                "bottom_explanation": str,
                "avoid_explanation" : str,
                "styling_tip"       : str,
            }
            오류 발생 시 위 키 전부 + "error" 키가 포함된 fallback 딕셔너리 반환.
    """
    # provider 유효성 검사
    if provider not in ("openai", "claude"):
        return _make_fallback(
            "[설정 오류] 지원하지 않는 provider: '{}'. "
            "'openai' 또는 'claude'를 사용하세요.".format(provider)
        )

    # 프롬프트 생성
    system_prompt = build_system_prompt()
    user_prompt   = build_user_prompt(classification, recommendation)

    # ── 1단계: API 호출 ──────────────────────────
    try:
        if provider == "openai":
            raw_text = _call_openai(system_prompt, user_prompt)
        else:
            raw_text = _call_claude(system_prompt, user_prompt)

    except (ImportError, EnvironmentError) as e:
        # 패키지 미설치 또는 API 키 누락 — 재시도해도 의미 없는 설정 오류
        return _make_fallback("[설정 오류] {}".format(e))

    except Exception as e:
        # 네트워크 오류, 타임아웃, API 한도 초과, 빈 응답 등
        return _make_fallback("[API 오류] {}: {}".format(type(e).__name__, e))

    # ── 2단계: JSON 파싱 ─────────────────────────
    try:
        parsed = parse_ai_response(raw_text)
    except ValueError as e:
        return _make_fallback("[파싱 오류] {}".format(e))

    # ── 3단계: 키 보완 및 반환 ───────────────────
    return validate_output_keys(parsed)


# ────────────────────────────────────────────────
# 직접 실행 시 동작 확인 (단독 테스트)
# ────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AI 스타일 설명 생성 단독 테스트")
    parser.add_argument(
        "--provider",
        type=str,
        default="openai",
        choices=["openai", "claude"],
        help="사용할 AI API (기본값: openai)",
    )
    args = parser.parse_args()

    test_classification: dict = {
        "gender"    : "male",
        "body_type" : "inverted_triangle",
        "proportion": "balanced_proportion",
        "limb_type" : "balanced_limbs",
    }
    test_recommendation: dict = {
        "top"      : ["슬림핏 기본 티셔츠", "V넥 니트", "어두운 톤 단색 상의"],
        "bottom"   : ["와이드 팬츠", "카고 팬츠", "밝은 색 하의"],
        "fit"      : "하체에 볼륨감을 주어 상하체 균형을 맞춥니다",
        "avoid"    : ["어깨 패드 재킷", "러플·프릴 상의", "밝은 색 상의"],
        "extra_tip": (
            "상체가 넓어 보이는 아이템은 피하고, 밝은 색·볼륨감 있는 하의로 "
            "시선을 아래로 분산시키세요.\n"
            "상하체 비율이 균형 잡혀 있어 다양한 기장과 핏을 자유롭게 활용할 수 있습니다."
        ),
    }

    print("[{} API 호출 중...]\n".format(args.provider.upper()))
    result = recommend_with_ai(
        classification=test_classification,
        recommendation=test_recommendation,
        provider=args.provider,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))