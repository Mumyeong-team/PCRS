import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Box, Camera, Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Box,
      title: '3D 코디',
      description: '3D 아바타로 스타일링 결과를 시각적으로 미리보고, 다양한 코디네이션을 직관적으로 체험할 수 있습니다.',
      image: 'https://images.unsplash.com/photo-1635255484050-cda5a8606fff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzRCUyMGF2YXRhciUyMGZhc2hpb24lMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3NjIzNDAyN3ww&ixlib=rb-4.1.0&q=80&w=1080',
      gradient: 'from-blue-500/20 to-purple-500/20',
    },
    {
      icon: Camera,
      title: '사진 촬영 및 분석',
      description: '정면과 측면 사진을 촬영하면 AI가 체형을 정밀하게 분석합니다. 신뢰할 수 있는 기술력으로 정확한 데이터를 제공합니다.',
      image: 'https://images.unsplash.com/photo-1764313521531-8308a2395333?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2R5JTIwbWVhc3VyZW1lbnQlMjBhbmFseXNpc3xlbnwxfHx8fDE3NzYyMzQwMjh8MA&ixlib=rb-4.1.0&q=80&w=1080',
      gradient: 'from-teal-500/20 to-green-500/20',
    },
    {
      icon: Sparkles,
      title: 'AI 스타일 추천',
      description: '체형 분석 결과를 바탕으로 AI가 당신에게 어울리는 스타일과 아이템을 추천합니다. 개인화된 패션 가이드를 경험하세요.',
      image: 'https://images.unsplash.com/photo-1753268717665-53efd07d4ad8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBSSUyMGFydGlmaWNpYWwlMjBpbnRlbGxpZ2VuY2UlMjBmYXNoaW9ufGVufDF8fHx8MTc3NjIzNDAyOHww&ixlib=rb-4.1.0&q=80&w=1080',
      gradient: 'from-pink-500/20 to-orange-500/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-stone-50"
    >
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="border-b border-gray-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-light tracking-tight">FashionPeople</h1>
          <nav className="flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-black transition-colors font-light">
              서비스 소개
            </a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-black transition-colors font-light">
              이용 방법
            </a>
          </nav>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-light tracking-tight mb-6">
            당신만을 위한 스타일을
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI가 찾아드립니다
            </span>
          </h2>
          <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto mb-12">
            체형 분석부터 스타일 추천까지, 모든 과정이 간단하고 정확합니다.
            <br />
            지금 바로 당신에게 맞는 패션을 발견하세요.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-3 px-10 py-4 bg-black text-white rounded-full text-base font-light hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl"
          >
            분석 시작하기
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Features Grid */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-b ${feature.gradient} opacity-60`} />
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-light mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-gray-600 font-light leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* How it Works */}
        <motion.section
          id="how-it-works"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 md:p-16 text-white"
        >
          <h3 className="text-4xl font-light mb-12 text-center tracking-tight">이용 방법</h3>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: '사진 촬영', desc: '정면과 측면 사진 업로드' },
              { step: '02', title: '정보 입력', desc: '기본 신체 정보 입력' },
              { step: '03', title: 'AI 분석', desc: '체형 분석 및 분류' },
              { step: '04', title: '추천 확인', desc: '맞춤 스타일 추천 결과' },
            ].map((item, index) => (
              <div key={item.step} className="text-center">
                <div className="text-5xl font-light text-white/30 mb-4">{item.step}</div>
                <h4 className="text-xl font-light mb-2">{item.title}</h4>
                <p className="text-white/70 font-light text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </section>
    </motion.div>
  );
}
