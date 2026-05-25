"""
classifier.py
=============
체형 분류 모듈 (안정형 최종 버전)

분류 항목:
- body_type
- proportion
- limb_type
- build_type
- shoulder_type
- silhouette_type

설계 방향:
- body_type은 보수적으로 분류
- shoulder_type / silhouette_type은 과민 반응하지 않게 안정적으로 분류
"""

import json
import os
from typing import Optional


# ------------------------------------------------
# 1. 데이터 로드
# ------------------------------------------------
def load_body_data(path: str) -> dict:
    if not os.path.exists(path):
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {path}")

    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON 파싱 오류: {e}")

    required_keys = [
        "shoulder_width",
        "waist_width",
        "hip_width",
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


# ------------------------------------------------
# 2. body_type 분류
# ------------------------------------------------
def classify_body(data: dict, gender: str = "unspecified") -> str:
    """
    메인 body_type 분류
    """

    shoulder_width = data["shoulder_width"]
    waist_width = data["waist_width"]
    hip_width = data["hip_width"]
    swr = data["shoulder_waist_ratio"]

    if hip_width <= 0:
        if gender == "female":
            inv_threshold = 1.55
            rect_threshold = 1.20
        else:
            inv_threshold = 1.65
            rect_threshold = 1.30

        if swr >= inv_threshold:
            return "inverted_triangle"
        elif swr <= rect_threshold:
            return "rectangle"
        else:
            return "balanced"

    shoulder_hip_ratio = shoulder_width / hip_width
    waist_hip_ratio = waist_width / hip_width

    hip_unreliable = waist_hip_ratio > 1.05

    if shoulder_hip_ratio >= 1.12 and swr >= 1.30:
        return "inverted_triangle"

    if shoulder_hip_ratio <= 0.94 and not hip_unreliable:
        return "triangle"

    if (
        0.95 <= shoulder_hip_ratio <= 1.08
        and waist_hip_ratio <= 0.78
        and swr >= 1.20
        and not hip_unreliable
    ):
        return "hourglass"

    if (
        waist_hip_ratio >= 0.95
        and swr <= 1.20
        and 0.95 <= shoulder_hip_ratio <= 1.08
        and not hip_unreliable
    ):
        return "round"

    if swr <= 1.32 and 0.94 <= shoulder_hip_ratio <= 1.10:
        return "rectangle"

    return "balanced"


# ------------------------------------------------
# 3. 상하체 비율 분류
# ------------------------------------------------
def classify_proportion(data: dict) -> str:
    ratio = data["upper_lower_ratio"]

    if ratio >= 1.08:
        return "long_upper_body"
    elif ratio <= 0.92:
        return "long_legs"
    else:
        return "balanced_proportion"


# ------------------------------------------------
# 4. 사지(팔 길이) 분류
# ------------------------------------------------
def classify_limb_type(data: dict) -> str:
    arm_length = data["arm_length"]
    leg_length_avg = data["leg_length_avg"]

    if leg_length_avg <= 0:
        return "balanced_limbs"

    arm_leg_ratio = arm_length / leg_length_avg

    if arm_leg_ratio >= 0.78:
        return "long_arms"
    elif arm_leg_ratio <= 0.62:
        return "short_arms"
    else:
        return "balanced_limbs"


# ------------------------------------------------
# 5. 체격감(build_type) 분류
# ------------------------------------------------
def classify_build_type(
    data: dict,
    height_cm: Optional[float] = None,
    weight_kg: Optional[float] = None,
) -> str:
    waist_width = data.get("waist_width", 0.0)
    shoulder_width = data.get("shoulder_width", 0.0)

    compactness_hint = waist_width / shoulder_width if shoulder_width > 0 else 0.0

    bmi = None
    if height_cm and weight_kg and height_cm > 0:
        h_m = height_cm / 100.0
        bmi = weight_kg / (h_m * h_m)

    if bmi is not None:
        if bmi >= 25.0:
            return "stocky_build"
        if bmi >= 23.5 and compactness_hint >= 0.81:
            return "stocky_build"

        if bmi < 20.5 and compactness_hint < 0.80:
            return "slim_build"
        if bmi < 21.5 and compactness_hint < 0.78:
            return "slim_build"

        return "regular_build"

    if compactness_hint < 0.77:
        return "slim_build"
    elif compactness_hint >= 0.82:
        return "stocky_build"
    else:
        return "regular_build"


# ------------------------------------------------
# 6. 어깨 인상 분류 (안정형)
# ------------------------------------------------
def classify_shoulder_type(data: dict) -> str:
    """
    shoulder_type:
    - narrow_shoulders
    - balanced_shoulders
    - broad_shoulders

    너무 쉽게 broad/narrow로 가지 않도록 보수적으로 판정
    """
    shoulder_width = data["shoulder_width"]
    hip_width = data["hip_width"]
    waist_width = data["waist_width"]

    shoulder_hip_ratio = shoulder_width / hip_width if hip_width > 0 else 1.0
    shoulder_waist_ratio = shoulder_width / waist_width if waist_width > 0 else 1.0

    score = 0

    # 어깨 / 골반 비율
    if shoulder_hip_ratio >= 1.18:
        score += 1
    elif shoulder_hip_ratio <= 0.95:
        score -= 1

    # 어깨 / 허리 비율
    if shoulder_waist_ratio >= 1.34:
        score += 1
    elif shoulder_waist_ratio <= 1.16:
        score -= 1

    if score >= 2:
        return "broad_shoulders"
    elif score <= -2:
        return "narrow_shoulders"
    else:
        return "balanced_shoulders"


# ------------------------------------------------
# 7. 전체 실루엣 분류 (안정형)
# ------------------------------------------------
def classify_silhouette_type(data: dict) -> str:
    shoulder_width = data["shoulder_width"]
    hip_width = data["hip_width"]

    if hip_width <= 0:
        return "straight_shape"

    shoulder_hip_ratio = shoulder_width / hip_width

    if shoulder_hip_ratio >= 1.24:
        return "v_shape"
    elif shoulder_hip_ratio <= 0.92:
        return "a_shape"
    else:
        return "straight_shape"


# ------------------------------------------------
# 8. 전체 분류
# ------------------------------------------------
def classify_all(
    data: dict,
    gender: str = "unspecified",
    height_cm: Optional[float] = None,
    weight_kg: Optional[float] = None,
) -> dict:
    return {
        "gender": gender,
        "body_type": classify_body(data, gender),
        "proportion": classify_proportion(data),
        "limb_type": classify_limb_type(data),
        "build_type": classify_build_type(data, height_cm, weight_kg),
        "shoulder_type": classify_shoulder_type(data),
        "silhouette_type": classify_silhouette_type(data),
    }