import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./compose.css";

function Compose() {
  const nav = useNavigate();

  const tops = [
    {
      name: "화이트 셔츠",
      image: "https://via.placeholder.com/260x320/ffffff/222222?text=White+Shirt"
    },
    {
      name: "베이지 자켓",
      image: "https://via.placeholder.com/260x320/e7d8c8/222222?text=Beige+Jacket"
    },
    {
      name: "네이비 니트",
      image: "https://via.placeholder.com/260x320/2f426b/ffffff?text=Navy+Knit"
    }
  ];

  const bottoms = [
    {
      name: "데님 팬츠",
      image: "https://via.placeholder.com/260x320/6d8db3/ffffff?text=Denim+Pants"
    },
    {
      name: "슬랙스",
      image: "https://via.placeholder.com/260x320/4f4f4f/ffffff?text=Slacks"
    },
    {
      name: "크림 팬츠",
      image: "https://via.placeholder.com/260x320/f0e8d8/222222?text=Cream+Pants"
    }
  ];

  const [selectedTop, setSelectedTop] = useState(tops[0]);
  const [selectedBottom, setSelectedBottom] = useState(bottoms[0]);

  return (
    <div className="compose-page">
      <div className="compose-browser">
        <div className="compose-browser-bar">
          <div className="compose-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="compose-address">FashionPeople / Compose</div>
        </div>

        <div className="compose-stage">
          <button className="compose-back-btn" onClick={() => nav("/services")}>
            ← 이전
          </button>

          <div className="compose-header">
            <span className="compose-badge">COORDINATE COMPOSE</span>
            <h1>코디 합성 미리보기</h1>
            <p>
              상의와 하의를 선택해 전체 코디 조합을 미리 확인할 수 있습니다.
            </p>
          </div>

          <div className="compose-main-grid">
            <section className="compose-select-panel glass-card">
              <div className="panel-section">
                <div className="panel-title-row">
                  <span className="panel-mini-badge">TOP</span>
                  <h3>상의 선택</h3>
                </div>

                <div className="item-grid">
                  {tops.map((top) => (
                    <button
                      key={top.name}
                      className={`item-chip ${
                        selectedTop.name === top.name ? "active" : ""
                      }`}
                      onClick={() => setSelectedTop(top)}
                    >
                      {top.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel-section">
                <div className="panel-title-row">
                  <span className="panel-mini-badge">BOTTOM</span>
                  <h3>하의 선택</h3>
                </div>

                <div className="item-grid">
                  {bottoms.map((bottom) => (
                    <button
                      key={bottom.name}
                      className={`item-chip ${
                        selectedBottom.name === bottom.name ? "active" : ""
                      }`}
                      onClick={() => setSelectedBottom(bottom)}
                    >
                      {bottom.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="compose-preview-panel glass-card">
              <div className="panel-title-row">
                <span className="panel-mini-badge">OUTFIT RESULT</span>
                <h3>합성 결과</h3>
              </div>

              <div className="compose-preview-stage">
                <div className="preview-card top-preview">
                  <img src={selectedTop.image} alt={selectedTop.name} />
                  <p>{selectedTop.name}</p>
                </div>

                <div className="preview-plus">+</div>

                <div className="preview-card bottom-preview">
                  <img src={selectedBottom.image} alt={selectedBottom.name} />
                  <p>{selectedBottom.name}</p>
                </div>
              </div>

              <div className="compose-result-box">
                <p>
                  <strong>상의:</strong> {selectedTop.name}
                </p>
                <p>
                  <strong>하의:</strong> {selectedBottom.name}
                </p>
                <p className="result-desc">
                  심플한 상의와 안정적인 하의 조합으로 깔끔한 데일리 룩을 연출할 수 있습니다.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compose;