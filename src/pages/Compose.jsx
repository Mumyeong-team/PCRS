
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Compose() {
  const nav = useNavigate();
  const [top, setTop] = useState(null);
  const [bottom, setBottom] = useState(null);

  const onFile = (e, setter) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(f);
  };

  return (
    <div className="page">
      <h2>코디 합성</h2>
      <div className="row">
        <div>
          <p>상의 PNG 업로드(투명 배경 권장)</p>
          <input type="file" accept="image/*" onChange={(e) => onFile(e, setTop)} />
        </div>
        <div>
          <p>하의 PNG 업로드(투명 배경 권장)</p>
          <input type="file" accept="image/*" onChange={(e) => onFile(e, setBottom)} />
        </div>
      </div>

      <div className="stage">
        {/* 간단 레이어 합성 */}
        {bottom && <img src={bottom} alt="bottom" className="garment bottom" />}
        {top && <img src={top} alt="top" className="garment top" />}
      </div>

      <button onClick={() => nav("/services")}>← 서비스로 돌아가기</button>
    </div>
  );
}

export default Compose;
