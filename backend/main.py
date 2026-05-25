"""
main.py
=======
FashionPeople — 최종 FastAPI 통합 서버

기능:
1. GET /                     : 서버 실행 확인
2. GET /health               : 상태 확인
3. POST /analyze             : JSON(body_data) 직접 넣어서 분석
4. POST /upload-image        : front / side 이미지 업로드 후 자동 분석
5. GET /result/{session_id}  : 세션 결과 조회

실행:
    uvicorn main:app --reload
"""

import json
import traceback
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from analyzer import run_analysis
from classifier import classify_all
from recommender import recommend_style
from ai_recommender import recommend_with_ai, REQUIRED_OUTPUT_KEYS


# =========================================================
# FastAPI 앱 생성
# =========================================================
app = FastAPI(
    title="FashionPeople Integrated API",
    description="AI 기반 체형 분석 및 스타일 추천 통합 서버",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# 경로 설정
# =========================================================
BASE_DIR = Path(__file__).resolve().parent

BODY_DATA_DIR = BASE_DIR / "body_data"
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
JSON_DIR = BASE_DIR / "data" / "json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
JSON_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# 요청 모델
# =========================================================
class UserInput(BaseModel):
    gender: str = Field("unspecified", description="male / female / unspecified")
    height_cm: Optional[float] = Field(None, description="키(cm)")
    weight_kg: Optional[float] = Field(None, description="몸무게(kg)")
    top_size: Optional[str] = Field(None, description="상의 사이즈")
    bottom_size: Optional[str] = Field(None, description="하의 사이즈")
    preferred_fit: Optional[str] = Field(None, description="선호 핏")
    preferred_style: Optional[str] = Field(None, description="선호 스타일")


class BodyData(BaseModel):
    shoulder_width: float
    waist_width: float
    hip_width: float
    arm_length: float
    upper_body_length: float
    lower_body_length: float
    leg_length_avg: float
    upper_lower_ratio: float
    shoulder_waist_ratio: float


class AnalyzeRequest(BaseModel):
    user_input: UserInput
    body_data: BodyData
    provider: str = "openai"
    use_ai: bool = True


# =========================================================
# 유틸 함수
# =========================================================
VALID_GENDERS: List[str] = ["male", "female", "unspecified"]
VALID_PROVIDERS: List[str] = ["openai", "claude"]


def normalize_gender(gender: str) -> str:
    value = (gender or "").strip().lower()
    return value if value in VALID_GENDERS else "unspecified"


def normalize_provider(provider: str) -> str:
    value = (provider or "").strip().lower()
    return value if value in VALID_PROVIDERS else "openai"


def model_to_dict(model_obj) -> dict:
    if hasattr(model_obj, "model_dump"):
        return model_obj.model_dump()
    return model_obj.dict()


def body_data_to_dict(body_data: BodyData) -> dict:
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


def round_body_metrics(data: dict, digits: int = 4) -> Dict[str, float]:
    return {
        k: round(float(v), digits)
        for k, v in data.items()
        if isinstance(v, (int, float))
    }


def empty_ai_explanation() -> dict:
    return {key: "" for key in REQUIRED_OUTPUT_KEYS}


def save_json_file(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json_file(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"파일이 없습니다: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_session_meta(session_id: str, meta: dict) -> None:
    meta_path = JSON_DIR / session_id / "request_meta.json"
    save_json_file(meta_path, meta)


def load_session_meta(session_id: str) -> dict:
    meta_path = JSON_DIR / session_id / "request_meta.json"
    if meta_path.exists():
        return load_json_file(meta_path)
    return {}


def build_pipeline_result(
    user_input: dict,
    body_data: dict,
    provider: str = "openai",
    use_ai: bool = True,
) -> dict:
    """
    핵심 분석 파이프라인
    """
    gender = normalize_gender(user_input.get("gender", "unspecified"))
    provider = normalize_provider(provider)

    classification = classify_all(
        body_data,
        gender=gender,
        height_cm=user_input.get("height_cm"),
        weight_kg=user_input.get("weight_kg"),
    )

    style_recommendation = recommend_style(classification, user_input)

    if use_ai:
        ai_explanation = recommend_with_ai(
            classification=classification,
            recommendation=style_recommendation,
            provider=provider,
            user_input=user_input,
        )
    else:
        ai_explanation = empty_ai_explanation()

    return {
        "body_analysis": {
            "gender": classification["gender"],
            "body_type": classification["body_type"],
            "proportion": classification["proportion"],
            "limb_type": classification["limb_type"],
            "build_type": classification["build_type"],
            "shoulder_type": classification["shoulder_type"],
            "silhouette_type": classification["silhouette_type"],
        },
        "body_metrics": round_body_metrics(body_data),
        "style_recommendation": style_recommendation,
        "ai_explanation": ai_explanation,
        "user_input": user_input,
        "provider": provider,
        "use_ai": use_ai,
    }


# =========================================================
# 기본 엔드포인트
# =========================================================
@app.get("/")
def root():
    return {
        "service": "FashionPeople Integrated API",
        "status": "running",
        "docs": "http://localhost:8000/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


# =========================================================
# 1) JSON 직접 분석
# =========================================================
@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    try:
        user_input = model_to_dict(request.user_input)
        body_data = body_data_to_dict(request.body_data)

        final_result = build_pipeline_result(
            user_input=user_input,
            body_data=body_data,
            provider=request.provider,
            use_ai=request.use_ai,
        )

        return JSONResponse(final_result)

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"분석 실패: {str(e)}")


# =========================================================
# 2) 이미지 업로드 기반 분석
# =========================================================
@app.post("/upload-image")
async def upload_image(
    session_id: str = Form(...),
    image_type: str = Form(...),
    file: UploadFile = File(...),

    gender: str = Form("unspecified"),
    height_cm: Optional[float] = Form(None),
    weight_kg: Optional[float] = Form(None),
    top_size: Optional[str] = Form(None),
    bottom_size: Optional[str] = Form(None),
    preferred_fit: Optional[str] = Form(None),
    preferred_style: Optional[str] = Form(None),

    provider: str = Form("openai"),
    use_ai: bool = Form(True),
):
    try:
        if image_type not in {"front", "side"}:
            raise HTTPException(status_code=400, detail="image_type은 front 또는 side 여야 합니다.")

        session_upload_dir = UPLOAD_DIR / session_id
        session_upload_dir.mkdir(parents=True, exist_ok=True)

        session_json_dir = JSON_DIR / session_id
        session_json_dir.mkdir(parents=True, exist_ok=True)

        save_path = session_upload_dir / f"{image_type}.jpg"
        content = await file.read()

        if not content:
            raise HTTPException(status_code=400, detail="업로드된 파일이 비어 있습니다.")

        save_path.write_bytes(content)

        meta = {
            "gender": gender,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "top_size": top_size,
            "bottom_size": bottom_size,
            "preferred_fit": preferred_fit,
            "preferred_style": preferred_style,
            "provider": provider,
            "use_ai": use_ai,
        }
        save_session_meta(session_id, meta)

        front_path = session_upload_dir / "front.jpg"
        side_path = session_upload_dir / "side.jpg"

        if not (front_path.exists() and side_path.exists()):
            return JSONResponse(
                {
                    "status": "uploaded",
                    "session_id": session_id,
                    "message": f"{image_type}.jpg 업로드 완료. 나머지 이미지 업로드 대기 중",
                }
            )

        analyzer_result = run_analysis(front_path, side_path, session_json_dir)

        body_data = {
            "shoulder_width": float(analyzer_result["shoulder_width"]),
            "waist_width": float(analyzer_result["waist_width"]),
            "hip_width": float(analyzer_result["hip_width"]),
            "arm_length": float(analyzer_result["arm_length"]),
            "upper_body_length": float(analyzer_result["upper_body_length"]),
            "lower_body_length": float(analyzer_result["lower_body_length"]),
            "leg_length_avg": float(analyzer_result["leg_length_avg"]),
            "upper_lower_ratio": float(analyzer_result["upper_lower_ratio"]),
            "shoulder_waist_ratio": float(analyzer_result["shoulder_waist_ratio"]),
        }

        saved_meta = load_session_meta(session_id)
        user_input = {
            "gender": saved_meta.get("gender", "unspecified"),
            "height_cm": saved_meta.get("height_cm"),
            "weight_kg": saved_meta.get("weight_kg"),
            "top_size": saved_meta.get("top_size"),
            "bottom_size": saved_meta.get("bottom_size"),
            "preferred_fit": saved_meta.get("preferred_fit"),
            "preferred_style": saved_meta.get("preferred_style"),
        }

        final_result = build_pipeline_result(
            user_input=user_input,
            body_data=body_data,
            provider=saved_meta.get("provider", "openai"),
            use_ai=bool(saved_meta.get("use_ai", True)),
        )

        pipeline_result_path = session_json_dir / "pipeline_result.json"
        save_json_file(pipeline_result_path, final_result)

        return JSONResponse(
            {
                "status": "analysis_complete",
                "session_id": session_id,
                "result": final_result,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# 3) 결과 조회
# =========================================================
@app.get("/result/{session_id}")
def get_result(session_id: str):
    session_json_dir = JSON_DIR / session_id

    pipeline_result_path = session_json_dir / "pipeline_result.json"
    body_result_path = session_json_dir / "body_result.json"

    if pipeline_result_path.exists():
        data = load_json_file(pipeline_result_path)
        return JSONResponse(
            {
                "status": "success",
                "session_id": session_id,
                "type": "pipeline_result",
                "result": data,
            }
        )

    if body_result_path.exists():
        data = load_json_file(body_result_path)
        return JSONResponse(
            {
                "status": "success",
                "session_id": session_id,
                "type": "body_result",
                "result": data,
            }
        )

    raise HTTPException(status_code=404, detail="결과 없음")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)