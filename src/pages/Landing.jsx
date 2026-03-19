
import { useNavigate } from "react-router-dom";
import "./landing.css";// 선택(없어도 동작)

function Landing() {
  const nav = useNavigate();
  return (
    <div className="container">
      <h1 className="title">FashionPeople</h1>
      <p className="subtitle">카메라 기반 체형 분석 · 스타일 추천</p>
      <button className="primary" onClick={() => nav("/capture")}>
        카메라 촬영하기
      </button>
    </div>
  );
}

export default Landing;
