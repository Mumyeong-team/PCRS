import json
import math
import os
import sys
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np

print("[ANALYZER DEBUG] PYTHON =", sys.executable)
print("[ANALYZER DEBUG] MEDIAPIPE =", mp.__file__)

_analyzer_p = os.path.join(
    os.path.dirname(mp.__file__),
    "modules",
    "pose_landmark",
    "pose_landmark_cpu.binarypb",
)
print("[ANALYZER DEBUG] BINARYPB =", _analyzer_p)
print("[ANALYZER DEBUG] EXISTS =", os.path.exists(_analyzer_p))

mp_pose = mp.solutions.pose

POSE_INDEX = {
    "LEFT_SHOULDER": 11,
    "RIGHT_SHOULDER": 12,
    "LEFT_ELBOW": 13,
    "RIGHT_ELBOW": 14,
    "LEFT_WRIST": 15,
    "RIGHT_WRIST": 16,
    "LEFT_HIP": 23,
    "RIGHT_HIP": 24,
    "LEFT_KNEE": 25,
    "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27,
    "RIGHT_ANKLE": 28,
}


def save_json(path: Path, data: Any) -> None:
    """
    JSON 파일 저장
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def extract_pose(image_path: str) -> list[dict[str, float | int]]:
    """
    이미지에서 MediaPipe Pose landmark 추출
    """
    p = Path(image_path)
    print(f"[DEBUG] file exists: {p.exists()}, path: {p}")

    if not p.exists():
        raise FileNotFoundError(f"이미지 파일이 존재하지 않습니다: {image_path}")

    file_size = p.stat().st_size
    print(f"[DEBUG] file size: {file_size}")

    if file_size == 0:
        raise ValueError(f"이미지 파일 크기가 0입니다: {image_path}")

    # Windows / OneDrive / 한글 경로 대응
    file_bytes = np.fromfile(str(p), dtype=np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    print(f"[DEBUG] cv2.imdecode is None: {image is None}")

    if image is None:
        raise FileNotFoundError(f"이미지를 읽을 수 없습니다: {image_path}")

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=2,
        enable_segmentation=False,
        min_detection_confidence=0.5,
    ) as pose:
        result = pose.process(image_rgb)

    if not result.pose_landmarks:
        raise ValueError(f"포즈를 인식하지 못했습니다: {image_path}")

    landmarks: list[dict[str, float | int]] = []
    for idx, lm in enumerate(result.pose_landmarks.landmark):
        landmarks.append(
            {
                "id": idx,
                "x": float(lm.x),
                "y": float(lm.y),
                "z": float(lm.z),
                "visibility": float(lm.visibility),
            }
        )

    return landmarks


def get_lm(landmarks: list[dict[str, Any]], idx: int) -> dict[str, float]:
    """
    특정 landmark 하나를 읽어오기 쉽게 변환
    """
    lm = landmarks[idx]
    return {
        "x": float(lm["x"]),
        "y": float(lm["y"]),
        "z": float(lm["z"]),
        "visibility": float(lm["visibility"]),
    }


def distance(p1: dict[str, float], p2: dict[str, float]) -> float:
    """
    3차원 거리 계산
    """
    return math.sqrt(
        (p1["x"] - p2["x"]) ** 2
        + (p1["y"] - p2["y"]) ** 2
        + (p1["z"] - p2["z"]) ** 2
    )


def midpoint(p1: dict[str, float], p2: dict[str, float]) -> dict[str, float]:
    """
    두 점의 중간점 계산
    """
    return {
        "x": (p1["x"] + p2["x"]) / 2,
        "y": (p1["y"] + p2["y"]) / 2,
        "z": (p1["z"] + p2["z"]) / 2,
        "visibility": (p1["visibility"] + p2["visibility"]) / 2,
    }


def calculate_leg_length_avg(landmarks: list[dict[str, Any]]) -> float:
    """
    좌/우 다리 길이 평균 계산
    """
    lh = get_lm(landmarks, POSE_INDEX["LEFT_HIP"])
    lk = get_lm(landmarks, POSE_INDEX["LEFT_KNEE"])
    la = get_lm(landmarks, POSE_INDEX["LEFT_ANKLE"])

    rh = get_lm(landmarks, POSE_INDEX["RIGHT_HIP"])
    rk = get_lm(landmarks, POSE_INDEX["RIGHT_KNEE"])
    ra = get_lm(landmarks, POSE_INDEX["RIGHT_ANKLE"])

    left_leg = distance(lh, lk) + distance(lk, la)
    right_leg = distance(rh, rk) + distance(rk, ra)

    return (left_leg + right_leg) / 2


def calculate_body(front_landmarks: list[dict[str, Any]]) -> dict[str, Any]:
    """
    정면 landmark를 바탕으로 body_result.json에 들어갈 값 계산

    역할:
    - 신체 측정값 생성만 담당
    - 체형 분류(body_type)는 classifier.py에서 수행
    - hip_width가 비정상적으로 작게 측정되면 간단 보정
    """
    ls = get_lm(front_landmarks, POSE_INDEX["LEFT_SHOULDER"])
    rs = get_lm(front_landmarks, POSE_INDEX["RIGHT_SHOULDER"])
    lh = get_lm(front_landmarks, POSE_INDEX["LEFT_HIP"])
    rh = get_lm(front_landmarks, POSE_INDEX["RIGHT_HIP"])
    le = get_lm(front_landmarks, POSE_INDEX["LEFT_ELBOW"])
    lw = get_lm(front_landmarks, POSE_INDEX["LEFT_WRIST"])
    lk = get_lm(front_landmarks, POSE_INDEX["LEFT_KNEE"])
    la = get_lm(front_landmarks, POSE_INDEX["LEFT_ANKLE"])

    shoulder_center = midpoint(ls, rs)
    hip_center = midpoint(lh, rh)

    # 허리 landmark는 별도로 없어서 어깨-엉덩이 중간점으로 근사
    left_waist = midpoint(ls, lh)
    right_waist = midpoint(rs, rh)

    shoulder_width = distance(ls, rs)
    waist_width = distance(left_waist, right_waist)
    hip_width = distance(lh, rh)

    # ------------------------------------------------
    # hip_width 간단 보정
    # hip landmark가 너무 안쪽으로 잡혀 hip_width가 waist_width보다
    # 비정상적으로 작게 나오는 경우 방어
    # ------------------------------------------------
    if hip_width < waist_width * 0.9:
        print("[DEBUG] hip_width too small -> corrected")
        print(f"[DEBUG] original hip_width: {hip_width:.4f}, waist_width: {waist_width:.4f}")
        hip_width = waist_width * 1.05
        print(f"[DEBUG] corrected hip_width: {hip_width:.4f}")

    arm_length = distance(ls, le) + distance(le, lw)
    upper_body_length = distance(shoulder_center, hip_center)
    lower_body_length = distance(hip_center, midpoint(lk, la))
    leg_length_avg = calculate_leg_length_avg(front_landmarks)

    upper_lower_ratio = upper_body_length / lower_body_length if lower_body_length > 0 else 0.0
    shoulder_waist_ratio = shoulder_width / waist_width if waist_width > 0 else 0.0

    return {
        "shoulder_width": shoulder_width,
        "waist_width": waist_width,
        "hip_width": hip_width,
        "arm_length": arm_length,
        "upper_body_length": upper_body_length,
        "lower_body_length": lower_body_length,
        "leg_length_avg": leg_length_avg,
        "upper_lower_ratio": upper_lower_ratio,
        "shoulder_waist_ratio": shoulder_waist_ratio,
    }


def run_analysis(front_path: Path, side_path: Path, json_dir: Path) -> dict[str, Any]:
    """
    정면/측면 이미지를 분석하고
    front.json, side.json, body_result.json 저장 후 결과 반환
    """
    print("[DEBUG] run_analysis start")
    print(f"[DEBUG] front_path: {front_path}")
    print(f"[DEBUG] side_path: {side_path}")
    print(f"[DEBUG] json_dir: {json_dir}")

    json_dir.mkdir(parents=True, exist_ok=True)

    # 정면/측면 landmark 추출
    front_landmarks = extract_pose(str(front_path))
    side_landmarks = extract_pose(str(side_path))

    # 파일 경로
    front_json = json_dir / "front.json"
    side_json = json_dir / "side.json"
    result_json = json_dir / "body_result.json"

    # landmark 저장
    save_json(front_json, front_landmarks)
    save_json(side_json, side_landmarks)

    # 측정값 계산
    result = calculate_body(front_landmarks)

    # 참고용 메타 정보
    result["source_files"] = {
        "front": "front.json",
        "side": "side.json",
    }

    # 최종 body_result.json 저장
    save_json(result_json, result)

    print("[DEBUG] run_analysis complete")
    return result