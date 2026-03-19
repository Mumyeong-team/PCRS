
// src/pages/Style.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { analyze } from "../mock/analysisMock";

export default function Style() {
  const nav = useNavigate();
  const { capturedImage, analysis, setAnalysis } = useApp();

  // 분석 정보가 없으면 여기서도 1회 세팅(직접 진입 대비)
  useEffect(() => {
    if (!analysis) {
      setAnalysis(analyze(capturedImage));
    }
  }, [analysis, setAnalysis, capturedImage]);

  if (!analysis) {
    return (
      <div className="page">
        <h2>분석 중...</h2>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>스타일 추천</h2>
      <p>
        <b>체형:</b> {analysis.bodyType}
      </p>
      <p>
        <b>Tip:</b> {analysis.tips}
      </p>

      <div className="cards">
        {analysis.styles.map((s) => (
          <div key={s.name} className="card">
            <h4>{s.name}</h4>
            <p>{s.notes}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => nav("/services")}>← 서비스로 돌아가기</button>
      </div>
    </div>
  );
}
