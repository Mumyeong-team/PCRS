
function Home() {
  return (
    <div>
      <h2>체형 분석 패션 서비스</h2>

      <p>📷 카메라 상태: 연결됨</p>
      <button>촬영 시작</button>

      <hr />

      <h3>촬영 결과</h3>
      <img
        src="https://via.placeholder.com/300x400"
        alt="촬영 이미지"
      />

      <h3>체형 분석 결과</h3>
      <p>체형: 상체 발달형</p>
      <p>추천 스타일: 미니멀, 캐주얼</p>
    </div>
  );
}

export default Home;
