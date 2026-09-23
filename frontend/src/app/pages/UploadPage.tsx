import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload, Camera, User, ArrowRight, Check } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

const S: Record<string, React.CSSProperties> = {
  page:    { minHeight: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif" },
  header:  { position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,13,13,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  hInner:  { maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' },
  content: { maxWidth: 1100, margin: '0 auto', padding: '56px 24px' },
  card:    { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 },
  label:   { fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: '0.05em', display: 'block' },
  input:   { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const },
  select:  { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const },
};

export default function UploadPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ gender: '', height: '', weight: '', topSize: '', bottomSize: '', preferredFit: '', preferredStyle: '' });
  const [imageFiles, setImageFiles] = useState({ front: null as File | null, side: null as File | null });
  const [images, setImages] = useState({ front: null as string | null, side: null as string | null });
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (type: 'front' | 'side', file: File) => {
    setImageFiles(p => ({ ...p, [type]: file }));
    const r = new FileReader();
    r.onload = e => setImages(p => ({ ...p, [type]: e.target?.result as string }));
    r.readAsDataURL(file);
  };

  const isFormValid = () => formData.gender && formData.height && formData.weight && imageFiles.front && imageFiles.side;

  const uploadSingleImage = async (sessionId: string, imageType: 'front' | 'side', file: File) => {
    const genderMap: Record<string, string> = { 남성: 'male', 여성: 'female' };
    const fitMap: Record<string, string> = { 슬림: 'slim', 레귤러: 'regular', 루즈: 'loose', 오버사이즈: 'oversized' };
    const styleMap: Record<string, string> = { 캐주얼: 'casual', 포멀: 'formal', 스트릿: 'street', 미니멀: 'minimal', 빈티지: 'vintage', 스포티: 'sporty' };
    const data = new FormData();
    data.append('session_id', sessionId); data.append('image_type', imageType); data.append('file', file);
    data.append('gender', genderMap[formData.gender] || 'unspecified');
    data.append('height_cm', formData.height); data.append('weight_kg', formData.weight);
    data.append('top_size', formData.topSize || ''); data.append('bottom_size', formData.bottomSize || '');
    data.append('preferred_fit', fitMap[formData.preferredFit] || '');
    data.append('preferred_style', styleMap[formData.preferredStyle] || '');
    data.append('provider', 'openai'); data.append('use_ai', 'false');
    const response = await fetch(`${API_BASE}/upload-image`, { method: 'POST', body: data });
    if (!response.ok) throw new Error(await response.text() || '업로드 실패');
    return response.json();
  };

  const handleSubmit = async () => {
    if (!isFormValid() || !imageFiles.front || !imageFiles.side) return;
    try {
      setLoading(true);
      const sessionId = `session_${Date.now()}`;
      await uploadSingleImage(sessionId, 'front', imageFiles.front);
      const finalResponse = await uploadSingleImage(sessionId, 'side', imageFiles.side);
      localStorage.setItem('analysisResult', JSON.stringify({ sessionId, userInput: formData, apiResponse: finalResponse }));
      navigate('/result');
    } catch (e) {
      console.error(e); alert('분석 요청에 실패했습니다.');
    } finally { setLoading(false); }
  };

  const UploadBox = ({ type, label }: { type: 'front' | 'side'; label: string }) => (
    <div>
      <label style={S.label}>{label} *</label>
      <input type="file" accept="image/*" id={`${type}-upload`} style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleImageUpload(type, e.target.files[0])} />
      <label htmlFor={`${type}-upload`} style={{ display: 'block', position: 'relative', height: 220, border: `2px dashed ${images[type] ? '#ff3e6c' : 'rgba(255,255,255,0.15)'}`, borderRadius: 14, cursor: 'pointer', overflow: 'hidden', background: images[type] ? 'rgba(255,62,108,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
        {images[type] ? (
          <>
            <img src={images[type]!} alt={type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, background: '#ff3e6c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={14} color="#fff" />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
            <Upload size={28} color="rgba(255,255,255,0.25)" />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>클릭하여 업로드</span>
          </div>
        )}
      </label>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={S.page}>
      <header style={S.header}>
        <div style={S.hInner}>
          <button style={S.logo} onClick={() => navigate('/home')}>
            Fashion<span style={{ color: '#ff3e6c' }}>People</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            <User size={14} /> 체형 분석
          </div>
        </div>
      </header>

      <div style={S.content}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'rgba(255,62,108,0.1)', border: '1px solid rgba(255,62,108,0.3)', borderRadius: 99, fontSize: 11, color: '#ff3e6c', fontWeight: 600, marginBottom: 20 }}>
            STEP 1 OF 2 · 사진 및 정보 입력
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>체형 분석을 시작합니다</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>정확한 분석을 위해 사진과 정보를 입력해주세요</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* 사진 업로드 */}
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,62,108,0.15)', border: '1px solid rgba(255,62,108,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={18} color="#ff3e6c" />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>사진 업로드</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>전신이 나오도록 촬영해주세요</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <UploadBox type="front" label="정면 사진" />
                <UploadBox type="side" label="측면 사진" />
              </div>
            </div>
          </motion.div>

          {/* 정보 입력 */}
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,62,108,0.15)', border: '1px solid rgba(255,62,108,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#ff3e6c" />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>신체 정보</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>정확한 분석을 위해 입력해주세요</div>
                </div>
              </div>

              {/* 성별 */}
              <div>
                <span style={S.label}>성별 *</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['남성', '여성'].map(g => (
                    <button key={g} onClick={() => setFormData({ ...formData, gender: g })}
                      style={{ padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: formData.gender === g ? '1px solid #ff3e6c' : '1px solid rgba(255,255,255,0.1)', background: formData.gender === g ? 'rgba(255,62,108,0.12)' : 'rgba(255,255,255,0.04)', color: formData.gender === g ? '#ff3e6c' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 키 / 몸무게 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={S.label}>키 (cm) *</span>
                  <input style={S.input} type="number" value={formData.height} placeholder="170" onChange={e => setFormData({ ...formData, height: e.target.value })} />
                </div>
                <div>
                  <span style={S.label}>몸무게 (kg) *</span>
                  <input style={S.input} type="number" value={formData.weight} placeholder="65" onChange={e => setFormData({ ...formData, weight: e.target.value })} />
                </div>
              </div>

              {/* 사이즈 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={S.label}>상의 사이즈</span>
                  <select style={S.select} value={formData.topSize} onChange={e => setFormData({ ...formData, topSize: e.target.value })}>
                    <option value="">선택</option>
                    {['XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <span style={S.label}>하의 사이즈</span>
                  <select style={S.select} value={formData.bottomSize} onChange={e => setFormData({ ...formData, bottomSize: e.target.value })}>
                    <option value="">선택</option>
                    {['26','28','30','32','34','36'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* 선호 핏 */}
              <div>
                <span style={S.label}>선호 핏</span>
                <select style={S.select} value={formData.preferredFit} onChange={e => setFormData({ ...formData, preferredFit: e.target.value })}>
                  <option value="">선택</option>
                  {['슬림','레귤러','루즈','오버사이즈'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* 선호 스타일 */}
              <div>
                <span style={S.label}>선호 스타일</span>
                <select style={S.select} value={formData.preferredStyle} onChange={e => setFormData({ ...formData, preferredStyle: e.target.value })}>
                  <option value="">선택</option>
                  {['캐주얼','포멀','스트릿','미니멀','빈티지','스포티'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* 제출 버튼 */}
              <motion.button
                whileHover={isFormValid() && !loading ? { scale: 1.02, boxShadow: '0 12px 30px rgba(255,62,108,0.3)' } : {}}
                whileTap={isFormValid() && !loading ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={!isFormValid() || loading}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 600, cursor: isFormValid() && !loading ? 'pointer' : 'not-allowed', background: isFormValid() && !loading ? '#ff3e6c' : 'rgba(255,255,255,0.08)', color: isFormValid() && !loading ? '#fff' : 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, transition: 'all 0.2s' }}
              >
                {loading ? '분석 중...' : '분석 시작하기'}
                <ArrowRight size={16} />
              </motion.button>

              {!isFormValid() && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>* 필수 항목을 모두 입력해주세요</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}