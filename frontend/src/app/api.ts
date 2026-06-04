const API_BASE_URL = "http://127.0.0.1:8000";

export async function analyzeBody(payload: any) {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`분석 요청 실패: ${text}`);
  }

  return await response.json();
}