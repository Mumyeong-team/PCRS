
// src/mock/analysisMock.js
// NOTE: 지금은 모의 분석. 나중에 서버 연동 시 여기서 API 호출로 바꿔도 됨.
export const analyze = (/* imageDataURL */) => {
  return {
    bodyType: "상체 발달형",
    tips: "어깨 라인을 부드럽게, 상의는 드롭숄더/레귤러, 하의는 밝은 톤 추천",
    styles: [
      { name: "미니멀 캐주얼", notes: "네이비 상의 + 라이트 그레이 하의" },
      { name: "비즈니스 캐주얼", notes: "테이퍼드 팬츠 + 옥스포드 셔츠" },
      { name: "세미 스트릿", notes: "루즈핏 상의 + 테이퍼드 하의" }
    ]
  };
};
