"""
classifier.py
=============
체형 분류 모듈.

현재 1차 버전은 hip_width 없이 아래 데이터만 사용합니다:
  - shoulder_waist_ratio  → 체형(body_type) 분류
  - upper_lower_ratio     → 상하체 비율(proportion) 분류
  - arm_length            → 팔 길이(limb_type) 분류
  - leg_length_avg        → 팔 길이 비교 기준

[hip_width 추가 시 확장 방법]
  body_result.json에 "hip_width" 키가 생기면:
    1. classify_body() 내부의 비활성화 블록 주석을 해제하세요.
    2. shoulder_hip_ratio / waist_hip_ratio 기반으로
       triangle / hourglass / round 분류가 자동 활성화됩니다.
"""

import json
import os


# ────────────────────────────────────────────────
# 1. 데이터 로드
# ────────────────────────────────────────────────

def load_body_data(path: str) -> dict:
    """
    body_result.json 파일을 읽어서 dict로 반환합니다.

    Args:
        path (str): JSON 파일 경로

    Returns:
        dict: 신체 측정값 딕셔너리

    Raises:
        FileNotFoundError: 파일이 존재하지 않을 때
        ValueError: JSON 파싱 실패 또는 필수 키 누락 시
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {path}")

    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON 파싱 오류: {e}")

    # 필수 키 검증 (arm_length, leg_length_avg 포함)
    required_keys = [
        "shoulder_width",
        "waist_width",
        "upper_body_length",
        "lower_body_length",
        "arm_length",
        "leg_length_avg",
        "shoulder_waist_ratio",
        "upper_lower_ratio",
    ]
    missing = [k for k in required_keys if k not in data]
    if missing:
        raise ValueError(f"body_result.json에 필수 키가 없습니다: {missing}")

    return data


# ────────────────────────────────────────────────
# 2. 체형 분류 (body_type)
# ────────────────────────────────────────────────

def classify_body(data: dict, gender: str = "unspecified") -> str:
    """
    shoulder_waist_ratio를 기반으로 체형을 분류합니다.

    1차 버전 기준 (hip_width 없음):
      ┌─────────────────────────────────────────┐
      │ 분류              male     female        │
      │ inverted_triangle ≥ 1.65   ≥ 1.55       │
      │ rectangle         ≤ 1.30   ≤ 1.20       │
      │ balanced          그 외    그 외         │
      └─────────────────────────────────────────┘

    실제 MediaPipe 추출 데이터는 절대 픽셀이 아니라
    정규화된 좌표 비율이므로, 너무 높은 threshold는
    대부분을 같은 체형으로 몰아버립니다.
    현실적인 범위로 조정했습니다.

    Args:
        data   (dict): load_body_data()로 읽은 신체 데이터
        gender (str) : "male" | "female" | "unspecified"

    Returns:
        str: 체형 레이블
    """
    swr = data["shoulder_waist_ratio"]

    if gender == "female":
        inv_threshold  = 1.55   # 여성 기준 — 허리 대비 어깨 폭이 뚜렷이 넓은 경우
        rect_threshold = 1.20   # 여성 기준 — 어깨·허리 너비 차이가 적은 경우
    else:
        # male 또는 unspecified
        inv_threshold  = 1.65   # 남성은 어깨가 원래 넓으므로 기준을 조금 높임
        rect_threshold = 1.30

    if swr >= inv_threshold:
        return "inverted_triangle"
    elif swr <= rect_threshold:
        return "rectangle"
    else:
        return "balanced"

    # ── hip_width 추가 후 확장 예시 (비활성화 상태) ──────────────────────
    # hip_width = data.get("hip_width")
    # if hip_width and hip_width > 0:
    #     shoulder_hip_ratio = data["shoulder_width"] / hip_width
    #     waist_hip_ratio    = data["waist_width"]    / hip_width
    #
    #     if shoulder_hip_ratio >= 1.2:
    #         return "inverted_triangle"
    #     elif shoulder_hip_ratio <= 0.9:
    #         return "triangle"         # 하체가 넓은 역삼각형 반대 체형
    #     elif shoulder_hip_ratio <= 1.1 and waist_hip_ratio <= 0.75:
    #         return "hourglass"        # 허리가 뚜렷이 잘록한 경우
    #     elif waist_hip_ratio >= 0.90:
    #         return "round"            # 허리·엉덩이 차이가 적은 둥근 체형
    #     elif 0.9 < shoulder_hip_ratio < 1.2 and waist_hip_ratio >= 0.85:
    #         return "rectangle"
    #     else:
    #         return "balanced"


# ────────────────────────────────────────────────
# 3. 상하체 비율 분류 (proportion)
# ────────────────────────────────────────────────

def classify_proportion(data: dict) -> str:
    """
    upper_lower_ratio를 기반으로 상하체 비율을 분류합니다.

    upper_lower_ratio = upper_body_length / lower_body_length
      - 값 > 1  : 상체가 하체보다 긺
      - 값 < 1  : 하체가 상체보다 긺

    기준:
      >= 1.08 → long_upper_body   (상체가 뚜렷이 더 긺)
      <= 0.90 → long_legs         (하체가 뚜렷이 더 긺)
      그 외   → balanced_proportion

    ±8% 범위를 "balanced"로 보는 것이 현실적입니다.

    Args:
        data (dict): 신체 데이터

    Returns:
        str: "long_upper_body" | "long_legs" | "balanced_proportion"
    """
    ulr = data["upper_lower_ratio"]

    if ulr >= 1.08:
        return "long_upper_body"
    elif ulr <= 0.90:
        return "long_legs"
    else:
        return "balanced_proportion"


# ────────────────────────────────────────────────
# 4. 팔 길이 유형 분류 (limb_type)
# ────────────────────────────────────────────────

def classify_limb_type(data: dict) -> str:
    """
    arm_length / leg_length_avg 비율로 팔 길이 유형을 분류합니다.

    설계 의도:
      팔 길이를 다리 길이와 비교하면 신체 전체 스케일 대비
      팔이 얼마나 긴지를 더 직관적으로 파악할 수 있습니다.
      (arm / upper_body 비율은 상체 내부만 보므로
       전신 비례 파악에는 적합하지 않습니다.)

    기준 (arm / leg 비율):
      >= 0.85 → long_arms     (팔이 상대적으로 긺)
      <= 0.70 → short_arms    (팔이 상대적으로 짧음)
      그 외   → balanced_limbs

    Args:
        data (dict): 신체 데이터

    Returns:
        str: "long_arms" | "short_arms" | "balanced_limbs"
    """
    arm = data.get("arm_length", 0)
    leg = data.get("leg_length_avg", 1)  # 0 나누기 방지

    if leg == 0:
        return "balanced_limbs"

    ratio = arm / leg

    if ratio >= 0.85:
        return "long_arms"
    elif ratio <= 0.70:
        return "short_arms"
    else:
        return "balanced_limbs"


# ────────────────────────────────────────────────
# 5. 통합 분류 함수
# ────────────────────────────────────────────────

def classify_all(data: dict, gender: str = "unspecified") -> dict:
    """
    체형, 비율, 팔 길이를 한 번에 분류하여 딕셔너리로 반환합니다.

    Args:
        data   (dict): load_body_data()로 읽은 신체 데이터
        gender (str) : "male" | "female" | "unspecified"

    Returns:
        dict: {
            "gender"    : str,
            "body_type" : str,
            "proportion": str,
            "limb_type" : str,
        }
    """
    return {
        "gender"    : gender,
        "body_type" : classify_body(data, gender),
        "proportion": classify_proportion(data),
        "limb_type" : classify_limb_type(data),
    }
