import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  User,
  Ruler,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  Box,
  Download,
  Activity,
  Shirt,
  Scale,
} from 'lucide-react';

type AnalysisResult = {
  body_analysis: {
    gender: string;
    body_type: string;
    proportion: string;
    limb_type: string;
    build_type: string;
    shoulder_type?: string;
    silhouette_type?: string;
  };
  body_metrics: Record<string, number>;
  style_recommendation: {
    top: string[];
    bottom: string[];
    fit: string;
    avoid: string[];
    extra_tip: string;
  };
  ai_explanation: {
    summary?: string;
    top_explanation?: string;
    bottom_explanation?: string;
    avoid_explanation?: string;
    styling_tip?: string;
  };
  user_input: {
    gender?: string;
    height_cm?: number;
    weight_kg?: number;
    top_size?: string;
    bottom_size?: string;
    preferred_fit?: string;
    preferred_style?: string;
  };
  provider?: string;
  use_ai?: boolean;
};

type StoredAnalysisResult =
  | AnalysisResult
  | {
      sessionId?: string;
      userInput?: unknown;
      images?: unknown;
      apiResponse?: {
        result?: AnalysisResult;
        body_analysis?: AnalysisResult['body_analysis'];
        style_recommendation?: AnalysisResult['style_recommendation'];
        ai_explanation?: AnalysisResult['ai_explanation'];
        user_input?: AnalysisResult['user_input'];
      };
      result?: AnalysisResult;
    };

const BODY_TYPE_MAP: Record<string, string> = {
  inverted_triangle: '역삼각형 체형',
  triangle: '삼각형 체형',
  rectangle: '직사각형 체형',
  hourglass: '모래시계형 체형',
  round: '둥근형 체형',
  balanced: '균형형 체형',
};

const PROPORTION_MAP: Record<string, string> = {
  long_upper_body: '상체가 긴 비율',
  long_legs: '다리가 긴 비율',
  balanced_proportion: '균형 비율',
};

const LIMB_TYPE_MAP: Record<string, string> = {
  long_arms: '팔이 긴 편',
  short_arms: '팔이 짧은 편',
  balanced_limbs: '사지 균형형',
};

const BUILD_TYPE_MAP: Record<string, string> = {
  slim_build: '마른 체형',
  regular_build: '보통 체격',
  stocky_build: '체격감 있는 체형',
};

const SHOULDER_TYPE_MAP: Record<string, string> = {
  narrow_shoulders: '좁은 어깨',
  slightly_narrow_shoulders: '약간 좁은 어깨',
  balanced_shoulders: '보통 어깨',
  slightly_broad_shoulders: '약간 넓은 어깨',
  broad_shoulders: '넓은 어깨',
};

const SILHOUETTE_TYPE_MAP: Record<string, string> = {
  v_shape: 'V형 실루엣',
  straight_shape: '일자형 실루엣',
  a_shape: 'A형 실루엣',
};

const GENDER_MAP: Record<string, string> = {
  male: '남성',
  female: '여성',
  unspecified: '미지정',
};

export default function ResultPage() {
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<StoredAnalysisResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('analysisResult');

    if (!stored) {
      navigate('/upload');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setAnalysisResult(parsed);
    } catch (error) {
      console.error('analysisResult 파싱 실패:', error);
      navigate('/upload');
    }
  }, [navigate]);

  const uiData = useMemo(() => {
    if (!analysisResult) return null;

    const candidate = analysisResult as StoredAnalysisResult;

    const source: AnalysisResult | null =
      'body_analysis' in candidate
        ? (candidate as AnalysisResult)
        : candidate.apiResponse?.result
          ? candidate.apiResponse.result
          : candidate.result
            ? candidate.result
            : candidate.apiResponse &&
                'body_analysis' in candidate.apiResponse &&
                'style_recommendation' in candidate.apiResponse &&
                'user_input' in candidate.apiResponse
              ? (candidate.apiResponse as AnalysisResult)
              : null;

    if (!source?.body_analysis || !source?.style_recommendation || !source?.user_input) {
      console.error('분석 결과 구조가 올바르지 않음:', analysisResult);
      return null;
    }

    const body = source.body_analysis;
    const rec = source.style_recommendation;
    const ai = source.ai_explanation ?? {};
    const input = source.user_input ?? {};

    const bodyType = BODY_TYPE_MAP[body.body_type] ?? body.body_type ?? '-';
    const proportion = PROPORTION_MAP[body.proportion] ?? body.proportion ?? '-';
    const limbType = LIMB_TYPE_MAP[body.limb_type] ?? body.limb_type ?? '-';
    const buildType = BUILD_TYPE_MAP[body.build_type] ?? body.build_type ?? '-';
    const shoulderType =
      SHOULDER_TYPE_MAP[body.shoulder_type ?? ''] ?? body.shoulder_type ?? '-';
    const silhouetteType =
      SILHOUETTE_TYPE_MAP[body.silhouette_type ?? ''] ?? body.silhouette_type ?? '-';

    const summary =
      ai.summary?.trim() ||
      `${bodyType}, ${proportion}, ${buildType}으로 분석되었습니다.`;

    const detailedSummary =
      ai.styling_tip?.trim() ||
      rec.extra_tip ||
      '체형 분석 결과를 바탕으로 추천 스타일을 확인하세요.';

    return {
      bodyType,
      proportion,
      limbType,
      buildType,
      shoulderType,
      silhouetteType,
      summary,
      detailedSummary,
      recommendedTops: rec.top ?? [],
      recommendedBottoms: rec.bottom ?? [],
      avoidItems: rec.avoid ?? [],
      stylingTips: [
        rec.fit,
        rec.extra_tip,
        ai.top_explanation || '',
        ai.bottom_explanation || '',
      ].filter(Boolean),
      input: {
        gender: GENDER_MAP[input.gender ?? 'unspecified'] ?? input.gender ?? '-',
        height: input.height_cm ?? '-',
        weight: input.weight_kg ?? '-',
        topSize: input.top_size ?? '-',
        bottomSize: input.bottom_size ?? '-',
        preferredFit: input.preferred_fit ?? '-',
        preferredStyle: input.preferred_style ?? '-',
      },
    };
  }, [analysisResult]);

  if (!uiData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">분석 결과를 불러오지 못했습니다.</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-black text-white rounded-xl"
          >
            다시 분석하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-stone-50"
    >
      <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => window.open('http://localhost:5500/index.html', '_blank')}
            className="text-2xl font-light tracking-tight hover:opacity-70 transition-opacity"
          >
            FashionPeople
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors font-light"
            >
              <ArrowLeft className="w-4 h-4" />
              다시 분석하기
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-light hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" />
              결과 저장
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-light mb-4">
            <CheckCircle2 className="w-4 h-4" />
            분석 완료
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
            체형 분석 및 AI 스타일 추천 결과
          </h1>
          <p className="text-gray-600 font-light text-lg">
            당신에게 맞는 스타일링 가이드를 확인하세요
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 mb-12 text-center"
        >
          <div className="text-white/60 text-sm font-light mb-2">종합 분석 결과</div>
          <div className="text-white text-2xl md:text-3xl font-light tracking-wide">
            {uiData.bodyType} / {uiData.proportion} / {uiData.buildType}
          </div>
          <div className="text-white/70 text-sm mt-3 font-light">
            {uiData.shoulderType} / {uiData.silhouetteType}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-2 lg:grid-cols-6 gap-6 mb-12"
        >
          {[
            ['체형 유형', uiData.bodyType, <User className="w-6 h-6 text-white" />],
            ['비율', uiData.proportion, <Activity className="w-6 h-6 text-white" />],
            ['사지 타입', uiData.limbType, <Ruler className="w-6 h-6 text-white" />],
            ['체격감', uiData.buildType, <Scale className="w-6 h-6 text-white" />],
            ['어깨 인상', uiData.shoulderType, <Shirt className="w-6 h-6 text-white" />],
            ['실루엣', uiData.silhouetteType, <TrendingUp className="w-6 h-6 text-white" />],
          ].map(([label, value, icon], index) => (
            <div key={index} className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-black rounded-2xl flex items-center justify-center mb-4">
                {icon}
              </div>
              <div className="text-sm text-gray-500 mb-2 font-light">{label}</div>
              <div className="text-lg font-light text-gray-900">{value}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-2 space-y-8"
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-light">AI 스타일 추천</h2>
              </div>
              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="text-white text-lg leading-relaxed font-light">
                  {uiData.summary}
                </div>
              </div>
              <p className="text-white/70 leading-relaxed font-light">
                {uiData.detailedSummary}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <Shirt className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-light">추천 상의</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {uiData.recommendedTops.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="font-light">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-light">추천 하의</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {uiData.recommendedBottoms.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="font-light">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-light">피해야 할 스타일</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {uiData.avoidItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="font-light">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 shadow-lg border border-orange-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-light">스타일링 팁</h2>
              </div>
              <ul className="space-y-4">
                {uiData.stylingTips.map((tip, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-orange-600 flex-shrink-0 font-medium">{index + 1}.</span>
                    <span className="font-light leading-relaxed text-gray-800">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-gray-700" />
                <h3 className="text-xl font-light">입력 정보</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs text-gray-500 mb-1 font-light">성별</div>
                  <div className="text-base font-light text-gray-900">{uiData.input.gender}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-xs text-gray-500 mb-1 font-light">키</div>
                    <div className="text-base font-light text-gray-900">{uiData.input.height}cm</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-xs text-gray-500 mb-1 font-light">몸무게</div>
                    <div className="text-base font-light text-gray-900">{uiData.input.weight}kg</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-xs text-gray-500 mb-1 font-light">상의 사이즈</div>
                    <div className="text-base font-light text-gray-900">{uiData.input.topSize}</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-xs text-gray-500 mb-1 font-light">하의 사이즈</div>
                    <div className="text-base font-light text-gray-900">{uiData.input.bottomSize}</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                  <div className="text-xs text-blue-700 mb-1 font-light">선호 핏</div>
                  <div className="text-base font-light text-gray-900">{uiData.input.preferredFit}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                  <div className="text-xs text-purple-700 mb-1 font-light">선호 스타일</div>
                  <div className="text-base font-light text-gray-900">{uiData.input.preferredStyle}</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => navigate('/home')}
                  className="w-full bg-black text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors font-light"
                >
                  <Box className="w-5 h-5" />
                  3D 코디 체험하기
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-gray-600" />
                <h4 className="font-light text-gray-900">분석 결과 해석</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                같은 체형 유형이라도 <span className="text-gray-900 font-normal">체격감</span>,{' '}
                <span className="text-gray-900 font-normal">어깨 인상</span>,{' '}
                <span className="text-gray-900 font-normal">실루엣</span>,{' '}
                <span className="text-gray-900 font-normal">선호 핏</span>,{' '}
                <span className="text-gray-900 font-normal">선호 스타일</span>에 따라 추천 결과가 달라집니다.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
