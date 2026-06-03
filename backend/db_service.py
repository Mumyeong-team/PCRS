import traceback
from typing import Optional

import pymysql


def get_db_connection():
    """
    MySQL 연결
    """
    return pymysql.connect(
        host="localhost",
        user="root",
        password="dongyang",
        database="pcrs_db",
        charset="utf8mb4",
    )


def save_analysis_to_db(
    session_id: str,
    body_data: dict,
    recommendation: dict,
    fitting_image_path: Optional[str] = None,
) -> dict:
    """
    분석 결과 / 추천 결과 / 피팅 결과 DB 저장

    실패해도 서버 전체는 계속 동작하도록
    예외 발생 시 warning만 출력하고 False 반환
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # guest_session
        cursor.execute(
            """
            INSERT IGNORE INTO guest_session (session_id)
            VALUES (%s)
            """,
            (session_id,),
        )

        # body_analysis
        cursor.execute(
            """
            INSERT INTO body_analysis (
                session_id,
                shoulder_width,
                waist_width,
                hip_width,
                upper_body_length,
                lower_body_length,
                arm_length,
                leg_length_avg,
                upper_lower_ratio,
                shoulder_waist_ratio,
                body_type
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                session_id,
                body_data.get("shoulder_width"),
                body_data.get("waist_width"),
                body_data.get("hip_width"),
                body_data.get("upper_body_length"),
                body_data.get("lower_body_length"),
                body_data.get("arm_length"),
                body_data.get("leg_length_avg"),
                body_data.get("upper_lower_ratio"),
                body_data.get("shoulder_waist_ratio"),
                body_data.get("body_type"),
            ),
        )

        analysis_id = cursor.lastrowid

        # recommendation_result
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

        # fitting_result
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
                fitting_image_path,
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