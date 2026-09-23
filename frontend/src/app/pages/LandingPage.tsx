import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#0d0d0d', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* 배경 이미지 */}
      <motion.div
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <img
          src="https://images.unsplash.com/photo-1705232497552-abd05ad64485?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBmYXNoaW9uJTIwbW9kZWwlMjBlZGl0b3JpYWx8ZW58MXx8fHwxNzc2MjM0MDI3fDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Fashion background"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,13,13,0.75) 0%, rgba(13,13,13,0.5) 50%, rgba(13,13,13,0.85) 100%)' }} />
      </motion.div>

      {/* 콘텐츠 */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '0 24px', textAlign: 'center' }}>

        {/* 뱃지 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(255,62,108,0.15)', border: '1px solid rgba(255,62,108,0.4)', borderRadius: 99, fontSize: 12, color: '#ff3e6c', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 28 }}
        >
          <span style={{ width: 6, height: 6, background: '#ff3e6c', borderRadius: '50%', display: 'inline-block' }} />
          AI 기반 개인 의류 맞춤 서비스
        </motion.div>

        {/* 타이틀 */}
        <motion.h1
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{ fontSize: 'clamp(52px, 10vw, 100px)', fontWeight: 700, color: '#ffffff', marginBottom: 20, letterSpacing: '-0.03em', lineHeight: 1.05 }}
        >
          Fashion<span style={{ color: '#ff3e6c' }}>People</span>
        </motion.h1>

        {/* 서브타이틀 */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginBottom: 48, fontWeight: 300, letterSpacing: '0.02em', lineHeight: 1.6 }}
        >
          사진 한 장으로 체형을 분석하고<br />
          3D 아바타로 직접 입어보세요
        </motion.p>

        {/* CTA 버튼 */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 1.0 }}
          whileHover={{ scale: 1.04, boxShadow: '0 20px 40px rgba(255,62,108,0.35)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/home')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 40px', background: '#ff3e6c', border: 'none', borderRadius: 99, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          시작하기
          <ArrowRight size={18} />
        </motion.button>

        {/* 하단 인디케이터 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          style={{ position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>SCROLL TO EXPLORE</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, rgba(255,62,108,0.6), transparent)' }}
          />
        </motion.div>
      </div>
    </div>
  );
}