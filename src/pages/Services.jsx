import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { analyze } from "../mock/analysisMock";
import "./services.css";

export default function Services() {
  const nav = useNavigate();
  const { capturedImage, analysis, setAnalysis } = useApp();

  useEffect(() => {
    if (!analysis) {
      setAnalysis(analyze(capturedImage));
    }
  }, [analysis, setAnalysis, capturedImage]);

  const displayImage =
    capturedImage || "https://via.placeholder.com/400x500?text=Sample+User";

  if (!analysis) {
    return (
      <div className="services-page">
        <div className="services-browser">
          <div className="services-browser-bar">
            <div className="services-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="services-address">FashionPeople / Services</div>
          </div>

          <div className="services-loading-stage">
            <div className="services-loading-card">
              <p className="services-loading-badge">ANALYSIS</p>
              <h2>AI 분석 결과를 불러오는 중입니다</h2>
              <span>체형 데이터와 추천 정보를 준비하고 있어요.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="services-page">
      <div className="services-browser">
        <div className="services-browser-bar">
          <div className="services-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="services-address">FashionPeople / Services</div>
        </div>

        <div className="services-stage">
          <button className="services-back-btn" onClick={() => nav("/capture")}>
            ← 촬영으로
          </button>

          <div className="services-header">
            <span className="services-badge">AI ANALYSIS RESULT</span>
            <h1>AI 분석 결과</h1>
            <p>
              촬영 이미지를 바탕으로 분석된 체형 결과를 확인하고,
              원하는 추천 기능으로 이동할 수 있습니다.
            </p>
          </div>

          <div className="services-top-grid">
            <section className="services-preview-card glass-card">
              <div className="card-title-row">
                <span className="card-mini-badge">Captured</span>
                <h3>촬영 이미지</h3>
              </div>

              <div className="preview-frame">
                <img
                  src={displayImage}
                  alt="captured preview"
                  className="services-preview-image"
                />
              </div>
            </section>

            <section className="services-analysis-card glass-card">
              <div className="card-title-row">
                <span className="card-mini-badge">Summary</span>
                <h3>체형 분석 요약</h3>
              </div>

              <div className="analysis-summary-box">
                <div className="analysis-main">
                  <span>체형 유형</span>
                  <strong>{analysis.bodyType || "상체 발달형"}</strong>
                </div>

                <div className="analysis-size-grid">
                  <div className="size-chip">
                    <strong>M</strong>
                    <span>상의 추천</span>
                  </div>
                  <div className="size-chip">
                    <strong>29</strong>
                    <span>하의 추천</span>
                  </div>
                </div>

                <div className="analysis-tags">
                  <span>미니멀</span>
                  <span>캐주얼</span>
                  <span>세미포멀</span>
                </div>

                <div className="analysis-tip-box">
                  <p className="tip-label">추천 Tip</p>
                  <p className="tip-text">
                    {analysis.tips ||
                      "어깨 라인을 부드럽게 보이도록 상의는 드롭숄더 또는 레귤러핏, 하의는 밝은 톤을 추천합니다."}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className="services-feature-section">
            <div className="feature-section-head">
              <span className="services-badge">NEXT STEP</span>
              <h2>추천 기능 선택</h2>
            </div>

            <div className="services-feature-grid">
              <article className="service-feature-card">
                <div className="feature-number">01</div>
                <h3>AI 스타일 추천</h3>
                <p>
                  체형과 분위기에 맞는 추천 룩과 스타일 키워드를 확인합니다.
                </p>
                <button onClick={() => nav("/style")}>바로가기</button>
              </article>

              <article className="service-feature-card">
                <div className="feature-number">02</div>
                <h3>착용 핏 분석</h3>
                <p>
                  추천 결과를 기반으로 의상 핏과 전체 실루엣을 미리 확인합니다.
                </p>
                <button onClick={() => nav("/fit3d")}>바로가기</button>
              </article>

              <article className="service-feature-card">
                <div className="feature-number">03</div>
                <h3>코디 시뮬레이션</h3>
                <p>
                  상의와 하의를 조합해 전체적인 코디 이미지를 미리 확인합니다.
                </p>
                <button onClick={() => nav("/compose")}>바로가기</button>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}