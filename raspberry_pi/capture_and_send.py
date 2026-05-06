import argparse
import pathlib
import subprocess
import sys
import time

import requests


def capture_image(output_path: pathlib.Path, preview_time: int) -> None:
    cmd = [
        "rpicam-still",
        "-o", str(output_path),
        "-t", str(preview_time * 1000),
        "--width", "1280",
        "--height", "720",
        "--qt-preview",
    ]

    subprocess.run(cmd, check=True)


def send_image(server_url: str, session_id: str, image_type: str, image_path: pathlib.Path) -> None:
    with image_path.open("rb") as f:
        files = {"file": (image_path.name, f, "image/jpeg")}
        data = {
            "session_id": session_id,
            "image_type": image_type,
        }

        response = requests.post(
            f"{server_url}/upload-image",
            data=data,
            files=files,
            timeout=120,
        )

        response.raise_for_status()

    print(f"\n[서버 응답 - {image_type}]")
    print(response.text)


def capture_and_send(
    server_url: str,
    session_id: str,
    image_type: str,
    output_dir: pathlib.Path,
    preview_time: int,
) -> None:
    output_path = output_dir / f"{image_type}.jpg"

    print(f"\n[1] {image_type} 카메라 화면 표시 중...")
    print(f"{preview_time}초 후 자동 촬영됩니다.")

    capture_image(output_path, preview_time)

    print(f"[2] {image_type} 사진 저장 완료: {output_path}")

    print(f"[3] {image_type} 서버로 전송 중...")
    send_image(server_url, session_id, image_type, output_path)

    print(f"[완료] {image_type} 전송 완료")


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--server",
        default="http://192.168.200.101:8000",
    )

    parser.add_argument(
        "--session",
        default="pi_test001",
    )

    parser.add_argument(
        "--preview-time",
        type=int,
        default=30,
    )

    parser.add_argument(
        "--delay",
        type=int,
        default=10,
    )

    args = parser.parse_args()

    output_dir = pathlib.Path("captures")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("===================================")
    print("PCRS 자동 촬영/전송 시작")
    print("===================================")

    # front
    print("\n정면(front) 촬영")
    capture_and_send(
        args.server,
        args.session,
        "front",
        output_dir,
        args.preview_time,
    )

    # delay
    print(f"\n{args.delay}초 후 측면 촬영")
    for i in range(args.delay, 0, -1):
        print(f"{i}...")
        time.sleep(1)

    # side
    print("\n측면(side) 촬영")
    capture_and_send(
        args.server,
        args.session,
        "side",
        output_dir,
        args.preview_time,
    )

    print("\n===================================")
    print("모든 촬영 및 전송 완료")
    print("===================================")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n오류: {e}", file=sys.stderr)
        sys.exit(1)
