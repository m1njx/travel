import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Coins, Bus, AlertTriangle, ArrowRightLeft, 
  CheckCircle, Landmark, ExternalLink, ChevronDown, ChevronUp, Info
} from 'lucide-react';

const TRANSIT_TIPS = [
  {
    city: '런던',
    country: '영국',
    flag: '🇬🇧',
    tips: [
      '대부분의 튜브(지하철)와 버스는 일반 비접촉식(Contactless) 신용카드나 애플페이로 터치인/터치아웃 가능합니다. 별도의 교통카드가 필요 없습니다.',
      '하루 최대 요금 상한제(Daily Price Cap)가 적용되므로 오이스터 카드를 살 필요 없이 개인 카드로 편리하게 타시면 됩니다.'
    ]
  },
  {
    city: '파리',
    country: '프랑스',
    flag: '🇫🇷',
    tips: [
      '종이 티켓(t+ 티켓)을 사용하는 경우, 지하철 환승 시나 목적지 개찰구를 나갈 때까지 **절대로 버리지 말고 주머니에 잘 보관하세요.**',
      '지하철 통로나 출구에서 불시에 불법 승차 검표를 자주 하며, 티켓이 없거나 훼손된 경우 현장에서 바로 인당 **€35~€50 수준의 무거운 즉시 벌금**을 현금이나 카드로 내야 합니다.',
      '매번 종이 티켓을 사기 번거롭다면 모바일 앱이나 역 창구에서 Navigo Easy(나비고 이지) 충전식 카드를 구매해 충전 사용하는 것을 추천합니다.'
    ]
  },
  {
    city: '인터라켄',
    country: '스위스',
    flag: '🇨🇭',
    tips: [
      '스위스 패스(Swiss Travel Pass) 또는 세이버 데이패스(Saver Day Pass) 소지 시 유람선 및 대부분의 열차를 자유롭게 탑승할 수 있습니다. 단, 융프라우요흐 등 등산열차는 할인권 구매가 필요합니다.',
      '숙소 체크인 시 주는 "인터라켄 게스트 카드"를 챙기면 시내 버스(링 버스 등)를 무료로 이용할 수 있습니다.'
    ]
  },
  {
    city: '뮌헨',
    country: '독일',
    flag: '🇩🇪',
    tips: [
      '지하철(U-Bahn/S-Bahn)을 타기 전 플랫폼 진입로에 있는 파란색 개표기(Entwerter)에 승차권을 집어넣어 **반드시 날짜 도장(Validation)을 찍어야 합니다.**',
      '도장이 찍히지 않은 표는 무표(무임승차)로 간주되어 검표원에게 적발 시 **€60 벌금**이 즉시 부과됩니다. (모바일 티켓이나 1일권 등 이미 날짜가 인쇄된 승차권은 제외)'
    ]
  },
  {
    city: '프라하',
    country: '체코',
    flag: '🇨🇿',
    tips: [
      '트램, 지하철, 버스 승차 시 노란색 개표기에 승차권을 밀어 넣어 펀칭(개표 날짜/시간 인쇄)을 완료해야 합니다.',
      '개표되지 않은 티켓 소지 시 지하철 역 출구 등에서 사복 검표원들이 배지를 보여주며 불시에 검사하며, 위반 시 **1,000 CZK~1,500 CZK 벌금**을 부과합니다.'
    ]
  },
  {
    city: '비엔나',
    country: '오스트리아',
    flag: '🇦🇹',
    tips: [
      '지하철 역 입구의 주황색/파란색 개표기에서 승차권에 날짜 도장을 찍어야 탑승 효력이 인정됩니다.',
      '비엔나는 지하철 출입구 개찰구가 열려 있어 무심코 타기 쉽지만, 지하철 열차 안이나 역 계단에서 검표원들이 퇴로를 차단하고 철저히 검사하므로 반드시 펀칭해야 합니다. 벌금은 약 **€105~€135**입니다.'
    ]
  },
  {
    city: '부다페스트',
    country: '헝가리',
    flag: '🇭🇺',
    tips: [
      '지하철 환승 시나 트램 승차 시 빨간색 또는 주황색 구형 수동 개표기(손으로 당겨 구멍을 뚫는 형식) 혹은 자동 개표기에서 반드시 개표 처리를 해야 합니다.',
      '부다페스트는 유럽 내에서도 검표가 가장 악명 높은 도시 중 하나로, 지하철 입구와 출구 양쪽에서 안내원이 표를 일일이 확인합니다. 규정 위반 시 **12,000 HUF~25,000 HUF**의 현장 벌금이 청구됩니다.'
    ]
  },
  {
    city: '베니스',
    country: '이탈리아',
    flag: '🇮🇹',
    tips: [
      '수상버스(바포레토, Vaporetto)를 타기 전 선착장 입구의 하얀색/노란색 원형 비접촉 리더기에 승차권을 태그(Validation)하여 초록불이 켜지는 것을 꼭 확인해야 합니다.',
      '태그 없이 승차하거나 유효시간이 초과된 경우 현장 벌금이 세게 청구됩니다.'
    ]
  },
  {
    city: '피렌체',
    country: '이탈리아',
    flag: '🇮🇹',
    tips: [
      '피렌체 시내버스는 승차 후 버스 안의 주황색 개표기에 표를 넣어 반드시 도장을 찍어야 합니다.',
      '기차를 이용하여 타 도시로 이동할 때는 Trenitalia(트렌이탈리아) 또는 Italo(이탈로)의 종이 티켓인 경우 플랫폼의 개표 기계에 펀칭하여 날짜 각인을 남기십시오. 모바일 QR 티켓은 출발 전 이메일/앱 내에서 **Check-in(체크인)** 버튼을 눌러 상태를 활성화해야 합니다.'
    ]
  },
  {
    city: '로마',
    country: '이탈리아',
    flag: '🇮🇹',
    tips: [
      '이탈리아 전역의 기차 및 버스는 검표가 매우 엄격합니다. 종이 티켓은 탑승 전 역사 내 초록색/노란색 기계(Validatrice)에 밀어 넣어 펀칭 도장을 꼭 받으세요. 펀칭 누락 시 기차 안에서 표가 있어도 **€50 벌금**이 청구됩니다.',
      '모바일 기차표는 기차 탑승 시간 전까지 공식 앱의 내 티켓 정보에서 **"Check-in/Start Journey"** 버튼을 눌러 승차 처리를 완료해야 벌금을 물지 않습니다.'
    ]
  },
  {
    city: '바르셀로나',
    country: '스페인',
    flag: '🇪🇸',
    tips: [
      '바르셀로나의 대표 대중교통 티켓인 T-casual(10회권) 등은 **1인 전용 카드**이므로 한 장으로 여러 명이 동시에 사용할 수 없습니다.',
      '버스로 환승할 때도 카드리더기에 다시 카드를 넣어 유효성을 입증해야 합니다. (제한 시간 내 환승 시 횟수는 차감되지 않음)'
    ]
  }
];

const TAX_REFUND_COUNTRIES = [
  {
    code: 'FR',
    name: '프랑스 🇫🇷',
    minSpend: 100,
    minSpendText: '€100 초과',
    vatRate: 20,
    refundRate: 12,
    details: '프랑스는 구매 상점당 하루 100유로를 초과하여 구매할 때 신청 가능합니다. 파블로(PABLO) 바코드 기계가 공항에 잘 구비되어 있어 간편하게 자가 세관 처리가 가능합니다.'
  },
  {
    code: 'IT',
    name: '이탈리아 🇮🇹',
    minSpend: 154.95,
    minSpendText: '€154.95 초과',
    vatRate: 22,
    refundRate: 14,
    details: '이탈리아는 최소 구매 한도가 다소 높습니다(154.95유로). 이탈리아 출국 공항(로마 피우미치노 등)의 오텔로(OTELLO) 디지털 부스 혹은 세관 창구에서 확인을 거칩니다.'
  },
  {
    code: 'ES',
    name: '스페인 🇪🇸',
    minSpend: 0,
    minSpendText: '제한 없음 (€0+)',
    vatRate: 21,
    refundRate: 13.7,
    details: '스페인은 2018년부터 최소 구매 금액 한도가 완전히 폐지되었습니다! 단 5유로짜리 기념품을 사도 텍스 리펀 양식 발급이 가능합니다. 공항 DIVA 기기에서 편리하게 바코드를 찍어 승인받을 수 있습니다.'
  },
  {
    code: 'DE',
    name: '독일 🇩🇪',
    minSpend: 50.01,
    minSpendText: '€50.01 이상',
    vatRate: 19,
    refundRate: 11,
    details: '독일은 50.01유로 이상 구매 시 세금 환급이 가능합니다. 영수증과 물품을 지참하고 공항 세관(Zoll)에 직접 서명 도장을 받은 뒤 대행사(글로벌 블루 등)에 제출해야 합니다.'
  },
  {
    code: 'AT',
    name: '오스트리아 🇦🇹',
    minSpend: 75.01,
    minSpendText: '€75.01 이상',
    vatRate: 20,
    refundRate: 12.5,
    details: '오스트리아 비엔나 슈베하트 공항 등에서 출국 시 셀프 스캔 기기 혹은 세관 부스에서 수하물 탑승 전 확인을 거친 후 우체통에 넣어 접수합니다.'
  },
  {
    code: 'CZ',
    name: '체코 🇨🇿',
    minSpend: 2001,
    minSpendText: '2,001 CZK 이상',
    vatRate: 21,
    refundRate: 11.5,
    details: '체코는 자국 통화인 코루나(CZK)를 기준으로 약 2,001코루나 이상 구매 시 환급 신청이 가능합니다. 공항 세관 창구에서 확인 도장을 받아야 합니다.'
  },
  {
    code: 'HU',
    name: '헝가리 🇭🇺',
    minSpend: 75000,
    minSpendText: '75,000 HUF 이상',
    vatRate: 27,
    refundRate: 15,
    details: '헝가리는 부가가치세율이 27%로 유럽 최고 수준이나, 최소 금액 요건이 75,000 포린트(HUF)로 꽤 높은 편입니다. 공항 세관 검사를 거쳐 서류 도장을 획득해야 환급금 수령이 가능합니다.'
  },
  {
    code: 'GB',
    name: '영국 🇬🇧',
    minSpend: Infinity,
    minSpendText: '신청 불가 (제도 폐지)',
    vatRate: 0,
    refundRate: 0,
    details: '⚠️ 영국(런던 등)은 브렉시트(Brexit) 이후 외국인 관광객 대상 세금 환급(Tax Free Shopping) 제도를 전면 폐지했습니다. 영국 내 상점에서 산 물건은 공항에서 텍스 리펀 신청을 하실 수 없으므로 주의하시기 바랍니다.'
  }
];

export default function TravelHelperTools() {
  const [activeTab, setActiveTab] = useState('timezone'); // timezone, transit, taxrefund

  // 1. Timezone variables
  const [timeState, setTimeState] = useState({
    kst: '',
    cet: '',
    bst: ''
  });
  const [useUkTime, setUkTime] = useState(false);

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      
      // Korea Time (KST, UTC+9)
      const kstStr = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      // Central Europe Time (CET/CEST, UTC+2 in summer)
      const cetStr = now.toLocaleTimeString('ko-KR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      // London Time (BST, UTC+1 in summer)
      const bstStr = now.toLocaleTimeString('ko-KR', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      setTimeState({ kst: kstStr, cet: cetStr, bst: bstStr });
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timezone advice message based on KST hour (0-23)
  const getCallHomeAdvice = () => {
    const nowKst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const kstHour = nowKst.getHours();

    if (kstHour >= 0 && kstHour < 7) {
      return {
        icon: '💤',
        style: 'bg-indigo-50 border-indigo-100 text-indigo-800',
        text: '한국은 지금 깊은 밤(새벽)입니다. 가족들이 자고 있을 시간이니 긴급한 용무 외에는 연락을 미루는 것이 좋습니다.'
      };
    } else if (kstHour >= 7 && kstHour < 9) {
      return {
        icon: '🌅',
        style: 'bg-amber-50 border-amber-100 text-amber-800',
        text: '한국은 이른 아침 시간대입니다. 출근/등교 준비 등으로 바쁠 수 있으니 참고하세요.'
      };
    } else if (kstHour >= 9 && kstHour < 22) {
      return {
        icon: '📞',
        style: 'bg-toss-blue-light/50 border-toss-blue/10 text-toss-blue',
        text: '한국과 실시간으로 연락(전화/카카오톡)하기 아주 좋은 골든 타임입니다!'
      };
    } else {
      return {
        icon: '🌙',
        style: 'bg-purple-50 border-purple-100 text-purple-800',
        text: '한국은 늦은 밤(취침 직전)입니다. 간단한 안부 카카오톡 정도를 보내기 적합합니다.'
      };
    }
  };

  const currentAdvice = getCallHomeAdvice();
  const timeDifference = useUkTime ? '-8시간' : '-7시간';
  const currentLocalTime = useUkTime ? timeState.bst : timeState.cet;
  const currentLocalLabel = useUkTime ? '영국 (런던)' : '유럽 대륙 (파리/로마/뮌헨 등)';

  // 2. Tax Refund variables
  const [selectedCountryCode, setSelectedCountryCode] = useState('FR');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [refundResult, setRefundResult] = useState(null);

  const selectedCountry = TAX_REFUND_COUNTRIES.find(c => c.code === selectedCountryCode);

  const handleCalculateTax = () => {
    if (!purchaseAmount || isNaN(purchaseAmount)) {
      setRefundResult(null);
      return;
    }

    const amt = parseFloat(purchaseAmount);
    
    if (selectedCountry.code === 'GB') {
      setRefundResult({
        qualified: false,
        reason: '영국은 텍스 리펀 제도가 폐지되었습니다.'
      });
      return;
    }

    if (amt < selectedCountry.minSpend) {
      setRefundResult({
        qualified: false,
        reason: `최소 구매 금액(${selectedCountry.minSpendText})에 미치지 못합니다.`
      });
    } else {
      const estimatedRefund = Math.round(amt * (selectedCountry.refundRate / 100) * 100) / 100;
      setRefundResult({
        qualified: true,
        estimatedRefund: estimatedRefund
      });
    }
  };

  // 3. Transit Tips variables
  const [selectedCityTip, setSelectedCityTip] = useState('런던');
  const currentCityTip = TRANSIT_TIPS.find(t => t.city === selectedCityTip);

  return (
    <div className="toss-card p-6 flex flex-col justify-between w-full mt-6 bg-white border border-toss-border/60 rounded-3xl shadow-sm text-left">
      <div>
        {/* Header Title */}
        <div className="flex items-center justify-between mb-4 border-b border-toss-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">🧳</span>
            <div>
              <h3 className="text-[15px] font-bold text-toss-text-primary">
                유럽 여행 도구 & 교통 꿀팁
              </h3>
              <p className="text-[10px] text-toss-text-secondary mt-0.5">
                시차 비교, 세금 환급 계산 및 대중교통 주의사항
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-toss-bg p-1 rounded-xl mb-5 border border-toss-border/50">
          <button
            onClick={() => setActiveTab('timezone')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'timezone'
                ? 'bg-white text-toss-blue shadow-sm'
                : 'text-toss-text-secondary hover:text-toss-text-primary'
            }`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1.5" />
            시차 비교
          </button>
          <button
            onClick={() => setActiveTab('taxrefund')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'taxrefund'
                ? 'bg-white text-toss-blue shadow-sm'
                : 'text-toss-text-secondary hover:text-toss-text-primary'
            }`}
          >
            <Coins className="w-3.5 h-3.5 inline mr-1.5" />
            텍스 리펀
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'transit'
                ? 'bg-white text-toss-blue shadow-sm'
                : 'text-toss-text-secondary hover:text-toss-text-primary'
            }`}
          >
            <Bus className="w-3.5 h-3.5 inline mr-1.5" />
            대중교통 팁
          </button>
        </div>

        {/* Tab 1: Timezone Comparison */}
        {activeTab === 'timezone' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-toss-bg/50 border border-toss-border/30 p-3 rounded-2xl">
              <span className="text-[11px] font-bold text-toss-text-secondary">여행 지역 선택</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setUkTime(false)}
                  className={`px-3 py-1 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer ${
                    !useUkTime 
                      ? 'bg-toss-blue/15 border-toss-blue/30 text-toss-blue' 
                      : 'bg-white border-toss-border text-toss-text-secondary'
                  }`}
                >
                  유럽 대륙 (프랑스 등)
                </button>
                <button
                  onClick={() => setUkTime(true)}
                  className={`px-3 py-1 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer ${
                    useUkTime 
                      ? 'bg-toss-blue/15 border-toss-blue/30 text-toss-blue' 
                      : 'bg-white border-toss-border text-toss-text-secondary'
                  }`}
                >
                  영국 (런던)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* KST Clock */}
              <div className="bg-toss-bg/50 border border-toss-border/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-toss-text-secondary mb-1">🇰🇷 한국 시간 (KST)</span>
                <span className="text-[17px] font-black text-slate-800 font-mono tracking-tight">{timeState.kst || '--:--:--'}</span>
                <span className="text-[10px] text-toss-text-tertiary mt-0.5">UTC +09:00</span>
              </div>

              {/* Local Clock */}
              <div className="bg-toss-blue/5 border border-toss-blue/10 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-toss-blue mb-1">🇪🇺 {currentLocalLabel}</span>
                <span className="text-[17px] font-black text-toss-blue font-mono tracking-tight">{currentLocalTime || '--:--:--'}</span>
                <span className="text-[10px] text-toss-blue/70 mt-0.5">한국 대비 {timeDifference}</span>
              </div>
            </div>

            {/* Advice notice */}
            <div className={`p-4 rounded-2xl border ${currentAdvice.style} flex items-start gap-2.5 transition-all`}>
              <span className="text-[18px] leading-none shrink-0">{currentAdvice.icon}</span>
              <div className="text-[11.5px] leading-relaxed font-bold">
                {currentAdvice.text}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tax Refund */}
        {activeTab === 'taxrefund' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Select Country */}
              <div>
                <label className="text-[10px] font-bold text-toss-text-secondary uppercase tracking-wider block mb-1.5">
                  구매 국가
                </label>
                <select
                  value={selectedCountryCode}
                  onChange={(e) => {
                    setSelectedCountryCode(e.target.value);
                    setRefundResult(null);
                  }}
                  className="w-full bg-toss-bg border border-toss-border rounded-xl px-3 py-2 text-[12px] font-bold text-toss-text-primary focus:outline-none focus:border-toss-blue cursor-pointer"
                >
                  {TAX_REFUND_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase amount */}
              <div>
                <label className="text-[10px] font-bold text-toss-text-secondary uppercase tracking-wider block mb-1.5">
                  구매 총액
                </label>
                <div className="flex items-center gap-1.5 bg-toss-bg border border-toss-border rounded-xl px-3 py-2 focus-within:border-toss-blue">
                  <span className="text-[12px] font-bold text-toss-text-secondary">
                    {selectedCountryCode === 'CZ' ? 'CZK' : selectedCountryCode === 'HU' ? 'HUF' : 'EUR (€)'}
                  </span>
                  <input
                    type="number"
                    placeholder="금액을 입력하세요"
                    value={purchaseAmount}
                    onChange={(e) => {
                      setPurchaseAmount(e.target.value);
                      setRefundResult(null);
                    }}
                    className="flex-1 bg-transparent border-none text-[12px] font-bold text-toss-text-primary p-0 focus:outline-none focus:ring-0 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateTax}
              className="w-full py-3 bg-toss-blue hover:bg-blue-600 text-white rounded-xl text-[12px] font-bold transition-all active:scale-98 cursor-pointer text-center shadow-md shadow-toss-blue/10"
            >
              예상 환급액 계산하기
            </button>

            {/* Calculation Result */}
            {refundResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border ${
                  refundResult.qualified
                    ? 'bg-emerald-50/50 border-emerald-100/70 text-emerald-800'
                    : 'bg-red-50/50 border-red-100/70 text-red-800'
                }`}
              >
                {refundResult.qualified ? (
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-[13px] text-emerald-900 mb-1">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                      <span>텍스 리펀 신청이 가능합니다!</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed">
                      예상 환급율은 약 **{selectedCountry.refundRate}%**이며, 예상되는 세금 환급액은 약{' '}
                      <span className="underline decoration-2 font-black text-emerald-600">
                        {selectedCountryCode === 'CZ'
                          ? `${refundResult.estimatedRefund.toLocaleString()} CZK`
                          : selectedCountryCode === 'HU'
                          ? `${refundResult.estimatedRefund.toLocaleString()} HUF`
                          : `€${refundResult.estimatedRefund.toLocaleString()}`}
                      </span>{' '}
                      입니다. (환급 대행사에 따라 수수료 등이 차감되어 실제 수령액은 차이가 날 수 있습니다.)
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-[13px] text-red-900 mb-1">
                      <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                      <span>텍스 리펀을 신청할 수 없습니다.</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed font-bold">
                      사유: {refundResult.reason}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Country specifics and Guide */}
            <div className="bg-toss-bg/50 border border-toss-border/50 p-4 rounded-2xl">
              <div className="flex gap-2 items-start text-toss-text-primary text-[11px] leading-relaxed mb-3 font-semibold">
                <Info className="w-4 h-4 text-toss-blue shrink-0 mt-0.5" />
                <p>{selectedCountry.details}</p>
              </div>

              <div className="border-t border-toss-border/30 pt-3">
                <span className="text-[10px] font-bold text-toss-text-secondary block mb-2 uppercase">유럽 텍스 리펀 핵심 체크리스트</span>
                <ul className="space-y-1.5 text-[10.5px] text-toss-text-primary font-medium">
                  <li className="flex items-start gap-1.5">
                    <span className="text-toss-blue font-bold">1.</span>
                    <span>물품 구매 시 매장에서 여권을 제시하고 **Tax Free 양식(서류)**을 요청해 받으세요.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-toss-blue font-bold">2.</span>
                    <span>**EU 최종 출국 공항**(예: 마지막 여행지 공항)의 세관 창구나 키오스크에서 바코드를 스캔해 세관 확인 도장을 받으세요.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-toss-blue font-bold">3.</span>
                    <span>세관 승인을 마친 서류를 대행사 봉투에 넣어 공항 내 전용 우체통에 투입하거나 창구에서 수령하세요. **(세관 도장을 받기 전까지 절대 짐을 수하물로 부치면 안 됩니다!)**</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Transit Tips */}
        {activeTab === 'transit' && (
          <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {TRANSIT_TIPS.map((item) => (
                <button
                  key={item.city}
                  type="button"
                  onClick={() => setSelectedCityTip(item.city)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                    selectedCityTip === item.city
                      ? 'bg-toss-blue-light text-toss-blue border-toss-blue/20'
                      : 'bg-white text-toss-text-secondary border-toss-border hover:bg-toss-bg'
                  }`}
                >
                  {item.flag} {item.city}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCityTip}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
                className="bg-toss-bg/50 border border-toss-border/50 p-4.5 rounded-2xl space-y-3.5"
              >
                <div className="flex items-center justify-between border-b border-toss-border/30 pb-2">
                  <span className="text-[12.5px] font-extrabold text-toss-text-primary flex items-center gap-1">
                    {currentCityTip.flag} {currentCityTip.country} {currentCityTip.city} 대중교통 안내
                  </span>
                  <span className="text-[9px] font-extrabold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                    ⚠️ 벌금 주의지역
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentCityTip.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0 mt-1.5" />
                      <p 
                        className="text-[11px] font-semibold text-toss-text-primary leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: tip.replace(/\*\*(.*?)\*\*/g, '<strong class="text-red-600 font-extrabold">$1</strong>') }}
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-red-50/50 border border-red-100/70 p-3 rounded-xl flex items-start gap-2 text-red-700 text-[10.5px] font-bold leading-relaxed shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p>
                    유럽은 개찰구 없는 검표원 불시 검문이 잦습니다. 종이 티켓은 각인을 누락하지 마시고, 목적지에 하차해 나갈 때까지 표를 버리지 마세요!
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
