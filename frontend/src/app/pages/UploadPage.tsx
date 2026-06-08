import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload, Camera, User, ArrowRight, Check } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export default function UploadPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    gender: '',
    height: '',
    weight: '',
    topSize: '',
    bottomSize: '',
    preferredFit: '',
    preferredStyle: '',
  });

  const [imageFiles, setImageFiles] = useState({
    front: null as File | null,
    side: null as File | null,
  });

  const [images, setImages] = useState({
    front: null as string | null,
    side: null as string | null,
  });

  const [loading, setLoading] = useState(false);

  const handleImageUpload = (type: 'front' | 'side', file: File) => {
    setImageFiles((prev) => ({ ...prev, [type]: file }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setImages((prev) => ({ ...prev, [type]: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const isFormValid = () => {
    return (
      formData.gender &&
      formData.height &&
      formData.weight &&
      imageFiles.front &&
      imageFiles.side
    );
  };

  const uploadSingleImage = async (
    sessionId: string,
    imageType: 'front' | 'side',
    file: File
  ) => {
    const genderMap: Record<string, string> = { 남성: 'male', 여성: 'female' };
    const preferredFitMap: Record<string, string> = {
      슬림: 'slim', 레귤러: 'regular', 루즈: 'loose', 오버사이즈: 'oversized',
    };
    const preferredStyleMap: Record<string, string> = {
      캐주얼: 'casual', 포멀: 'formal', 스트릿: 'street',
      미니멀: 'minimal', 빈티지: 'vintage', 스포티: 'sporty',
    };

    const data = new FormData();
    data.append('session_id', sessionId);
    data.append('image_type', imageType);
    data.append('file', file);
    data.append('gender', genderMap[formData.gender] || 'unspecified');
    data.append('height_cm', formData.height);
    data.append('weight_kg', formData.weight);
    data.append('top_size', formData.topSize || '');
    data.append('bottom_size', formData.bottomSize || '');
    data.append('preferred_fit', preferredFitMap[formData.preferredFit] || '');
    data.append('preferred_style', preferredStyleMap[formData.preferredStyle] || '');
    data.append('provider', 'openai');
    data.append('use_ai', 'false'); // 속도를 위해 AI 꺼둠

    const response = await fetch(`${API_BASE}/upload-image`, {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || '업로드 요청 실패');
    }

    return response.json();
  };

  const handleSubmit = async () => {
    if (!isFormValid() || !imageFiles.front || !imageFiles.side) return;

    try {
      setLoading(true);
      const sessionId = `session_${Date.now()}`;

      // 1) 정면 업로드
      await uploadSingleImage(sessionId, 'front', imageFiles.front);

      // 2) 측면 업로드 → 최종 분석 결과
      const finalResponse = await uploadSingleImage(sessionId, 'side', imageFiles.side);

      // 이미지 base64 제외하고 분석 결과만 저장 (용량 초과 방지)
      localStorage.setItem(
        'analysisResult',
        JSON.stringify({
          sessionId,
          userInput: formData,
          apiResponse: finalResponse,
        })
      );

      navigate('/result');
    } catch (error) {
      console.error(error);
      alert('분석 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
            onClick={() => navigate('/home')}
            className="text-2xl font-light tracking-tight hover:opacity-70 transition-opacity"
          >
            FashionPeople
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span className="font-light">분석 시작</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
            체형 분석을 시작합니다
          </h1>
          <p className="text-gray-600 font-light text-lg">
            정확한 분석을 위해 사진과 정보를 입력해 주세요
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-light">사진 업로드</h2>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-3 font-light">정면 사진 *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload('front', e.target.files[0])}
                    className="hidden"
                    id="front-upload"
                  />
                  <label
                    htmlFor="front-upload"
                    className={`block relative h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden ${
                      images.front ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }`}
                  >
                    {images.front ? (
                      <>
                        <img src={images.front} alt="Front" className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-500 font-light">클릭하여 업로드</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-3 font-light">측면 사진 *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload('side', e.target.files[0])}
                    className="hidden"
                    id="side-upload"
                  />
                  <label
                    htmlFor="side-upload"
                    className={`block relative h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden ${
                      images.side ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }`}
                  >
                    {images.side ? (
                      <>
                        <img src={images.side} alt="Side" className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-500 font-light">클릭하여 업로드</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-light">신체 정보</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-light">성별 *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['남성', '여성'].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender })}
                        className={`py-3 rounded-xl text-sm font-light transition-all ${
                          formData.gender === gender
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2 font-light">키 (cm) *</label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="170"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:outline-none transition-colors font-light"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2 font-light">몸무게 (kg) *</label>
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="65"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:outline-none transition-colors font-light"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2 font-light">상의 사이즈</label>
                    <select
                      value={formData.topSize}
                      onChange={(e) => setFormData({ ...formData, topSize: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:outline-none transition-colors font-light bg-white"
                    >
                      <option value="">선택</option>
                      {['XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2 font-light">하의 사이즈</label>
                    <select
                      value={formData.bottomSize}
                      onChange={(e) => setFormData({ ...formData, bottomSize: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:outline-none transition-colors font-light bg-white"
                    >
                      <option value="">선택</option>
                      {['26','28','30','32','34','36'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-light">선호 핏</label>
                  <select
                    value={formData.preferredFit}
                    onChange={(e) => setFormData({ ...formData, preferredFit: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:outline-none transition-colors font-light bg-white"
                  >
                    <option value="">선택</option>
                    {['슬림','레귤러','루즈','오버사이즈'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-light">선호 스타일</label>
                  <select
                    value={formData.preferredStyle}
                    onChange={(e) => setFormData({ ...formData, preferredStyle: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:outline-none transition-colors font-light bg-white"
                  >
                    <option value="">선택</option>
                    {['캐주얼','포멀','스트릿','미니멀','빈티지','스포티'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: isFormValid() && !loading ? 1.02 : 1 }}
              whileTap={{ scale: isFormValid() && !loading ? 0.98 : 1 }}
              onClick={handleSubmit}
              disabled={!isFormValid() || loading}
              className={`w-full py-5 rounded-2xl text-lg font-light flex items-center justify-center gap-3 transition-all ${
                isFormValid() && !loading
                  ? 'bg-black text-white hover:bg-gray-800 shadow-xl hover:shadow-2xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? '분석 중...' : '분석 시작하기'}
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            {!isFormValid() && (
              <p className="text-center text-sm text-gray-500 font-light">
                * 필수 항목을 모두 입력해 주세요
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}