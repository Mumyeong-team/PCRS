from pathlib import Path
import json
from typing import Any, Dict, List, Tuple
from io import BytesIO

from PIL import Image
from rembg import remove


BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "data" / "uploads"
JSON_DIR = BASE_DIR / "data" / "json"
CLOTHES_DIR = BASE_DIR / "data" / "clothes"
OUTFIT_DIR = BASE_DIR / "data" / "outfit"


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))


def load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"JSON 파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_landmarks(front_data: Any) -> List[Dict[str, float]]:
    if isinstance(front_data, list):
        return front_data

    if isinstance(front_data, dict):
        if "landmarks" in front_data and isinstance(front_data["landmarks"], list):
            return front_data["landmarks"]

        if "pose_landmarks" in front_data and isinstance(front_data["pose_landmarks"], list):
            return front_data["pose_landmarks"]

        if "result" in front_data and isinstance(front_data["result"], dict):
            result = front_data["result"]
            if "landmarks" in result and isinstance(result["landmarks"], list):
                return result["landmarks"]

    raise ValueError("front.json에서 landmarks 데이터를 찾을 수 없습니다.")


def get_body_result_data(body_data: Dict[str, Any]) -> Dict[str, Any]:
    if "result" in body_data and isinstance(body_data["result"], dict):
        return body_data["result"]

    return body_data


def get_landmark_point(
    landmarks: List[Dict[str, float]],
    idx: int,
    image_width: int,
    image_height: int,
) -> Tuple[int, int]:
    lm = landmarks[idx]
    x = int(float(lm["x"]) * image_width)
    y = int(float(lm["y"]) * image_height)

    return x, y


def trim_transparent(img: Image.Image) -> Image.Image:
    """
    투명 여백 제거
    """
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()

    if bbox:
        return img.crop(bbox)

    return img


def remove_background_with_rembg(path: Path) -> Image.Image:
    """
    rembg를 사용해서 의류 이미지 배경 제거.
    흰 배경, 컬러 배경, 단색 배경을 기존 색상 기준 제거보다 더 잘 처리함.
    """
    if not path.exists():
        raise FileNotFoundError(f"의류 이미지가 없습니다: {path}")

    with open(path, "rb") as f:
        input_bytes = f.read()

    output_bytes = remove(input_bytes)

    img = Image.open(BytesIO(output_bytes)).convert("RGBA")
    img = trim_transparent(img)

    return img


def remove_bright_background(img: Image.Image, threshold: int = 240) -> Image.Image:
    """
    rembg 이후에도 남는 밝은 배경을 보조적으로 제거.
    """
    img = img.convert("RGBA")
    pixels = img.load()

    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]

            if a == 0:
                continue

            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (255, 255, 255, 0)

    return img


def prepare_clothes_image(path: Path) -> Image.Image:
    """
    의류 이미지에서 배경을 제거하고 옷 부분만 남김.
    """
    img = remove_background_with_rembg(path)

    # 혹시 남은 흰 배경 제거
    img = remove_bright_background(img, threshold=240)

    # 투명 여백 제거
    img = trim_transparent(img)

    return img


def paste_item(
    canvas: Image.Image,
    item_img: Image.Image,
    x: int,
    y: int,
    w: int,
    h: int,
    keep_ratio: bool = True,
) -> Dict[str, int]:
    """
    keep_ratio=True  : 원본 비율 유지
    keep_ratio=False : 지정한 w, h로 강제 리사이즈
    """
    item_img = trim_transparent(item_img)

    if keep_ratio:
        src_w, src_h = item_img.size

        if src_w == 0 or src_h == 0:
            raise ValueError("이미지 크기가 올바르지 않습니다.")

        scale = min(w / src_w, h / src_h)

        new_w = max(1, int(src_w * scale))
        new_h = max(1, int(src_h * scale))
    else:
        new_w = max(1, int(w))
        new_h = max(1, int(h))

    resized = item_img.resize((new_w, new_h), Image.LANCZOS)
    canvas.alpha_composite(resized, (x, y))

    return {
        "x": x,
        "y": y,
        "width": new_w,
        "height": new_h,
    }


def build_body_metrics(
    landmarks: List[Dict[str, float]],
    image_width: int,
    image_height: int,
    body_result: Dict[str, Any],
) -> Dict[str, Any]:
    left_shoulder = get_landmark_point(landmarks, 11, image_width, image_height)
    right_shoulder = get_landmark_point(landmarks, 12, image_width, image_height)
    left_hip = get_landmark_point(landmarks, 23, image_width, image_height)
    right_hip = get_landmark_point(landmarks, 24, image_width, image_height)
    left_ankle = get_landmark_point(landmarks, 27, image_width, image_height)
    right_ankle = get_landmark_point(landmarks, 28, image_width, image_height)

    shoulder_width_px = abs(right_shoulder[0] - left_shoulder[0])
    hip_width_px = abs(right_hip[0] - left_hip[0])

    shoulder_y = min(left_shoulder[1], right_shoulder[1])
    hip_y = int((left_hip[1] + right_hip[1]) / 2)
    ankle_y = max(left_ankle[1], right_ankle[1])

    torso_height_px = max(1, hip_y - shoulder_y)
    leg_height_px = max(1, ankle_y - hip_y)

    shoulder_width_norm = shoulder_width_px / image_width
    hip_width_norm = hip_width_px / image_width
    torso_height_norm = torso_height_px / image_height
    leg_height_norm = leg_height_px / image_height

    lengths = body_result.get("lengths", {})
    ratios = body_result.get("ratios", {})

    return {
        "image_size": {
            "width": image_width,
            "height": image_height,
        },
        "points": {
            "left_shoulder": left_shoulder,
            "right_shoulder": right_shoulder,
            "left_hip": left_hip,
            "right_hip": right_hip,
            "left_ankle": left_ankle,
            "right_ankle": right_ankle,
        },
        "measured_pixels": {
            "shoulder_width": shoulder_width_px,
            "hip_width": hip_width_px,
            "torso_height": torso_height_px,
            "leg_height": leg_height_px,
        },
        "normalized": {
            "shoulder_width": shoulder_width_norm,
            "hip_width": hip_width_norm,
            "torso_height": torso_height_norm,
            "leg_height": leg_height_norm,
        },
        "body_lengths": lengths,
        "body_ratios": ratios,
    }


def calculate_render_sizes(
    metrics: Dict[str, Any],
    canvas_w: int,
    canvas_h: int,
) -> Dict[str, int]:
    norm = metrics["normalized"]
    ratios = metrics.get("body_ratios", {})

    shoulder_norm = float(norm["shoulder_width"])
    hip_norm = float(norm["hip_width"])
    torso_norm = float(norm["torso_height"])
    leg_norm = float(norm["leg_height"])

    shoulder_waist_ratio = float(ratios.get("shoulder_waist_ratio", 1.0))
    upper_lower_ratio = float(ratios.get("upper_lower_ratio", 1.0))

    # =============================
    # 상의 크기 계산
    # =============================
    top_w_ratio = clamp(shoulder_norm * 2.05, 0.40, 0.62)
    top_h_ratio = clamp(torso_norm * 1.25, 0.22, 0.34)

    if shoulder_waist_ratio >= 1.25:
        top_w_ratio *= 1.05

    if upper_lower_ratio > 1.0:
        top_h_ratio *= 1.05

    top_w = int(canvas_w * top_w_ratio)
    top_h = int(canvas_h * top_h_ratio)

    # =============================
    # 하의 크기 계산
    # =============================
    bottom_w_ratio = clamp(hip_norm * 1.75, 0.28, 0.40)
    bottom_h_ratio = clamp(leg_norm * 1.08, 0.34, 0.55)

    if hip_norm > shoulder_norm * 0.9:
        bottom_w_ratio *= 1.04

    if upper_lower_ratio < 0.85:
        bottom_h_ratio *= 1.04

    bottom_w = int(canvas_w * bottom_w_ratio)
    bottom_h = int(canvas_h * bottom_h_ratio)

    center_x = canvas_w // 2

    top_x = center_x - top_w // 2
    top_y = int(canvas_h * 0.08)

    # 상의와 하의가 자연스럽게 겹치도록 조정
    overlap = int(top_h * 0.36)

    bottom_x = center_x - bottom_w // 2
    bottom_y = top_y + top_h - overlap

    # 전체가 너무 아래로 내려가면 위로 이동
    total_bottom = bottom_y + bottom_h
    bottom_margin = 90

    if total_bottom > canvas_h - bottom_margin:
        move_up = total_bottom - (canvas_h - bottom_margin)
        top_y -= move_up
        bottom_y -= move_up

    return {
        "canvas_width": canvas_w,
        "canvas_height": canvas_h,
        "top_x": top_x,
        "top_y": top_y,
        "top_w": top_w,
        "top_h": top_h,
        "bottom_x": bottom_x,
        "bottom_y": bottom_y,
        "bottom_w": bottom_w,
        "bottom_h": bottom_h,
        "overlap": overlap,
    }


def create_outfit_by_session(session_id: str) -> Dict[str, Any]:
    front_image_path = UPLOAD_DIR / session_id / "front.jpg"
    front_json_path = JSON_DIR / session_id / "front.json"
    body_result_path = JSON_DIR / session_id / "body_result.json"

    top_path = CLOTHES_DIR / "top.png"
    bottom_path = CLOTHES_DIR / "bottom.png"

    if not front_image_path.exists():
        raise FileNotFoundError(f"front 이미지가 없습니다: {front_image_path}")

    if not front_json_path.exists():
        raise FileNotFoundError(f"front.json 파일이 없습니다: {front_json_path}")

    if not body_result_path.exists():
        raise FileNotFoundError(f"body_result.json 파일이 없습니다: {body_result_path}")

    if not top_path.exists():
        raise FileNotFoundError(f"상의 이미지가 없습니다: {top_path}")

    if not bottom_path.exists():
        raise FileNotFoundError(f"하의 이미지가 없습니다: {bottom_path}")

    front_img = Image.open(front_image_path).convert("RGB")
    image_width, image_height = front_img.size

    front_data = load_json(front_json_path)
    body_data_raw = load_json(body_result_path)

    landmarks = extract_landmarks(front_data)
    body_result = get_body_result_data(body_data_raw)

    metrics = build_body_metrics(
        landmarks=landmarks,
        image_width=image_width,
        image_height=image_height,
        body_result=body_result,
    )

    canvas_w = 900
    canvas_h = 1400

    render = calculate_render_sizes(metrics, canvas_w, canvas_h)

    top_img = prepare_clothes_image(top_path)
    bottom_img = prepare_clothes_image(bottom_path)

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (245, 245, 245, 255))

    # 하의 먼저 붙이기
    bottom_box = paste_item(
        canvas=canvas,
        item_img=bottom_img,
        x=render["bottom_x"],
        y=render["bottom_y"],
        w=render["bottom_w"],
        h=render["bottom_h"],
        keep_ratio=False,
    )

    # 상의 나중에 붙이기
    top_box = paste_item(
        canvas=canvas,
        item_img=top_img,
        x=render["top_x"],
        y=render["top_y"],
        w=render["top_w"],
        h=render["top_h"],
        keep_ratio=True,
    )

    output_dir = OUTFIT_DIR / session_id
    output_dir.mkdir(parents=True, exist_ok=True)

    output_image_path = output_dir / "outfit_result.png"
    output_json_path = output_dir / "outfit_result.json"

    canvas.save(output_image_path)

    result = {
        "session_id": session_id,
        "message": "체형 기반 2D 의류 조합 생성 완료",
        "input": {
            "front_image": str(front_image_path),
            "front_json": str(front_json_path),
            "body_result_json": str(body_result_path),
            "top_image": str(top_path),
            "bottom_image": str(bottom_path),
        },
        "body_metrics": metrics,
        "render": render,
        "layout": {
            "top": top_box,
            "bottom": bottom_box,
        },
        "output": {
            "outfit_result_image": str(output_image_path),
            "outfit_result_json": str(output_json_path),
        },
    }

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return result
