
import { createContext, useContext, useState } from "react";

/**
 * 앱 전역 상태 컨텍스트
 * - capturedImage: 촬영된 이미지 dataURL
 * - analysis: 체형 분석 결과 객체
 */
const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ✅ 촬영 이미지 (세션 스토리지 연동)
  const [capturedImage, _setCapturedImage] = useState(() => {
    return sessionStorage.getItem("capturedImage");
  });

  const setCapturedImage = (value) => {
    _setCapturedImage(value);

    if (value) {
      sessionStorage.setItem("capturedImage", value);
    } else {
      sessionStorage.removeItem("capturedImage");
    }
  };

  // ✅ 분석 결과 (세션 스토리지 연동)
  const [analysis, _setAnalysis] = useState(() => {
    const raw = sessionStorage.getItem("analysisResult");
    return raw ? JSON.parse(raw) : null;
  });

  const setAnalysis = (value) => {
    _setAnalysis(value);

    if (value) {
      sessionStorage.setItem("analysisResult", JSON.stringify(value));
    } else {
      sessionStorage.removeItem("analysisResult");
    }
  };

  return (
    <AppContext.Provider
      value={{
        capturedImage,
        setCapturedImage,
        analysis,
        setAnalysis,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ✅ Context 사용을 위한 커스텀 훅
export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp은 AppProvider 안에서만 사용해야 합니다.");
  }

  return context;
}
