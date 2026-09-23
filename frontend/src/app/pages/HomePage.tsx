import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Box, Camera, Sparkles, ArrowRight, ChevronDown } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: '사진 한 장으로 체형 분석',
      description: '정면과 측면 사진을 업로드하면 AI가 어깨·허리·다리 등 9가지 체형 수치를 자동으로 측정해요.',
      tag: 'MediaPipe AI',
      color: '#ff3e6c',
    },
    {
      icon: Sparkles,
      title: '내 체형에 맞는 스타일 추천',
      description: '체형 분석 결과를 바탕으로 어울리는 상의·하의·핏을 개인 맞춤으로 추천해드려요.',
      tag: 'AI 추천 엔진',
      color: '#7c3aed',
    },
    {
      icon: Box,
      title: '3D 아바타로 직접 입어보기',
      description: '내 체형이 반영된 3D 아바타에 옷을 입혀보고 부위별 핏을 확인해요. 사이즈 고민 끝!',
      tag: 'Three.js 렌더링',
      color: '#0ea5e9',
    },
  ];

  const steps = [
    { num: '01', title: '사진 업로드', desc: '정면 + 측면 전신 사진' },
    { num: '02', title: '체형 분석', desc: 'AI가 수치를 자동 추출' },
    { num: '03', title: '스타일 추천', desc: '내 체형 맞춤 추천' },
    { num: '04', title: '3D 피팅', desc: '직접 입어보고 확인' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen"
      style={{ background: '#0d0d0d', color: '#ffffff', fontFamily: "'Inter', -apple-system, sans-serif" }}
    >
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(13,13,13,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Fashion<span style={{ color: '#ff3e6c' }}>People</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#features" style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              서비스 소개
            </a>
            <a href="#how-it-works" style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              이용 방법
            </a>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/upload')}
              style={{ padding: '8px 20px', background: '#ff3e6c', border: 'none', borderRadius: 99, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              시작하기
            </motion.button>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 80px' }}>
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{ textAlign: 'center', marginBottom: 80 }}
        >
          {/* 뱃지 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(255,62,108,0.1)', border: '1px solid rgba(255,62,108,0.3)', borderRadius: 99, fontSize: 12, color: '#ff3e6c', fontWeight: 600, marginBottom: 32, letterSpacing: '0.05em' }}
          >
            <span style={{ width: 6, height: 6, background: '#ff3e6c', borderRadius: '50%', display: 'inline-block' }} />
            AI 기반 개인 의류 맞춤 서비스
          </motion.div>

          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24 }}>
            사이즈 고민,<br />
            <span style={{ background: 'linear-gradient(135deg, #ff3e6c, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              이제 끝내세요
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 48px', fontWeight: 300 }}>
            사진 한 장으로 체형을 분석하고,<br />
            3D 아바타로 직접 입어보고, 딱 맞는 사이즈를 추천받으세요.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(255,62,108,0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/upload')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: '#ff3e6c', border: 'none', borderRadius: 99, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
            >
              지금 분석 시작하기
              <ArrowRight size={18} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 28px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 400, cursor: 'pointer' }}
            >
              서비스 알아보기
              <ChevronDown size={16} />
            </motion.button>
          </div>
        </motion.div>

        {/* 통계 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 100 }}
        >
          {[
            { num: '70%', label: '온라인 의류 반품이 사이즈 불일치' },
            { num: '9가지', label: '체형 수치 자동 측정' },
            { num: '360°', label: '3D 아바타 회전 피팅' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#ff3e6c', marginBottom: 8 }}>{stat.num}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Features */}
        <div id="features" style={{ marginBottom: 100 }}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ textAlign: 'center', marginBottom: 56 }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ff3e6c', letterSpacing: '0.15em', marginBottom: 16 }}>FEATURES</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em' }}>FashionPeople이 해결합니다</h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ y: -4, boxShadow: `0 20px 40px rgba(0,0,0,0.3)` }}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, cursor: 'default', transition: 'all 0.3s' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}18`, border: `1px solid ${f.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <f.icon size={22} color={f.color} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: f.color, letterSpacing: '0.08em', marginBottom: 10 }}>{f.tag}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 12 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <motion.section
          id="how-it-works"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '56px 48px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ff3e6c', letterSpacing: '0.15em', marginBottom: 16 }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>이용 방법</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
            {steps.map((s, i) => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: 'rgba(255,62,108,0.2)', marginBottom: 16, fontVariantNumeric: 'tabular-nums' }}>{s.num}</div>
                <div style={{ width: 40, height: 1, background: 'rgba(255,62,108,0.4)', margin: '0 auto 16px' }} />
                <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{ textAlign: 'center', padding: '80px 0 20px' }}
        >
          <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>
            지금 바로 시작해보세요
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 40 }}>
            사진 한 장으로, 내 체형에 딱 맞는 옷을.
          </p>
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(255,62,108,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/upload')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 48px', background: '#ff3e6c', border: 'none', borderRadius: 99, color: '#fff', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}
          >
            분석 시작하기
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
        © 2026 FashionPeople · Mumyeong-team
      </footer>
    </motion.div>
  );
}