import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./fit3d.css";

const fitOptions = [
  {
    id: 1,
    name: "슬림핏",
    desc: "몸의 라인을 따라 비교적 타이트하게 떨어지는 핏입니다.",
    score: "82%",
  },
  {
    id: 2,
    name: "정사이즈",
    desc: "가장 안정적이고 자연스러운 실루엣으로 연출되는 핏입니다.",
    score: "91%",
  },
  {
    id: 3,
    name: "오버핏",
    desc: "여유 있는 실루엣으로 편안하고 트렌디한 느낌을 주는 핏입니다.",
    score: "87%",
  },
];

export default function Fit3D() {
  const nav = useNavigate();
  const [selectedFit, setSelectedFit] = useState(fitOptions[1]);

  const getProgressWidth = () => {
    if (selectedFit.id === 1) return "82%";
    if (selectedFit.id === 2) return "91%";
    return "87%";
  };

  return (
    <div className="fit-page">
      <div className="fit-browser">
        <div className="fit-browser-bar">
          <div className="fit-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="fit-address">FashionPeople / Fit3D</div>
        </div>

        <div className="fit-stage">
          <button className="fit-back-btn" onClick={() => nav("/services")}>
            ← 이전
          </button>

          <div className="fit-header">
            <span className="fit-badge">FIT PREVIEW</span>
            <h1>핏 미리보기</h1>
            <p>
              추천된 핏 옵션에 따라 전체 실루엣과 착용 느낌을 비교할 수 있습니다.
            </p>
          </div>

          <div className="fit-layout">
            <section className="fit-left-card">
              <div className="fit-model-wrap">
                <div className="fit-glow"></div>

                <div className="fit-model-card">
                  <div className="fit-model-head"></div>
                  <div
                    className={`fit-model-body ${
                      selectedFit.id === 1 ? "slim" : ""
                    } ${selectedFit.id === 3 ? "over" : ""}`}
                  ></div>
                  <div
                    className={`fit-model-legs ${
                      selectedFit.id === 1 ? "slim" : ""
                    } ${selectedFit.id === 3 ? "over" : ""}`}
                  ></div>
                </div>
              </div>

              <div className="fit-measure-box">
                <div>
                  <span>추천 상의</span>
                  <strong>M</strong>
                </div>
                <div>
                  <span>추천 하의</span>
                  <strong>29</strong>
                </div>
              </div>
            </section>

            <section className="fit-right-card">
              <div className="fit-option-list">
                {fitOptions.map((item) => (
                  <button
                    key={item.id}
                    className={`fit-option-card ${
                      selectedFit.id === item.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedFit(item)}
                  >
                    <div className="fit-option-top">
                      <h3>{item.name}</h3>
                      <strong>{item.score}</strong>
                    </div>
                    <p>{item.desc}</p>
                  </button>
                ))}
              </div>

              <div className="fit-summary-box">
                <span>추천 결과</span>
                <h2>{selectedFit.name}</h2>
                <p>
                  현재 체형 기준으로 가장 자연스럽고 안정적인 실루엣을 보여주는
                  핏입니다.
                </p>

                <div className="fit-progress-wrap">
                  <div className="fit-progress-line">
                    <div
                      className="fit-progress-fill"
                      style={{ width: getProgressWidth() }}
                    ></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}