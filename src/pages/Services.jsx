
// src/pages/Services.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { analyze } from "../mock/analysisMock";

export default function Services() {
  const nav = useNavigate();
  const { capturedImage, analysis, setAnalysis } = useApp();

  // 분석 데이터 없으면 '한 번만' 세팅
  useEffect(() => {
    if (!analysis) {
      // (선택) 캡처 이미지가 없으면 캡처 화면으로 유도
      // if (!capturedImage) { nav("/capture"); return; }
      setAnalysis(analyze(capturedImage));
    }
  }, [analysis, setAnalysis, capturedImage]);

  if (!analysis) {
    return (
      <div className="page">
        <h2>분석 중입니다...</h2>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>서비스 선택</h2>

      <div className="row">
        <div>
          <h4>촬영 이미지</h4>
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="captured"
              className="preview small"
            />
          ) : (
            <p>촬영 이미지가 없습니다.</p>
          )}
        </div>

        <div>
          <h4>분석 결과(요약)</h4>
          <p>
            <b>체형:</b> {analysis.bodyType}
          </p>
          <p>
            <b>Tip:</b> {analysis.tips}
          </p>
        </div>
      </div>

      
<div className="hub">
  <div className="card">
    <h4>스타일 추천</h4>
    <p>체형 기반 룩 추천 보기</p>
    <button onClick={() => nav("/style")}>바로가기</button>
  </div>
  <div className="card">
    <h4>3D 핏 보기</h4>
    <p>바디/의상 GLB 로드(다음 단계 연결)</p>
    <button onClick={() => nav("/fit3d")}>바로가기</button>
  </div>
  <div className="card">
    <h4>코디 합성</h4>
    <p>상의+하의 PNG 합성</p>
    <button onClick={() => nav("/compose")}>바로가기</button>
  </div>
</div>


      <div style={{ marginTop: 12 }}>
        <button onClick={() => nav("/")}>← 처음으로</button>
      </div>
    </div>
  );
}
