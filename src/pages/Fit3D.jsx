
import { useNavigate } from "react-router-dom";

function Fit3D() {
  const nav = useNavigate();
  return (
    <div className="page">
      <h2>3D 핏 미리보기</h2>
      <p>여기는 three.js로 GLB(바디/의상) 로드할 영역입니다.</p>
      <p>다음 단계에서 뷰어를 연결합니다.</p>
      <div className="viewer-placeholder">3D Viewer Placeholder</div>

      <button onClick={() => nav("/services")}>← 서비스로 돌아가기</button>
    </div>
  );
}

export default Fit3D;
