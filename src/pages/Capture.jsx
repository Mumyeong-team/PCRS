
// src/pages/Capture.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Capture() {
  const nav = useNavigate();
  const { setCapturedImage } = useApp();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [count, setCount] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("대기중"); // 대기중/촬영중/분석중

  useEffect(() => {
    let stream;
    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    })();
    return () => stream && stream.getTracks().forEach(t => t.stop());
  }, []);

  const shoot = () => {
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const img = c.toDataURL("image/jpeg");
    setPreview(img);
    setCapturedImage(img);
  };

  const startCountdown = async () => {
    setStatus("촬영중");
    for (let i = 3; i > 0; i--) {
      setCount(i); await new Promise(r => setTimeout(r, 700));
    }
    setCount(null);
    shoot();
  };

  return (
    <div className="page">
      <h2>촬영 모드</h2>
      <p>상태: {status}</p>

      <video ref={videoRef} className="video" />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {count && <h1>{count}</h1>}

      <div className="actions">
        <button onClick={startCountdown}>촬영 시작</button>
        <button disabled={!preview} onClick={() => nav("/services")}>
          분석으로 이동
        </button>
      </div>

      {preview && <img src={preview} className="preview" />}
    </div>
  );
}
``
