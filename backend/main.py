import json
import traceback
import sys
import os
from pathlib import Path
from typing import Optional

import mediapipe as mp
import pymysql

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from server.analyzer import run_analysis
from server.outfit_renderer import create_outfit_by_session


# =========================================================
# DEBUG
# =========================================================
print("[DEBUG] PYTHON =", sys.executable)
print("[DEBUG] MEDIAPIPE =", mp.__file__)

POSE_BINARY_PATH = os.path.join(
    os.path.dirname(mp.__file__),
    "modules",
    "pose_landmark",
    "pose_landmark_cpu.binarypb",
)

print("[DEBUG] BINARYPB =", POSE_BINARY_PATH)
print("[DEBUG] EXISTS =", os.path.exists(POSE_BINARY_PATH))


# =========================================================
# FastAPI 앱 생성
# =========================================================
app = FastAPI(
    title="PCRS Integrated API",
    description="Raspberry Pi 이미지 업로드, 체형 분석, JSON 생성, DB 저장, 2D 의류 조합 기능을 제공하는 통합 서버",
    version="1.0.0",
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
BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "data" / "uploads"
JSON_DIR = BASE_DIR / "data" / "json"
CLOTHES_DIR = BASE_DIR / "data" / "clothes"
OUTFIT_DIR = BASE_DIR / "data" / "outfit"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
JSON_DIR.mkdir(parents=True, exist_ok=True)
CLOTHES_DIR.mkdir(parents=True, exist_ok=True)
OUTFIT_DIR.mkdir(parents=True, exist_ok=True)


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
    hip_width: Optional[float] = None
    arm_length: float
    upper_body_length: float
    lower_body_length: float
    leg_length_avg: Optional[float] = None
    upper_lower_ratio: float
    shoulder_waist_ratio: float


class AnalyzeRequest(BaseModel):
    user_input: UserInput
    body_data: BodyData


# =========================================================
# DB 연결
# =========================================================
def get_db_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="dongyang",
        database="pcrs_db",
        charset="utf8mb4",
    )


# =========================================================
# 공통 유틸
# =========================================================
def save_json_file(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json_file(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"파일이 없습니다: {path}")

    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def find_clothes_file(clothing_type: str) -> Path:
    candidates = [
        CLOTHES_DIR / f"{clothing_type}.png",
        CLOTHES_DIR / f"{clothing_type}.jpg",
        CLOTHES_DIR / f"{clothing_type}.jpeg",
    ]

    for path in candidates:
        if path.exists():
            return path

    raise HTTPException(
        status_code=400,
        detail=f"{clothing_type} 의류 이미지가 없습니다. /upload-clothes에서 업로드하세요.",
    )


def extract_body_metrics(analyzer_result: dict) -> dict:
    """
    analyzer.py 결과 형태가 두 가지여도 대응:
    1) result["lengths"], result["ratios"] 구조
    2) result["shoulder_width"] 같은 flat 구조
    """

    if "lengths" in analyzer_result and "ratios" in analyzer_result:
        lengths = analyzer_result.get("lengths", {})
        ratios = analyzer_result.get("ratios", {})

        return {
            "shoulder_width": float(lengths.get("shoulder_width", 0)),
            "waist_width": float(lengths.get("waist_width", 0)),
            "hip_width": float(lengths.get("hip_width", 0)),
            "arm_length": float(lengths.get("arm_length", 0)),
            "upper_body_length": float(lengths.get("upper_body_length", 0)),
            "lower_body_length": float(lengths.get("lower_body_length", 0)),
            "leg_length_avg": float(lengths.get("leg_length_avg", lengths.get("lower_body_length", 0))),
            "upper_lower_ratio": float(ratios.get("upper_lower_ratio", 0)),
            "shoulder_waist_ratio": float(ratios.get("shoulder_waist_ratio", 0)),
            "body_type": analyzer_result.get("body_type", "미분류"),
        }

    return {
        "shoulder_width": float(analyzer_result.get("shoulder_width", 0)),
        "waist_width": float(analyzer_result.get("waist_width", 0)),
        "hip_width": float(analyzer_result.get("hip_width", 0)),
        "arm_length": float(analyzer_result.get("arm_length", 0)),
        "upper_body_length": float(analyzer_result.get("upper_body_length", 0)),
        "lower_body_length": float(analyzer_result.get("lower_body_length", 0)),
        "leg_length_avg": float(
            analyzer_result.get(
                "leg_length_avg",
                analyzer_result.get("lower_body_length", 0),
            )
        ),
        "upper_lower_ratio": float(analyzer_result.get("upper_lower_ratio", 0)),
        "shoulder_waist_ratio": float(analyzer_result.get("shoulder_waist_ratio", 0)),
        "body_type": analyzer_result.get("body_type", "미분류"),
    }


def make_body_type(metrics: dict) -> str:
    shoulder_waist_ratio = metrics.get("shoulder_waist_ratio", 0)
    upper_lower_ratio = metrics.get("upper_lower_ratio", 0)

    if shoulder_waist_ratio >= 1.2:
        return "상체형"

    if upper_lower_ratio >= 1.05:
        return "상체긴형"

    if upper_lower_ratio <= 0.9:
        return "하체긴형"

    return "균형형"


def make_recommendation(body_type: str) -> dict:
    if body_type == "상체형":
        return {
            "recommended_style": "오버핏 상의 + 스트레이트 팬츠",
            "recommendation_reason": "상체 비율이 강조되어 보일 수 있으므로 하체 라인을 안정적으로 잡아주는 스타일을 추천합니다.",
        }

    if body_type == "하체긴형":
        return {
            "recommended_style": "크롭 상의 + 와이드 팬츠",
            "recommendation_reason": "하체 비율이 길어 보이는 체형이므로 상체 포인트를 주는 스타일을 추천합니다.",
        }

    if body_type == "상체긴형":
        return {
            "recommended_style": "기본핏 상의 + 하이웨스트 팬츠",
            "recommendation_reason": "상체가 길어 보일 수 있으므로 허리선을 높여 비율을 보정하는 스타일을 추천합니다.",
        }

    return {
        "recommended_style": "미니멀 상의 + 기본핏 팬츠",
        "recommendation_reason": "상하체 비율이 균형적이므로 깔끔한 기본 스타일을 추천합니다.",
    }


def build_pipeline_result(user_input: dict, body_data: dict) -> dict:
    body_type = body_data.get("body_type")

    if not body_type or body_type == "미분류":
        body_type = make_body_type(body_data)

    recommendation = make_recommendation(body_type)

    return {
        "body_analysis": {
            "gender": user_input.get("gender", "unspecified"),
            "body_type": body_type,
            "upper_lower_ratio": body_data.get("upper_lower_ratio"),
            "shoulder_waist_ratio": body_data.get("shoulder_waist_ratio"),
        },
        "body_metrics": body_data,
        "style_recommendation": recommendation,
        "user_input": user_input,
    }


def save_analysis_to_db(session_id: str, body_data: dict, recommendation: dict, fitting_image_path=None):
    """
    DB 테이블이 없거나 팀원 DB 구조가 다르면 서버 전체가 터지지 않도록
    실패해도 경고만 출력하고 넘어가게 처리.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT IGNORE INTO guest_session (session_id)
            VALUES (%s)
            """,
            (session_id,),
        )

        cursor.execute(
            """
            INSERT INTO body_analysis (
                session_id,
                shoulder_width,
                waist_width,
                upper_body_length,
                lower_body_length,
                arm_length,
                upper_lower_ratio,
                shoulder_waist_ratio,
                body_type
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                session_id,
                body_data.get("shoulder_width"),
                body_data.get("waist_width"),
                body_data.get("upper_body_length"),
                body_data.get("lower_body_length"),
                body_data.get("arm_length"),
                body_data.get("upper_lower_ratio"),
                body_data.get("shoulder_waist_ratio"),
                body_data.get("body_type"),
            ),
        )

        analysis_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO recommendation_result (
                session_id,
                analysis_id,
                recommended_style,
                recommendation_reason
            ) VALUES (%s,%s,%s,%s)
            """,
            (
                session_id,
                analysis_id,
                recommendation.get("recommended_style"),
                recommendation.get("recommendation_reason"),
            ),
        )

        recommendation_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO fitting_result (
                session_id,
                recommendation_id,
                composite_image_path,
                avatar_3d_path,
                fitting_status
            ) VALUES (%s,%s,%s,%s,%s)
            """,
            (
                session_id,
                recommendation_id,
                str(fitting_image_path) if fitting_image_path else None,
                None,
                "COMPLETE" if fitting_image_path else "ANALYSIS_COMPLETE",
            ),
        )

        conn.commit()

        cursor.close()
        conn.close()

        return {
            "db_saved": True,
            "analysis_id": analysis_id,
            "recommendation_id": recommendation_id,
        }

    except Exception as e:
        print("[WARN] DB 저장 실패. 서버 동작은 계속 진행합니다.")
        print("[WARN]", str(e))
        traceback.print_exc()

        return {
            "db_saved": False,
            "error": str(e),
        }


# =========================================================
# 기본 엔드포인트
# =========================================================
@app.get("/")
def root():
    return {
        "service": "PCRS Integrated API",
        "status": "running",
        "docs": "http://localhost:8000/docs",
        "base_dir": str(BASE_DIR),
        "upload_dir": str(UPLOAD_DIR),
        "json_dir": str(JSON_DIR),
        "clothes_dir": str(CLOTHES_DIR),
        "outfit_dir": str(OUTFIT_DIR),
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


# =========================================================
# JSON 직접 분석
# =========================================================
@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    try:
        user_input = request.user_input.model_dump()
        body_data = request.body_data.model_dump()

        if body_data.get("body_type") is None:
            body_data["body_type"] = make_body_type(body_data)

        result = build_pipeline_result(user_input, body_data)

        return JSONResponse(
            {
                "status": "success",
                "result": result,
            }
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"분석 실패: {str(e)}",
        )


# =========================================================
# 의류 업로드
# =========================================================
@app.post("/upload-clothes")
async def upload_clothes(
    clothing_type: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        clothing_type = clothing_type.strip().lower()

        if clothing_type not in ["top", "bottom"]:
            raise HTTPException(
                status_code=400,
                detail="clothing_type 값은 반드시 top 또는 bottom 이어야 합니다.",
            )

        if file.filename is None or file.filename == "":
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

        old_files = [
            CLOTHES_DIR / f"{clothing_type}.png",
            CLOTHES_DIR / f"{clothing_type}.jpg",
            CLOTHES_DIR / f"{clothing_type}.jpeg",
        ]

        for old_file in old_files:
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

        print(f"[DEBUG] clothes uploaded: {clothing_type} -> {save_path}")

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
        raise HTTPException(
            status_code=500,
            detail=f"의류 업로드 실패: {str(e)}",
        )


# =========================================================
# 라즈베리파이 이미지 업로드 + 자동 분석
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
):
    try:
        session_id = session_id.strip()
        image_type = image_type.strip().lower()

        print(f"[DEBUG] upload start: session_id={session_id}, image_type={image_type}")

        if image_type not in ["front", "side"]:
            raise HTTPException(
                status_code=400,
                detail="image_type은 front 또는 side 여야 합니다.",
            )

        if file.filename is None or file.filename == "":
            raise HTTPException(
                status_code=400,
                detail="파일 이름이 없습니다.",
            )

        session_upload_dir = UPLOAD_DIR / session_id
        session_upload_dir.mkdir(parents=True, exist_ok=True)

        session_json_dir = JSON_DIR / session_id
        session_json_dir.mkdir(parents=True, exist_ok=True)

        save_path = session_upload_dir / f"{image_type}.jpg"

        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="업로드된 파일이 비어 있습니다.",
            )

        save_path.write_bytes(content)

        print(f"[DEBUG] saved image: {save_path}")

        request_meta = {
            "gender": gender,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "top_size": top_size,
            "bottom_size": bottom_size,
            "preferred_fit": preferred_fit,
            "preferred_style": preferred_style,
        }

        save_json_file(session_json_dir / "request_meta.json", request_meta)

        front_path = session_upload_dir / "front.jpg"
        side_path = session_upload_dir / "side.jpg"

        if not front_path.exists() or not side_path.exists():
            return JSONResponse(
                {
                    "status": "uploaded",
                    "session_id": session_id,
                    "message": f"{image_type}.jpg 업로드 완료. front/side 두 장이 모두 업로드되면 분석이 실행됩니다.",
                    "uploaded_path": str(save_path),
                }
            )

        print("[DEBUG] run_analysis start")
        analyzer_result = run_analysis(front_path, side_path, session_json_dir)
        print("[DEBUG] run_analysis complete")

        body_data = extract_body_metrics(analyzer_result)

        if not body_data.get("body_type") or body_data.get("body_type") == "미분류":
            body_data["body_type"] = make_body_type(body_data)

        pipeline_result = build_pipeline_result(request_meta, body_data)

        save_json_file(session_json_dir / "pipeline_result.json", pipeline_result)

        db_result = save_analysis_to_db(
            session_id=session_id,
            body_data=body_data,
            recommendation=pipeline_result["style_recommendation"],
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
                },
                "analyzer_result": analyzer_result,
                "result": pipeline_result,
                "db": db_result,
                "message": "체형 분석, JSON 생성, 추천 결과 생성이 완료되었습니다.",
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"서버 오류: {str(e)}",
        )


# =========================================================
# 2D 의류 조합 생성
# =========================================================
@app.post("/outfit/{session_id}")
def create_outfit(session_id: str):
    try:
        session_id = session_id.strip()

        body_result_path = JSON_DIR / session_id / "body_result.json"
        pipeline_result_path = JSON_DIR / session_id / "pipeline_result.json"

        if not body_result_path.exists() and not pipeline_result_path.exists():
            raise HTTPException(
                status_code=400,
                detail="체형 분석 결과가 없습니다. 먼저 /upload-image로 front/side 분석을 완료하세요.",
            )

        top_path = find_clothes_file("top")
        bottom_path = find_clothes_file("bottom")

        print(f"[DEBUG] outfit start: session_id={session_id}")
        print(f"[DEBUG] top_path={top_path}")
        print(f"[DEBUG] bottom_path={bottom_path}")

        outfit_result = create_outfit_by_session(session_id)

        outfit_image_path = outfit_result.get("output", {}).get("outfit_result_image")

        body_data = {}

        if body_result_path.exists():
            body_raw = load_json_file(body_result_path)
            body_data = extract_body_metrics(body_raw)
        elif pipeline_result_path.exists():
            pipeline_raw = load_json_file(pipeline_result_path)
            body_data = pipeline_raw.get("body_metrics", {})

        if body_data:
            if not body_data.get("body_type"):
                body_data["body_type"] = make_body_type(body_data)

            recommendation = make_recommendation(body_data.get("body_type"))

            db_result = save_analysis_to_db(
                session_id=session_id,
                body_data=body_data,
                recommendation=recommendation,
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
                "message": "체형 기반 2D 의류 조합 이미지 생성 완료",
                "top_image": str(top_path),
                "bottom_image": str(bottom_path),
                "result": outfit_result,
                "db": db_result,
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"2D 의류 조합 생성 실패: {str(e)}",
        )


# =========================================================
# 세션 결과 조회
# =========================================================
@app.get("/result/{session_id}")
def get_result(session_id: str):
    session_id = session_id.strip()

    session_json_dir = JSON_DIR / session_id

    body_result_path = session_json_dir / "body_result.json"
    pipeline_result_path = session_json_dir / "pipeline_result.json"
    front_json_path = session_json_dir / "front.json"
    side_json_path = session_json_dir / "side.json"
    request_meta_path = session_json_dir / "request_meta.json"

    outfit_path = OUTFIT_DIR / session_id / "outfit_result.png"
    outfit_json_path = OUTFIT_DIR / session_id / "outfit_result.json"

    if not body_result_path.exists() and not pipeline_result_path.exists():
        raise HTTPException(
            status_code=404,
            detail="분석 결과가 없습니다.",
        )

    body_result = None
    pipeline_result = None
    request_meta = None

    if body_result_path.exists():
        body_result = load_json_file(body_result_path)

    if pipeline_result_path.exists():
        pipeline_result = load_json_file(pipeline_result_path)

    if request_meta_path.exists():
        request_meta = load_json_file(request_meta_path)

    top_file = None
    bottom_file = None

    try:
        top_file = str(find_clothes_file("top"))
    except Exception:
        top_file = None

    try:
        bottom_file = str(find_clothes_file("bottom"))
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
                "outfit_result_image": str(outfit_path) if outfit_path.exists() else None,
                "outfit_result_json": str(outfit_json_path) if outfit_json_path.exists() else None,
            },
        }
    )


# =========================================================
# 직접 실행용
# =========================================================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
