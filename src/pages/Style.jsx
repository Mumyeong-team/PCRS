import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import "./style.css";

function Style() {
  const nav = useNavigate();
  const { capturedImage, analysis } = useApp();

  const image =
    capturedImage || "https://via.placeholder.com/200x300?text=User";

  return (
    <div className="style-page">
      <div className="style-container">
        <button className="back-btn" onClick={() => nav("/services")}>
          ← 뒤로가기
        </button>

        <div className="style-top">
          <div className="style-image">
            <img src={image} alt="user" />
          </div>

          <div className="style-summary">
            <h2>추천 스타일</h2>
            <p>
              {analysis?.tips ||
                "체형에 맞는 스타일을 추천합니다. 밝은 톤 하의와 여유 있는 상의를 추천합니다."}
            </p>
          </div>
        </div>

        <div className="style-grid">
          <div className="style-card">
            <img src="https://via.placeholder.com/200x250" alt="style1" />
            <p>캐주얼 스타일</p>
            <button>선택</button>
          </div>

          <div className="style-card">
            <img src="https://via.placeholder.com/200x250" alt="style2" />
            <p>미니멀 스타일</p>
            <button>선택</button>
          </div>

          <div className="style-card">
            <img src="https://via.placeholder.com/200x250" alt="style3" />
            <p>세미포멀 스타일</p>
            <button>선택</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Style;