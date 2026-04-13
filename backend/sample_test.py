# sample_test.py

"""
sample_test.py
==============
body_result.json을 읽어 체형을 분류하고 스타일을 추천한 뒤
AI 설명을 생성하여 최종 결과 JSON을 출력하는 실행 스크립트.

파이프라인 순서:
  1. body_result.json 로드              (classifier.load_body_data)
  2. 체형·비율·팔길이 분류              (classifier.classify_all)
  3. rule-based 스타일 추천             (recommender.recommend_style)
  4. AI 자연어 설명 생성               (ai_recommender.recommend_with_ai)
  5. 최종 JSON 조합 및 반환

실행 방법:
  # AI 포함 실행 (OpenAI, 기본값)
  python sample_test.py --gender male

  # AI 포함 실행 (Claude)
  python sample_test.py --gender female --provider claude

  # AI 없이 rule-based 결과만 출력
  python sample_test.py --gender male --no-ai

  # 데이터 경로 직접 지정
  python sample_test.py --gender male --data ./body_data/body_result.json

FastAPI 연결 예시:
  from fastapi import FastAPI, Query
  from sample_test import recommend_endpoint

  app = FastAPI()

  @app.post("/recommend")
  def api_recommend(
      gender  : str  = Query("unspecified"),
      provider: str  = Query("openai"),
      use_ai  : bool = Query(True),
  ):
      return recommend_endpoint(gender=gender, provider=provider, use_ai=use_ai)
"""

import json
import argparse
import sys
import os
from typing import Dict, List

from classifier     import load_body_data, classify_all
from recommender    import recommend_style
from ai_recommender import recommend_with_ai, REQUIRED_OUTPUT_KEYS

# body_result.json 기본 경로
DEFAULT_DATA_PATH: str = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "body_data", "body_result.json"
)

# 허용된 성별 값 목록
VALID_GENDERS: List[str] = ["male", "female", "unspecified"]

# 허용된 AI provider 목록
VALID_PROVIDERS: List[str] = ["openai", "claude"]


# ────────────────────────────────────────────────
# 입력값 정규화 함수
# ────────────────────────────────────────────────

def normalize_gender(gender: str) -> str:
    """
    성별 입력값을 정규화합니다.

    공백을 제거하고 소문자로 변환한 뒤 유효한 값인지 확인합니다.
    유효하지 않은 값이 들어오면 "unspecified"로 기본값 처리합니다.

    Args:
        gender (str): 원본 성별 입력값

    Returns:
        str: "male" | "female" | "unspecified"
    """
    normalized = gender.strip().lower()
    if normalized not in VALID_GENDERS:
        return "unspecified"
    return normalized


def normalize_provider(provider: str) -> str:
    """
    AI provider 입력값을 정규화합니다.

    공백을 제거하고 소문자로 변환한 뒤 유효한 값인지 확인합니다.
    유효하지 않은 값이 들어오면 "openai"로 기본값 처리합니다.

    Args:
        provider (str): 원본 provider 입력값

    Returns:
        str: "openai" | "claude"
    """
    normalized = provider.strip().lower()
    if normalized not in VALID_PROVIDERS:
        return "openai"
    return normalized


# ────────────────────────────────────────────────
# 출력용 데이터 정리 함수
# ────────────────────────────────────────────────

def extract_ratios(data: dict, digits: int = 4) -> Dict[str, float]:
    """
    신체 데이터에서 계산된 비율(ratio) 값만 추출합니다.

    비율은 두 측정값 사이의 관계를 나타내는 계산된 수치로,
    원시 측정값(measurements)과 구분하여 관리합니다.

    Args:
        data   (dict): load_body_data() 반환값
        digits (int) : 반올림 소수점 자리수 (기본값: 4)

    Returns:
        dict: 비율 키-값 쌍. data에 없는 키는 포함되지 않습니다.
    """
    ratio_keys = ["shoulder_waist_ratio", "upper_lower_ratio"]
    return {k: round(data[k], digits) for k in ratio_keys if k in data}


def extract_measurements(data: dict, digits: int = 4) -> Dict[str, float]:
    """
    신체 데이터에서 MediaPipe가 추출한 원시 측정값만 추출합니다.

    정규화된 좌표 기반 수치이므로 절대 거리가 아닌
    전체 프레임 대비 상대 비율로 표현됩니다.

    Args:
        data   (dict): load_body_data() 반환값
        digits (int) : 반올림 소수점 자리수 (기본값: 4)

    Returns:
        dict: 측정값 키-값 쌍. data에 없는 키는 포함되지 않습니다.
    """
    measurement_keys = [
        "shoulder_width",
        "waist_width",
        "arm_length",
        "upper_body_length",
        "lower_body_length",
        "leg_length_avg",
    ]
    return {k: round(data[k], digits) for k in measurement_keys if k in data}


def _empty_ai_explanation() -> Dict[str, str]:
    """
    AI를 사용하지 않을 때 ai_explanation 필드에 채울 빈 구조를 반환합니다.

    프론트엔드에서 null 처리 없이 바로 사용할 수 있도록
    모든 값을 None 대신 빈 문자열("")로 반환합니다.

    Returns:
        dict: REQUIRED_OUTPUT_KEYS 모두 빈 문자열("")로 채워진 딕셔너리
    """
    return {key: "" for key in REQUIRED_OUTPUT_KEYS}


# ────────────────────────────────────────────────
# 핵심 파이프라인 함수
# ────────────────────────────────────────────────

def recommend_endpoint(
    gender   : str  = "unspecified",
    data_path: str  = DEFAULT_DATA_PATH,
    use_ai   : bool = True,
    provider : str  = "openai",
) -> dict:
    """
    체형 분류 → rule-based 추천 → AI 설명 생성의 전체 파이프라인을 실행합니다.

    FastAPI 라우터 함수로 그대로 재사용할 수 있도록 독립된 함수로 설계했습니다.
    모든 에러는 내부에서 처리되어 항상 완전한 JSON 구조를 반환합니다.

    Args:
        gender    (str) : "male" | "female" | "unspecified" (기본값: "unspecified")
                          유효하지 않은 값은 자동으로 "unspecified"로 정규화됩니다.
        data_path (str) : body_result.json 파일 경로
        use_ai    (bool): True면 AI 설명 생성 포함 (기본값: True)
        provider  (str) : AI API 선택. "openai" | "claude" (기본값: "openai")
                          유효하지 않은 값은 자동으로 "openai"로 정규화됩니다.

    Returns:
        dict: 최종 결과 딕셔너리
            {
                "body_analysis": {
                    "gender"    : str,
                    "body_type" : str,
                    "proportion": str,
                    "limb_type" : str,
                },
                "ratios": {
                    "shoulder_waist_ratio": float,
                    "upper_lower_ratio"   : float,
                },
                "measurements": {
                    "shoulder_width"    : float,
                    "waist_width"       : float,
                    "arm_length"        : float,
                    "upper_body_length" : float,
                    "lower_body_length" : float,
                    "leg_length_avg"    : float,
                },
                "style_recommendation": {
                    "top"      : list,
                    "bottom"   : list,
                    "fit"      : str,
                    "avoid"    : list,
                    "extra_tip": str,
                },
                "ai_explanation": {
                    "summary"           : str,
                    "top_explanation"   : str,
                    "bottom_explanation": str,
                    "avoid_explanation" : str,
                    "styling_tip"       : str,
                    "error"             : str,  # 오류 시에만 포함
                },
            }

    Raises:
        FileNotFoundError: body_result.json 파일이 없을 때
        ValueError       : JSON 파싱 실패 또는 필수 키 누락 시
    """
    # ── 입력값 정규화 ────────────────────────────
    gender   = normalize_gender(gender)
    provider = normalize_provider(provider)

    # ── Step 1: 데이터 로드 ───────────────────────
    data = load_body_data(data_path)

    # ── Step 2: 체형 분류 ─────────────────────────
    classification = classify_all(data, gender=gender)

    # ── Step 3: rule-based 스타일 추천 ───────────
    style = recommend_style(classification)

    # ── Step 4: AI 설명 생성 (선택) ──────────────
    if use_ai:
        ai_explanation = recommend_with_ai(
            classification=classification,
            recommendation=style,
            provider=provider,
        )
    else:
        ai_explanation = _empty_ai_explanation()

    # ── Step 5: 최종 결과 조합 ────────────────────
    return {
        "body_analysis": {
            "gender"    : classification["gender"],
            "body_type" : classification["body_type"],
            "proportion": classification["proportion"],
            "limb_type" : classification["limb_type"],
        },
        "ratios"      : extract_ratios(data),
        "measurements": extract_measurements(data),
        "style_recommendation": style,
        "ai_explanation"      : ai_explanation,
    }


# ────────────────────────────────────────────────
# CLI 진입점
# ────────────────────────────────────────────────

def main() -> None:
    """
    커맨드라인에서 직접 실행할 때의 진입점입니다.
    인자를 파싱하고 recommend_endpoint()를 호출한 뒤 JSON을 출력합니다.
    """
    parser = argparse.ArgumentParser(
        description="FashionPeople — 체형 분류 & 스타일 추천 파이프라인",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--gender",
        type=str,
        default="unspecified",
        help="성별 입력 (male | female | unspecified)",
    )
    parser.add_argument(
        "--data",
        type=str,
        default=DEFAULT_DATA_PATH,
        help="body_result.json 경로",
    )
    parser.add_argument(
        "--provider",
        type=str,
        default="openai",
        help="AI API 선택 (openai | claude)",
    )
    parser.add_argument(
        "--no-ai",
        action="store_true",
        help="AI 설명 생성을 건너뜁니다 (rule-based 결과만 출력)",
    )
    args = parser.parse_args()

    try:
        result = recommend_endpoint(
            gender   =args.gender,
            data_path=args.data,
            use_ai   =not args.no_ai,
            provider =args.provider,
        )
    except FileNotFoundError as e:
        print("[오류] 파일을 찾을 수 없습니다: {}".format(e), file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print("[오류] 데이터 형식 오류: {}".format(e), file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()