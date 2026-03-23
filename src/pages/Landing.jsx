import { useNavigate } from "react-router-dom";
import "./landing.css";

function Landing() {
  const nav = useNavigate();

  return (
    <div className="landing-page">
      <div className="browser-frame">
        <div className="browser-bar">
          <div className="browser-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="browser-address">FashionPeople</div>
        </div>

        <div className="landing-card">
          <h1 className="landing-title">FashionPeople</h1>
          <p className="landing-subtitle">카메라 기반 체형 분석 · 스타일 추천</p>

          <button className="landing-button" onClick={() => nav("/capture")}>
            카메라 촬영하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default Landing;