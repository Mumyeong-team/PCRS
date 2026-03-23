import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import "./capture.css";

function Capture() {
  const nav = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { capturedImage, setCapturedImage } = useApp();

  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [isCounting, setIsCounting] = useState(false);

  useEffect(() => {
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setError("");
    } catch (err) {
      console.error(err);
      setError("카메라를 사용할 수 없습니다. 브라우저 권한을 확인해주세요.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/png");
    setCapturedImage(imageData);
  };

  const startTimerCapture = () => {
    if (isCounting) return;
    if (error) return;

    let time = 10;
    setCountdown(time);
    setIsCounting(true);

    const timer = setInterval(() => {
      time -= 1;

      if (time <= 0) {
        clearInterval(timer);
        setCountdown(null);
        setIsCounting(false);
        capturePhoto();
      } else {
        setCountdown(time);
      }
    }, 1000);
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setCountdown(null);
    setIsCounting(false);
  };

  const goToServices = () => {
    nav("/services");
  };

  return (
    <div className="capture-page">
      <div className="capture-browser">
        <div className="capture-browser-bar">
          <div className="capture-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="capture-address">FashionPeople / Capture</div>
        </div>

        <div className="capture-stage">
          <button className="capture-home-btn" onClick={() => nav("/")}>
            ← 홈으로
          </button>

          <div className="capture-bg shape-pink"></div>
          <div className="capture-bg shape-blue"></div>
          <div className="capture-bg shape-number one">1</div>
          <div className="capture-bg shape-number two">1</div>

          <div className="capture-center-box">
            <div className="capture-inner-frame">
              <div className="capture-camera-area">
                {error ? (
                  <div className="camera-error-box">{error}</div>
                ) : capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="촬영 결과"
                    className="captured-preview"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-video"
                    />
                    {countdown !== null && (
                      <div className="countdown-overlay">{countdown}</div>
                    )}
                  </>
                )}
              </div>

              <div className="capture-bottom-panel"></div>
            </div>
          </div>

          <div className="capture-control-card glass-card">
            <button
              className="action-btn light-btn"
              onClick={startTimerCapture}
              disabled={isCounting}
            >
              {isCounting ? `촬영 준비 ${countdown}` : "촬영 시작"}
            </button>

            <button className="action-btn mint-btn" onClick={goToServices}>
              분석으로 이동
            </button>

            {capturedImage && (
              <button className="action-btn white-btn" onClick={resetCapture}>
                다시 촬영
              </button>
            )}
          </div>

          <div className="capture-guide-card glass-card">
            <h3>촬영 가이드</h3>
            <ul>
              <li>정면을 바라보고 서주세요</li>
              <li>상반신 또는 전신이 잘 보이게 촬영하세요</li>
              <li>촬영 버튼을 누르면 10초 후 자동 촬영됩니다</li>
            </ul>
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}

export default Capture;