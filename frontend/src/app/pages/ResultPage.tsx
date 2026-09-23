import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, User, Ruler, TrendingUp, CheckCircle2, XCircle, Sparkles, Box, Activity, Shirt, Scale } from 'lucide-react';

type AnalysisResult = {
  body_analysis: { gender: string; body_type: string; proportion: string; limb_type: string; build_type: string; shoulder_type?: string; silhouette_type?: string; };
  body_metrics: Record<string, number>;
  style_recommendation: { top: string[]; bottom: string[]; fit: string; avoid: string[]; extra_tip: string; };
  ai_explanation: { summary?: string; top_explanation?: string; bottom_explanation?: string; avoid_explanation?: string; styling_tip?: string; };
  user_input: { gender?: string; height_cm?: number; weight_kg?: number; top_size?: string; bottom_size?: string; preferred_fit?: string; preferred_style?: string; };
};

type StoredAnalysisResult = AnalysisResult | { sessionId?: string; userInput?: unknown; apiResponse?: { result?: AnalysisResult; body_analysis?: AnalysisResult['body_analysis']; style_recommendation?: AnalysisResult['style_recommendation']; ai_explanation?: AnalysisResult['ai_explanation']; user_input?: AnalysisResult['user_input']; }; result?: AnalysisResult; };

const BODY_TYPE_MAP: Record<string, string> = { inverted_triangle: '역삼각형 체형', triangle: '삼각형 체형', rectangle: '직사각형 체형', hourglass: '모래시계형 체형', round: '둥근형 체형', balanced: '균형형 체형' };
const PROPORTION_MAP: Record<string, string> = { long_upper_body: '상체가 긴 비율', long_legs: '다리가 긴 비율', balanced_proportion: '균형 비율' };
const LIMB_TYPE_MAP: Record<string, string> = { long_arms: '팔이 긴 편', short_arms: '팔이 짧은 편', balanced_limbs: '사지 균형형' };
const BUILD_TYPE_MAP: Record<string, string> = { slim_build: '마른 체형', regular_build: '보통 체격', stocky_build: '체격감 있는 체형' };
const SHOULDER_TYPE_MAP: Record<string, string> = { narrow_shoulders: '좁은 어깨', slightly_narrow_shoulders: '약간 좁은 어깨', balanced_shoulders: '보통 어깨', slightly_broad_shoulders: '약간 넓은 어깨', broad_shoulders: '넓은 어깨' };
const SILHOUETTE_TYPE_MAP: Record<string, string> = { v_shape: 'V형 실루엣', straight_shape: '일자형 실루엣', a_shape: 'A형 실루엣' };
const GENDER_MAP: Record<string, string> = { male: '남성', female: '여성', unspecified: '미지정' };

const C = { page: '#0d0d0d', surface: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', accent: '#ff3e6c', text: '#ffffff', text2: 'rgba(255,255,255,0.5)', text3: 'rgba(255,255,255,0.25)' };

export default function ResultPage() {
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<StoredAnalysisResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('analysisResult');
    if (!stored) { navigate('/upload'); return; }
    try { setAnalysisResult(JSON.parse(stored)); }
    catch { navigate('/upload'); }
  }, [navigate]);

  const uiData = useMemo(() => {
    if (!analysisResult) return null;
    const c = analysisResult as StoredAnalysisResult;
    const source: AnalysisResult | null =
      'body_analysis' in c ? (c as AnalysisResult) :
      c.apiResponse?.result ? c.apiResponse.result :
      c.result ? c.result :
      c.apiResponse && 'body_analysis' in c.apiResponse ? (c.apiResponse as AnalysisResult) : null;
    if (!source?.body_analysis || !source?.style_recommendation || !source?.user_input) return null;
    const b = source.body_analysis; const rec = source.style_recommendation; const ai = source.ai_explanation ?? {}; const input = source.user_input ?? {};
    return {
      bodyType: BODY_TYPE_MAP[b.body_type] ?? b.body_type ?? '-',
      proportion: PROPORTION_MAP[b.proportion] ?? b.proportion ?? '-',
      limbType: LIMB_TYPE_MAP[b.limb_type] ?? b.limb_type ?? '-',
      buildType: BUILD_TYPE_MAP[b.build_type] ?? b.build_type ?? '-',
      shoulderType: SHOULDER_TYPE_MAP[b.shoulder_type ?? ''] ?? b.shoulder_type ?? '-',
      silhouetteType: SILHOUETTE_TYPE_MAP[b.silhouette_type ?? ''] ?? b.silhouette_type ?? '-',
      summary: ai.summary?.trim() || `${BODY_TYPE_MAP[b.body_type] ?? b.body_type}, ${PROPORTION_MAP[b.proportion] ?? b.proportion}으로 분석되었습니다.`,
      detailedSummary: ai.styling_tip?.trim() || rec.extra_tip || '체형 분석 결과를 바탕으로 추천 스타일을 확인하세요.',
      recommendedTops: rec.top ?? [], recommendedBottoms: rec.bottom ?? [], avoidItems: rec.avoid ?? [],
      stylingTips: [rec.fit, rec.extra_tip, ai.top_explanation || '', ai.bottom_explanation || ''].filter(Boolean),
      input: { gender: GENDER_MAP[input.gender ?? 'unspecified'] ?? '-', height: input.height_cm ?? '-', weight: input.weight_kg ?? '-', topSize: input.top_size ?? '-', bottomSize: input.bottom_size ?? '-', preferredFit: input.preferred_fit ?? '-', preferredStyle: input.preferred_style ?? '-' },
    };
  }, [analysisResult]);

  const handleOpen3DAvatar = () => {
    const data = localStorage.getItem('analysisResult');
    const encoded = encodeURIComponent(data || '');
    window.open(`http://localhost:5500/fashion-avatar/index.html?data=${encoded}`, '_blank');
  };

  if (!uiData) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.page, color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, marginBottom: 16, color: C.text2 }}>분석 결과를 불러오지 못했습니다.</p>
        <button onClick={() => navigate('/upload')} style={{ padding: '10px 24px', background: C.accent, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>다시 분석하러 가기</button>
      </div>
    </div>
  );

  const statItems = [
    { label: '체형 유형', value: uiData.bodyType, icon: <User size={18} color="#fff" />, color: '#ff3e6c' },
    { label: '비율', value: uiData.proportion, icon: <Activity size={18} color="#fff" />, color: '#7c3aed' },
    { label: '사지 타입', value: uiData.limbType, icon: <Ruler size={18} color="#fff" />, color: '#0ea5e9' },
    { label: '체격감', value: uiData.buildType, icon: <Scale size={18} color="#fff" />, color: '#10b981' },
    { label: '어깨 인상', value: uiData.shoulderType, icon: <Shirt size={18} color="#fff" />, color: '#f59e0b' },
    { label: '실루엣', value: uiData.silhouetteType, icon: <TrendingUp size={18} color="#fff" />, color: '#ec4899' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      style={{ minHeight: '100vh', background: C.page, color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,13,13,0.9)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/home')} style={{ fontSize: 18, fontWeight: 700, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', letterSpacing: '-0.02em' }}>
            Fashion<span style={{ color: C.accent }}>People</span>
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text2, background: 'none', border: 'none', cursor: 'pointer' }}>
              <ArrowLeft size={14} /> 다시 분석하기
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>

        {/* 완료 배지 + 타이틀 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 99, fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 20 }}>
            <CheckCircle2 size={14} /> 분석 완료
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10 }}>체형 분석 및 AI 스타일 추천</h1>
          <p style={{ fontSize: 15, color: C.text2 }}>당신에게 맞는 스타일링 가이드를 확인하세요</p>
        </motion.div>

        {/* 종합 결과 배너 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ background: 'linear-gradient(135deg, rgba(255,62,108,0.12), rgba(124,58,237,0.12))', border: '1px solid rgba(255,62,108,0.2)', borderRadius: 16, padding: '20px 28px', textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 6, letterSpacing: '0.1em' }}>종합 분석 결과</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{uiData.bodyType} / {uiData.proportion} / {uiData.buildType}</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>{uiData.shoulderType} / {uiData.silhouetteType}</div>
        </motion.div>

        {/* 6가지 체형 카드 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 40 }}>
          {statItems.map((s, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{s.icon}</div>
              <div style={{ fontSize: 10, color: C.text3, marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* 메인 컨텐츠 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* AI 스타일 추천 */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ background: 'linear-gradient(135deg, rgba(255,62,108,0.08), rgba(124,58,237,0.08))', border: `1px solid rgba(255,62,108,0.2)`, borderRadius: 16, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(255,62,108,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color={C.accent} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>AI 스타일 추천</div>
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}>{uiData.summary}</div>
              <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7 }}>{uiData.detailedSummary}</div>
            </motion.div>

            {/* 추천 상의 */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(41,121,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shirt size={16} color="#2979ff" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>추천 상의</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {uiData.recommendedTops.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(41,121,255,0.06)', border: '1px solid rgba(41,121,255,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                    <CheckCircle2 size={14} color="#2979ff" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 추천 하의 */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(16,185,129,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="#10b981" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>추천 하의</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {uiData.recommendedBottoms.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                    <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 피해야 할 스타일 */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,62,108,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={16} color={C.accent} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>피해야 할 스타일</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {uiData.avoidItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,62,108,0.05)', border: '1px solid rgba(255,62,108,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                    <XCircle size={14} color={C.accent} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 스타일링 팁 */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(245,158,11,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={16} color="#f59e0b" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>스타일링 팁</div>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {uiData.stylingTips.map((tip, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: '#f59e0b', flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* 사이드 패널 */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ position: 'sticky', top: 80, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* 입력 정보 */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <User size={14} color={C.text2} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>입력 정보</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: C.text3, marginBottom: 3 }}>성별</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{uiData.input.gender}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['키', `${uiData.input.height}cm`], ['몸무게', `${uiData.input.weight}kg`]].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: C.text3, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['상의', uiData.input.topSize], ['하의', uiData.input.bottomSize]].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: C.text3, marginBottom: 3 }}>{k} 사이즈</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,62,108,0.06)', border: '1px solid rgba(255,62,108,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: C.accent, marginBottom: 3 }}>선호 핏</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{uiData.input.preferredFit}</div>
                </div>
                <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#7c3aed', marginBottom: 3 }}>선호 스타일</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{uiData.input.preferredStyle}</div>
                </div>
              </div>

              <button onClick={handleOpen3DAvatar}
                style={{ width: '100%', padding: '13px', background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                <Box size={16} /> 3D 코디 체험하기
              </button>
            </div>

            {/* 분석 결과 해석 */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles size={14} color={C.text2} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>분석 결과 해석</span>
              </div>
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.7 }}>
                같은 체형 유형이라도 <strong style={{ color: '#fff' }}>체격감</strong>, <strong style={{ color: '#fff' }}>어깨 인상</strong>, <strong style={{ color: '#fff' }}>선호 핏</strong>에 따라 추천 결과가 달라집니다.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}