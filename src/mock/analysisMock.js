
// src/mock/analysisMock.js
// NOTE: 지금은 모의 분석. 나중에 서버 연동 시 여기서 API 호출로 바꿔도 됨.
export function analyze(image) {
  return {
    bodyType: image ? "상체 발달형" : "기본 체형",
    tips:
      "어깨 라인을 부드럽게 보이도록 상의는 드롭숄더/레귤러핏, 하의는 밝은 톤을 추천합니다."
  };
}