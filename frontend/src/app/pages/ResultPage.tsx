import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, User, Ruler, TrendingUp, CheckCircle2, XCircle, Sparkles, Box, Activity, Shirt, Scale, ChevronRight } from 'lucide-react';

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

const C = {
  page: '#0d0d0d', surface: 'rgba(255,255,255,0.04)', surface2: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.12)',
  accent: '#ff3e6c', text: '#ffffff', text2: 'rgba(255,255,255,0.5)', text3: 'rgba(255,255,255,0.25)'
};

export default function ResultPage() {
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<StoredAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'style' | 'info'>('style');

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
      metrics: source.body_metrics ?? {},
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
    { label: '체형 유형', value: uiData.bodyType, icon: <User size={16} color="#fff" />, color: '#ff3e6c' },
    { label: '비율', value: uiData.proportion, icon: <Activity size={16} color="#fff" />, color: '#7c3aed' },
    { label: '사지 타입', value: uiData.limbType, icon: <Ruler size={16} color="#fff" />, color: '#0ea5e9' },
    { label: '체격감', value: uiData.buildType, icon: <Scale size={16} color="#fff" />, color: '#10b981' },
    { label: '어깨 인상', value: uiData.shoulderType, icon: <Shirt size={16} color="#fff" />, color: '#f59e0b' },
    { label: '실루엣', value: uiData.silhouetteType, icon: <TrendingUp size={16} color="#fff" />, color: '#ec4899' },
  ];

  // 체형 수치 퍼센트 변환 (시각화용)
  const metricBars = [
    { label: '어깨 너비', value: Math.round((uiData.metrics.shoulder_width || 0) * 100), color: '#ff3e6c' },
    { label: '허리 너비', value: Math.round((uiData.metrics.waist_width || 0) * 100), color: '#7c3aed' },
    { label: '고관절 너비', value: Math.round((uiData.metrics.hip_width || 0) * 100), color: '#0ea5e9' },
    { label: '상체 길이', value: Math.round((uiData.metrics.upper_body_length || 0) * 100), color: '#10b981' },
    { label: '하체 길이', value: Math.round((uiData.metrics.lower_body_length || 0) * 100), color: '#f59e0b' },
  ];

  const tabBtn = (tab: 'style' | 'info', label: string) => (
    <button onClick={() => setActiveTab(tab)} style={{
      padding: '10px 24px', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
      background: activeTab === tab ? C.accent : 'transparent',
      color: activeTab === tab ? '#fff' : C.text2,
    }}>{label}</button>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      style={{ minHeight: '100vh', background: C.page, color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,13,13,0.9)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/home')} style={{ fontSize: 18, fontWeight: 700, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', letterSpacing: '-0.02em' }}>
            Fashion<span style={{ color: C.accent }}>People</span>
          </button>
          <button onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.text2, background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={14} /> 다시 분석하기
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* 완료 배지 + 타이틀 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 99, fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 16 }}>
            <CheckCircle2 size={13} /> 분석 완료
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>체형 분석 결과</h1>
          <p style={{ fontSize: 15, color: C.text2 }}>당신에게 맞는 스타일링 가이드를 확인하세요</p>
        </motion.div>

        {/* 종합 결과 + 3D 버튼 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ background: 'linear-gradient(135deg, rgba(255,62,108,0.1) 0%, rgba(124,58,237,0.1) 100%)', border: '1px solid rgba(255,62,108,0.2)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: C.text3, letterSpacing: '0.1em', marginBottom: 8 }}>종합 분석 결과</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{uiData.bodyType} · {uiData.buildType}</div>
            <div style={{ fontSize: 14, color: C.text2 }}>{uiData.proportion} · {uiData.shoulderType} · {uiData.silhouetteType}</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 12px 30px rgba(255,62,108,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpen3DAvatar}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Box size={18} /> 3D 코디 체험하기 <ChevronRight size={16} />
          </motion.button>
        </motion.div>

        {/* 6가지 체형 카드 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 32 }}>
          {statItems.map((s, i) => (
            <motion.div key={i} whileHover={{ y: -3 }} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 12px', textAlign: 'center', cursor: 'default', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = s.color + '60')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{s.icon}</div>
              <div style={{ fontSize: 10, color: C.text3, marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{s.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* 체형 수치 시각화 */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color={C.text2} /> 체형 수치 분포
            <span style={{ fontSize: 11, color: C.text3, fontWeight: 400 }}>(신장 대비 비율)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {metricBars.map((m, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text2, marginBottom: 5 }}>
                  <span>{m.label}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{m.value}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(m.value * 3, 100)}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', background: m.color, borderRadius: 99 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 탭 메뉴 */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ display: 'flex', gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 99, padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {tabBtn('style', '스타일 추천')}
          {tabBtn('info', '내 정보')}
        </motion.div>

        {/* 스타일 추천 탭 */}
        {activeTab === 'style' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* AI 요약 */}
            <div style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(255,62,108,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(255,62,108,0.15)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,62,108,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color={C.accent} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>AI 스타일 요약</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 10 }}>{uiData.summary}</p>
              <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7 }}>{uiData.detailedSummary}</p>
            </div>

            {/* 추천 상의 */}
            <div style={{ background: C.surface, border: '1px solid rgba(41,121,255,0.2)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(41,121,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shirt size={15} color="#2979ff" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>추천 상의</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {uiData.recommendedTops.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(41,121,255,0.06)', border: '1px solid rgba(41,121,255,0.12)', borderRadius: 9, padding: '9px 12px' }}>
                    <CheckCircle2 size={13} color="#2979ff" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 추천 하의 */}
            <div style={{ background: C.surface, border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(16,185,129,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={15} color="#10b981" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>추천 하의</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {uiData.recommendedBottoms.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 9, padding: '9px 12px' }}>
                    <CheckCircle2 size={13} color="#10b981" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 피해야 할 스타일 */}
            <div style={{ background: C.surface, border: '1px solid rgba(255,62,108,0.2)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,62,108,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={15} color={C.accent} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>피해야 할 스타일</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {uiData.avoidItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,62,108,0.05)', border: '1px solid rgba(255,62,108,0.12)', borderRadius: 9, padding: '9px 12px' }}>
                    <XCircle size={13} color={C.accent} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 스타일링 팁 */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(245,158,11,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={15} color="#f59e0b" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>스타일링 팁</span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {uiData.stylingTips.map((tip, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: '#f59e0b', flexShrink: 0, fontWeight: 700, fontSize: 13 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* 내 정보 탭 */}
        {activeTab === 'info' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: '성별', value: uiData.input.gender, color: C.accent },
              { label: '키', value: `${uiData.input.height}cm`, color: '#7c3aed' },
              { label: '몸무게', value: `${uiData.input.weight}kg`, color: '#0ea5e9' },
              { label: '상의 사이즈', value: uiData.input.topSize, color: '#10b981' },
              { label: '하의 사이즈', value: uiData.input.bottomSize, color: '#f59e0b' },
              { label: '선호 핏', value: uiData.input.preferredFit, color: '#ec4899' },
              { label: '선호 스타일', value: uiData.input.preferredStyle, color: C.accent },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 6, letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{value || '-'}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* 하단 CTA */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ marginTop: 40, padding: '28px 32px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>3D 아바타로 직접 입어보세요</div>
            <div style={{ fontSize: 13, color: C.text2 }}>내 체형이 반영된 아바타에 outfit 5종을 입혀보고 핏을 확인하세요</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 12px 30px rgba(255,62,108,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpen3DAvatar}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Box size={16} /> 3D 코디 체험하기
          </motion.button>
        </motion.div>

      </div>
    </motion.div>
  );
}