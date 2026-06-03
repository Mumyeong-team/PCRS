"""
main.py
=======
FashionPeople 최종 통합 서버

기능:
1. GET /                     : 서버 실행 확인
2. GET /health               : 상태 확인
3. POST /analyze             : JSON(body_data) 직접 넣어서 분석
4. POST /upload-image        : front / side 이미지 업로드 후 자동 분석
5. POST /upload-clothes      : top / bottom 의류 이미지 업로드
6. POST /outfit/{session_id} : 세션 기반 outfit 결과 생성
7. GET /result/{session_id}  : 세션 결과 조회

실행:
    uvicorn main:app --reload
"""

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
from outfit_renderer import create_outfit_by_session
from db_service import save_analysis_to_db
from utils import (
    body_data_to_dict,
    empty_ai_explanation,
    ensure_dir,
    find_clothes_file,
    load_json_file,
    load_session_meta,
    model_to_dict,
    normalize_gender,
    normalize_provider,
    round_body_metrics,
    save_json_file,
    save_session_meta,
)


# =========================================================
# FastAPI 앱 생성
# =========================================================
app = FastAPI(
    title="FashionPeople Integrated API",
    description="AI 기반 체형 분석 및 스타일 추천 통합 서버",
    version="2.0.0",
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

UPLOAD_DIR = ensure_dir(BASE_DIR / "data" / "uploads")
JSON_DIR = ensure_dir(BASE_DIR / "data" / "json")
CLOTHES_DIR = ensure_dir(BASE_DIR / "data" / "clothes")
OUTFIT_DIR = ensure_dir(BASE_DIR / "data" / "outfit")


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
# 내부 파이프라인
# =========================================================
def build_db_recommendation(style_recommendation: dict) -> dict:
    """
    DB 저장용 간단 추천 구조 변환
    """
    top = ", ".join(style_recommendation.get("top", []))
    bottom = ", ".join(style_recommendation.get("bottom", []))
    fit = style_recommendation.get("fit", "")
    extra_tip = style_recommendation.get("extra_tip", "")

    recommended_style_parts = [part for part in [top, bottom] if part]
    recommended_style = " / ".join(recommended_style_parts) if recommended_style_parts else ""

    recommendation_reason_parts = [part for part in [fit, extra_tip] if part]
    recommendation_reason = "\n".join(recommendation_reason_parts) if recommendation_reason_parts else ""

    return {
        "recommended_style": recommended_style,
        "recommendation_reason": recommendation_reason,
    }


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
        ai_explanation = empty_ai_explanation(REQUIRED_OUTPUT_KEYS)

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
# 2) 의류 업로드
# =========================================================
@app.post("/upload-clothes")
async def upload_clothes(
    clothing_type: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        clothing_type = clothing_type.strip().lower()

        if clothing_type not in {"top", "bottom"}:
            raise HTTPException(
                status_code=400,
                detail="clothing_type 값은 반드시 top 또는 bottom 이어야 합니다.",
            )

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="파일 이름이 없습니다.",
            )

        ext = Path(file.filename).suffix.lower()
        if ext not in [".png", ".jpg", ".jpeg"]:
            raise HTTPException(
                status_code=400,
                detail="의류 이미지는 png, jpg, jpeg 파일만 업로드할 수 있습니다.",
            )

        for old_file in [
            CLOTHES_DIR / f"{clothing_type}.png",
            CLOTHES_DIR / f"{clothing_type}.jpg",
            CLOTHES_DIR / f"{clothing_type}.jpeg",
        ]:
            if old_file.exists():
                old_file.unlink()

        save_path = CLOTHES_DIR / f"{clothing_type}{ext}"

        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=400,
                detail="업로드된 의류 파일이 비어 있습니다.",
            )

        save_path.write_bytes(content)

        return JSONResponse(
            {
                "status": "clothes_uploaded",
                "clothing_type": clothing_type,
                "saved_path": str(save_path),
                "message": f"{clothing_type} 의류 이미지 업로드 완료",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"의류 업로드 실패: {str(e)}")


# =========================================================
# 3) 이미지 업로드 기반 분석
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
        session_id = session_id.strip()
        image_type = image_type.strip().lower()

        if image_type not in {"front", "side"}:
            raise HTTPException(
                status_code=400,
                detail="image_type은 front 또는 side 여야 합니다.",
            )

        session_upload_dir = ensure_dir(UPLOAD_DIR / session_id)
        session_json_dir = ensure_dir(JSON_DIR / session_id)

        save_path = session_upload_dir / f"{image_type}.jpg"
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="업로드된 파일이 비어 있습니다.",
            )

        save_path.write_bytes(content)

        request_meta = {
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
        save_session_meta(JSON_DIR, session_id, request_meta)

        front_path = session_upload_dir / "front.jpg"
        side_path = session_upload_dir / "side.jpg"

        if not (front_path.exists() and side_path.exists()):
            return JSONResponse(
                {
                    "status": "uploaded",
                    "session_id": session_id,
                    "message": f"{image_type}.jpg 업로드 완료. front/side 두 장이 모두 업로드되면 분석이 실행됩니다.",
                    "uploaded_path": str(save_path),
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

        saved_meta = load_session_meta(JSON_DIR, session_id)
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

        save_json_file(session_json_dir / "pipeline_result.json", final_result)

        db_recommendation = build_db_recommendation(final_result["style_recommendation"])
        db_body_data = dict(final_result["body_metrics"])
        db_body_data["body_type"] = final_result["body_analysis"]["body_type"]

        db_result = save_analysis_to_db(
            session_id=session_id,
            body_data=db_body_data,
            recommendation=db_recommendation,
            fitting_image_path=None,
        )

        return JSONResponse(
            {
                "status": "analysis_complete",
                "session_id": session_id,
                "front_image": str(front_path),
                "side_image": str(side_path),
                "json_files": {
                    "front_json": str(session_json_dir / "front.json"),
                    "side_json": str(session_json_dir / "side.json"),
                    "body_result_json": str(session_json_dir / "body_result.json"),
                    "pipeline_result_json": str(session_json_dir / "pipeline_result.json"),
                    "request_meta_json": str(session_json_dir / "request_meta.json"),
                },
                "analyzer_result": analyzer_result,
                "result": final_result,
                "db": db_result,
                "message": "체형 분석, 추천 결과 생성, DB 저장이 완료되었습니다.",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


# =========================================================
# 4) Outfit 생성
# =========================================================
@app.post("/outfit/{session_id}")
def create_outfit(session_id: str):
    try:
        session_id = session_id.strip()

        session_json_dir = JSON_DIR / session_id
        body_result_path = session_json_dir / "body_result.json"
        pipeline_result_path = session_json_dir / "pipeline_result.json"

        if not body_result_path.exists() and not pipeline_result_path.exists():
            raise HTTPException(
                status_code=400,
                detail="체형 분석 결과가 없습니다. 먼저 /upload-image로 front/side 분석을 완료하세요.",
            )

        # 의류 파일 존재 확인
        top_path = find_clothes_file(CLOTHES_DIR, "top")
        bottom_path = find_clothes_file(CLOTHES_DIR, "bottom")

        outfit_result = create_outfit_by_session(
            session_id=session_id,
            json_dir=JSON_DIR,
            clothes_dir=CLOTHES_DIR,
            outfit_dir=OUTFIT_DIR,
        )

        pipeline_result = {}
        if pipeline_result_path.exists():
            pipeline_result = load_json_file(pipeline_result_path)

        body_data = pipeline_result.get("body_metrics", {})
        style_recommendation = pipeline_result.get("style_recommendation", {})

        db_recommendation = build_db_recommendation(style_recommendation)
        db_body_data = dict(body_data)
        if pipeline_result.get("body_analysis"):
            db_body_data["body_type"] = pipeline_result["body_analysis"].get("body_type")

        outfit_image_path = outfit_result.get("output", {}).get("outfit_result_image")

        if db_body_data:
            db_result = save_analysis_to_db(
                session_id=session_id,
                body_data=db_body_data,
                recommendation=db_recommendation,
                fitting_image_path=outfit_image_path,
            )
        else:
            db_result = {
                "db_saved": False,
                "error": "body_data 없음",
            }

        return JSONResponse(
            {
                "status": "success",
                "session_id": session_id,
                "message": "체형 기반 의류 조합 결과 생성 완료",
                "top_image": str(top_path),
                "bottom_image": str(bottom_path),
                "result": outfit_result,
                "db": db_result,
            }
        )

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Outfit 생성 실패: {str(e)}")


# =========================================================
# 5) 세션 결과 조회
# =========================================================
@app.get("/result/{session_id}")
def get_result(session_id: str):
    try:
        session_id = session_id.strip()
        session_json_dir = JSON_DIR / session_id

        body_result_path = session_json_dir / "body_result.json"
        pipeline_result_path = session_json_dir / "pipeline_result.json"
        front_json_path = session_json_dir / "front.json"
        side_json_path = session_json_dir / "side.json"
        request_meta_path = session_json_dir / "request_meta.json"

        outfit_session_dir = OUTFIT_DIR / session_id
        outfit_image_path = outfit_session_dir / "outfit_result.png"
        outfit_json_path = outfit_session_dir / "outfit_result.json"

        if not body_result_path.exists() and not pipeline_result_path.exists():
            raise HTTPException(
                status_code=404,
                detail="분석 결과가 없습니다.",
            )

        body_result = load_json_file(body_result_path) if body_result_path.exists() else None
        pipeline_result = load_json_file(pipeline_result_path) if pipeline_result_path.exists() else None
        request_meta = load_json_file(request_meta_path) if request_meta_path.exists() else None

        try:
            top_file = str(find_clothes_file(CLOTHES_DIR, "top"))
        except Exception:
            top_file = None

        try:
            bottom_file = str(find_clothes_file(CLOTHES_DIR, "bottom"))
        except Exception:
            bottom_file = None

        return JSONResponse(
            {
                "status": "success",
                "session_id": session_id,
                "json_files": {
                    "front_json": str(front_json_path) if front_json_path.exists() else None,
                    "side_json": str(side_json_path) if side_json_path.exists() else None,
                    "body_result_json": str(body_result_path) if body_result_path.exists() else None,
                    "pipeline_result_json": str(pipeline_result_path) if pipeline_result_path.exists() else None,
                    "request_meta_json": str(request_meta_path) if request_meta_path.exists() else None,
                },
                "body_result": body_result,
                "pipeline_result": pipeline_result,
                "request_meta": request_meta,
                "clothes": {
                    "top": top_file,
                    "bottom": bottom_file,
                },
                "outfit": {
                    "outfit_result_image": str(outfit_image_path) if outfit_image_path.exists() else None,
                    "outfit_result_json": str(outfit_json_path) if outfit_json_path.exists() else None,
                },
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"결과 조회 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )