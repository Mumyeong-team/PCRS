import json
from pathlib import Path
from typing import Any, Dict


def save_json_file(path: Path, data: dict) -> None:
    """
    JSON 파일 저장
    """
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json_file(path: Path) -> dict:
    """
    JSON 파일 불러오기
    """
    if not path.exists():
        raise FileNotFoundError(f"파일이 없습니다: {path}")

    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def ensure_dir(path: Path) -> Path:
    """
    폴더가 없으면 생성 후 Path 반환
    """
    path.mkdir(parents=True, exist_ok=True)
    return path


def round_body_metrics(data: dict, digits: int = 4) -> Dict[str, float]:
    """
    body metric 숫자값 반올림
    """
    return {
        k: round(float(v), digits)
        for k, v in data.items()
        if isinstance(v, (int, float))
    }


def find_clothes_file(clothes_dir: Path, clothing_type: str) -> Path:
    """
    top / bottom 의류 이미지 찾기
    png, jpg, jpeg 순서대로 탐색
    """
    candidates = [
        clothes_dir / f"{clothing_type}.png",
        clothes_dir / f"{clothing_type}.jpg",
        clothes_dir / f"{clothing_type}.jpeg",
    ]

    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(
        f"{clothing_type} 의류 이미지가 없습니다. clothes 폴더를 확인하세요."
    )


def normalize_gender(gender: str) -> str:
    """
    성별 문자열 정규화
    """
    valid_genders = {"male", "female", "unspecified"}
    value = (gender or "").strip().lower()
    return value if value in valid_genders else "unspecified"


def normalize_provider(provider: str) -> str:
    """
    AI provider 문자열 정규화
    """
    valid_providers = {"openai", "claude"}
    value = (provider or "").strip().lower()
    return value if value in valid_providers else "openai"


def model_to_dict(model_obj: Any) -> dict:
    """
    pydantic v1 / v2 모두 대응
    """
    if hasattr(model_obj, "model_dump"):
        return model_obj.model_dump()
    return model_obj.dict()


def empty_ai_explanation(required_output_keys: list[str]) -> dict:
    """
    AI 설명 비활성화 시 빈 응답 생성
    """
    return {key: "" for key in required_output_keys}


def body_data_to_dict(body_data: Any) -> dict:
    """
    BodyData pydantic 모델 -> dict 변환
    """
    return {
        "shoulder_width": body_data.shoulder_width,
        "waist_width": body_data.waist_width,
        "hip_width": body_data.hip_width,
        "arm_length": body_data.arm_length,
        "upper_body_length": body_data.upper_body_length,
        "lower_body_length": body_data.lower_body_length,
        "leg_length_avg": body_data.leg_length_avg,
        "upper_lower_ratio": body_data.upper_lower_ratio,
        "shoulder_waist_ratio": body_data.shoulder_waist_ratio,
    }


def save_session_meta(json_dir: Path, session_id: str, meta: dict) -> None:
    """
    세션별 request_meta.json 저장
    """
    meta_path = json_dir / session_id / "request_meta.json"
    save_json_file(meta_path, meta)


def load_session_meta(json_dir: Path, session_id: str) -> dict:
    """
    세션별 request_meta.json 불러오기
    """
    meta_path = json_dir / session_id / "request_meta.json"
    if meta_path.exists():
        return load_json_file(meta_path)
    return {}