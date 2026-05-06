import json
import traceback
import sys
import os
import mediapipe as mp
import pymysql

print("[DEBUG] PYTHON =", sys.executable)
print("[DEBUG] MEDIAPIPE =", mp.__file__)

p = os.path.join(
    os.path.dirname(mp.__file__),
    "modules",
    "pose_landmark",
    "pose_landmark_cpu.binarypb",
)
print("[DEBUG] BINARYPB =", p)
print("[DEBUG] EXISTS =", os.path.exists(p))

from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from server.analyzer import run_analysis

app = FastAPI(
    title="PCRS Body Analysis API",
    description="정면(front) / 측면(side) 이미지를 업로드하면 체형 분석 결과를 반환합니다.",
    version="0.1.0",
)

# =========================
# DB 연결 함수
# =========================
def get_db_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="dongyang",
        database="pcrs_db",
        charset="utf8mb4"
    )


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
JSON_DIR = BASE_DIR / "data" / "json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
JSON_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/")
def root():
    return {"message": "PCRS FastAPI server is running"}


@app.post("/upload-image")
async def upload_image(
    session_id: str = Form(...),
    image_type: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        print(f"[DEBUG] upload start: session_id={session_id}, image_type={image_type}")

        if image_type not in {"front", "side"}:
            raise HTTPException(status_code=400, detail="image_type은 front 또는 side 여야 합니다.")

        session_upload_dir = UPLOAD_DIR / session_id
        session_upload_dir.mkdir(parents=True, exist_ok=True)

        save_path = session_upload_dir / f"{image_type}.jpg"

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="업로드된 파일이 비어 있습니다.")

        save_path.write_bytes(content)

        front_path = session_upload_dir / "front.jpg"
        side_path = session_upload_dir / "side.jpg"

        if front_path.exists() and side_path.exists():
            session_json_dir = JSON_DIR / session_id
            session_json_dir.mkdir(parents=True, exist_ok=True)

            result = run_analysis(front_path, side_path, session_json_dir)

            conn = get_db_connection()
            cursor = conn.cursor()

            try:
                # 1. 세션 저장
                cursor.execute(
                    """
                    INSERT IGNORE INTO guest_session (session_id)
                    VALUES (%s)
                    """,
                    (session_id,)
                )

                # 2. 체형 분석 결과 저장
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
                        result["lengths"]["shoulder_width"],
                        result["lengths"]["waist_width"],
                        result["lengths"]["upper_body_length"],
                        result["lengths"]["lower_body_length"],
                        result["lengths"]["arm_length"],
                        result["ratios"]["upper_lower_ratio"],
                        result["ratios"]["shoulder_waist_ratio"],
                        result["body_type"],
                    ),
                )

                analysis_id = cursor.lastrowid

                # 3. 추천 결과 저장
                body_type = result["body_type"]

                if body_type == "상체형":
                    recommended_style = "오버핏 상의 + 스트레이트 팬츠"
                    recommendation_reason = "어깨와 상체 비율이 강조되어 보일 수 있으므로 하체 라인을 안정적으로 잡아주는 스타일을 추천합니다."
                elif body_type == "하체형":
                    recommended_style = "밝은 상의 + 와이드 팬츠"
                    recommendation_reason = "하체 비율이 강조되어 보일 수 있으므로 상체에 시선을 분산시키는 스타일을 추천합니다."
                else:
                    recommended_style = "미니멀 상의 + 기본핏 팬츠"
                    recommendation_reason = "상하체 비율이 균형적이므로 과한 보정보다는 깔끔한 기본 스타일을 추천합니다."

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
                        recommended_style,
                        recommendation_reason,
                    ),
                )

                conn.commit()

            except Exception:
                traceback.print_exc()
                conn.rollback()
                raise HTTPException(status_code=500, detail="DB 저장 실패")

            finally:
                cursor.close()
                conn.close()

            return JSONResponse(
                {
                    "status": "analysis_complete",
                    "session_id": session_id,
                    "result": result,
                    "recommendation": {
                        "recommended_style": recommended_style,
                        "recommendation_reason": recommendation_reason,
                    },
                }
            )

        return JSONResponse(
            {
                "status": "uploaded",
                "session_id": session_id,
                "message": f"{image_type}.jpg 업로드 완료. 나머지 이미지 업로드 대기 중",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/result/{session_id}")
def get_result(session_id: str):
    result_path = JSON_DIR / session_id / "body_result.json"

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="결과 없음")

    with result_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    return JSONResponse(
        {
            "status": "success",
            "session_id": session_id,
            "result": data,
        }
    )
