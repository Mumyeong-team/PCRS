from pathlib import Path
from typing import Optional

from utils import ensure_dir, find_clothes_file, load_json_file, save_json_file


def create_simple_outfit_result(
    session_id: str,
    outfit_dir: Path,
    clothes_dir: Path,
    body_data: Optional[dict] = None,
    recommendation: Optional[dict] = None,
) -> dict:
    """
    가장 단순한 outfit 결과 JSON 생성
    실제 이미지 합성 엔진이 없더라도 세션 결과 구조를 만들 수 있게 함
    """

    session_outfit_dir = ensure_dir(outfit_dir / session_id)

    top_path = find_clothes_file(clothes_dir, "top")
    bottom_path = find_clothes_file(clothes_dir, "bottom")

    result = {
        "session_id": session_id,
        "top_image": str(top_path),
        "bottom_image": str(bottom_path),
        "outfit_result_image": None,   # 실제 합성 이미지 경로
        "body_data": body_data or {},
        "recommendation": recommendation or {},
        "status": "READY",
        "message": "의류 파일 확인 완료. 실제 합성 로직이 연결되면 결과 이미지 생성 가능",
    }

    save_json_file(session_outfit_dir / "outfit_result.json", result)
    return result


def create_outfit_by_session(
    session_id: str,
    json_dir: Path,
    clothes_dir: Path,
    outfit_dir: Path,
) -> dict:
    """
    세션 기반으로 outfit 생성

    동작 순서:
    1. 세션의 body_result / pipeline_result 확인
    2. top / bottom 의류 이미지 확인
    3. 결과 JSON 생성
    4. 추후 실제 이미지 합성 로직이 있으면 여기에 연결
    """

    session_json_dir = json_dir / session_id
    body_result_path = session_json_dir / "body_result.json"
    pipeline_result_path = session_json_dir / "pipeline_result.json"

    if not body_result_path.exists() and not pipeline_result_path.exists():
        raise FileNotFoundError(
            f"세션 {session_id}의 분석 결과가 없습니다. 먼저 /upload-image 분석을 완료하세요."
        )

    body_data = {}
    recommendation = {}

    if body_result_path.exists():
        body_data = load_json_file(body_result_path)

    if pipeline_result_path.exists():
        pipeline_result = load_json_file(pipeline_result_path)
        if "body_metrics" in pipeline_result:
            body_data = pipeline_result.get("body_metrics", body_data)
        if "style_recommendation" in pipeline_result:
            recommendation = pipeline_result.get("style_recommendation", {})

    # ------------------------------------------------
    # 여기서 실제 합성 로직을 붙일 수 있음
    # ------------------------------------------------
    result = create_simple_outfit_result(
        session_id=session_id,
        outfit_dir=outfit_dir,
        clothes_dir=clothes_dir,
        body_data=body_data,
        recommendation=recommendation,
    )

    return {
        "status": "success",
        "output": result,
    }