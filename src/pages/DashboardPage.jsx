import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Wallet, Backpack, Sparkles, CheckCircle2, Circle, 
  ChevronRight, TrendingUp, AlertCircle, RefreshCw, Compass, ArrowRight,
  Plus, Edit2, Check, X,
  Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle
} from 'lucide-react';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { convertToKRW, formatKRW, fetchExchangeRates } from '../utils/exchangeRate';
import { getAITravelTip } from '../utils/gemini';

const WMO_WEATHER_MAP = {
  0: { label: '맑음', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  1: { label: '대체로 맑음', icon: CloudSun, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  2: { label: '구름 조금', icon: CloudSun, color: 'text-slate-400', bg: 'bg-slate-400/10' },
  3: { label: '흐림', icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  45: { label: '안개', icon: Cloud, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
  48: { label: '짙은 안개', icon: Cloud, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
  51: { label: '가벼운 이슬비', icon: CloudDrizzle, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  53: { label: '이슬비', icon: CloudDrizzle, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  55: { label: '짙은 이슬비', icon: CloudDrizzle, color: 'text-sky-600', bg: 'bg-sky-600/10' },
  61: { label: '가벼운 비', icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  63: { label: '비', icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  65: { label: '강한 비', icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-600/10' },
  71: { label: '가벼운 눈', icon: CloudSnow, color: 'text-teal-300', bg: 'bg-teal-300/10' },
  73: { label: '눈', icon: CloudSnow, color: 'text-teal-400', bg: 'bg-teal-400/10' },
  75: { label: '강한 눈', icon: CloudSnow, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  77: { label: '싸락눈', icon: CloudSnow, color: 'text-teal-600', bg: 'bg-teal-600/10' },
  80: { label: '소나기', icon: CloudRain, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  81: { label: '강한 소나기', icon: CloudRain, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  82: { label: '폭우', icon: CloudRain, color: 'text-indigo-600', bg: 'bg-indigo-600/10' },
  85: { label: '가벼운 소낙눈', icon: CloudSnow, color: 'text-sky-300', bg: 'bg-sky-300/10' },
  86: { label: '소낙눈', icon: CloudSnow, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  95: { label: '뇌우', icon: CloudLightning, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  96: { label: '우박을 동반한 뇌우', icon: CloudLightning, color: 'text-yellow-600', bg: 'bg-yellow-600/10' },
  99: { label: '강한 우박을 동반한 뇌우', icon: CloudLightning, color: 'text-yellow-700', bg: 'bg-yellow-700/10' }
};

const getWeatherDetails = (code) => {
  return WMO_WEATHER_MAP[code] || { label: '날씨 정보 없음', icon: Cloud, color: 'text-slate-400', bg: 'bg-slate-400/10' };
};

const DEFAULT_TIPS = [
  "✈️ 여권 사본을 이메일이나 클라우드에 업로드해두면 현지 분실 시 재발급 시간을 대폭 단축할 수 있습니다.",
  "💳 유럽 식당 및 매장 결제 시 현지 통화(EUR 등)를 선택해야 이중 환전 수수료(DCC) 폭탄을 피할 수 있습니다.",
  "🎟️ 파리 루브르 박물관이나 로마 콜로세움 등 인기 명소는 현장 구매가 불가능한 경우가 많으니 최소 2~3주 전 사전 예약을 잊지 마세요!",
  "🎒 기차나 버스로 이동 시 귀중품이 든 가방은 항상 몸 앞쪽으로 매고, 지퍼는 클립이나 자물쇠로 잠그는 것이 소매치기 예방에 효과적입니다.",
  "💧 식당에서 물을 주문할 때 탄산수가 아닌 일반 생수를 원한다면 '스틸 워터(Still Water)' 혹은 현지어로 '아쿠아 나투랄레(Naturale)'를 요청하세요.",
  "⏰ 유레일패스나 미술관 패스 등은 첫 사용 개시일(Validation) 오전 일찍 시작해야 하루 치 기간을 온전히 절약할 수 있습니다."
];

export default function DashboardPage({ schedulesSync, checklistsSync, expensesSync, members, nickname, apiKey }) {
  const schedules = schedulesSync?.items || [];
  const checklists = checklistsSync?.items || [];
  const expenses = expensesSync?.items || [];

  // Exchange rates state
  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Budget states
  const [totalBudget, setTotalBudget] = useState(() => {
    const saved = localStorage.getItem('tripsync_total_budget');
    return saved ? parseInt(saved, 10) : 3000000; // Default 3 million KRW
  });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(totalBudget));

  // AI travel tip states
  const [aiTip, setAiTip] = useState(() => {
    return localStorage.getItem('tripsync_dashboard_ai_tip') || DEFAULT_TIPS[0];
  });
  const [loadingTip, setLoadingTip] = useState(false);
  const [tipError, setTipError] = useState(null);

  // Load exchange rates
  useEffect(() => {
    const loadRates = async () => {
      try {
        setRatesLoading(true);
        const res = await fetchExchangeRates();
        setRates(res.rates);
      } catch (e) {
        console.error(e);
      } finally {
        setRatesLoading(false);
      }
    };
    loadRates();
  }, []);

  // Weather states
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // Fetch local weather based on geolocation
  useEffect(() => {
    let isMounted = true;
    
    const fetchWeather = async (lat, lon, isFallback = false) => {
      try {
        // 1. Get localized city name using OSM Nominatim reverse geocoding
        let cityName = isFallback ? '프랑스 파리' : '내 위치';
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
            {
              headers: {
                'User-Agent': 'TripSyncTravelPlanner/2.0'
              }
            }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const address = geoData.address;
            const city = address.city || address.town || address.village || address.borough || address.suburb || address.city_district || address.province || '';
            const county = address.county || address.district || '';
            cityName = city ? `${city} ${county}`.trim() : (geoData.display_name?.split(',')[0] || cityName);
            if (cityName.length > 15) {
              cityName = cityName.split(' ').slice(0, 2).join(' ');
            }
          }
        } catch (err) {
          console.warn('Reverse geocoding failed, using default name', err);
        }

        // 2. Fetch current weather from Open-Meteo
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
        );
        if (!weatherRes.ok) throw new Error('날씨 데이터를 가져올 수 없습니다.');
        const weatherData = await weatherRes.json();
        const current = weatherData.current_weather;
        
        if (isMounted) {
          const details = getWeatherDetails(current.weathercode);
          setWeather({
            temp: Math.round(current.temperature * 10) / 10,
            code: current.weathercode,
            label: details.label,
            icon: details.icon,
            color: details.color,
            bg: details.bg,
            cityName
          });
          setWeatherError(null);
          setWeatherLoading(false);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        if (isMounted) {
          setWeatherError('날씨 로드 실패');
          setWeatherLoading(false);
        }
      }
    };

    const getPositionAndFetch = () => {
      if (!navigator.onLine) {
        setWeatherError('오프라인 상태');
        setWeatherLoading(false);
        return;
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeather(latitude, longitude, false);
          },
          (error) => {
            console.warn('Geolocation denied or failed, falling back to Paris:', error);
            fetchWeather(48.8566, 2.3522, true); // Fallback to Paris
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        );
      } else {
        fetchWeather(48.8566, 2.3522, true); // Fallback to Paris
      }
    };

    getPositionAndFetch();

    return () => {
      isMounted = false;
    };
  }, []);

  // Budget calculations
  const totalSpentKRW = expenses.reduce((a, e) => {
    const r = e.rateSnapshot || rates;
    return a + (r ? convertToKRW(e.amount, e.currency, r) : 0);
  }, 0);

  const remainingBudget = totalBudget - totalSpentKRW;
  const budgetProgress = totalBudget > 0 ? Math.min(Math.round((totalSpentKRW / totalBudget) * 100), 100) : 0;

  const handleSaveBudget = () => {
    const val = parseInt(budgetInput.replace(/,/g, ''), 10);
    if (!isNaN(val) && val >= 0) {
      setTotalBudget(val);
      localStorage.setItem('tripsync_total_budget', String(val));
      setIsEditingBudget(false);
    }
  };

  // D-Day Calculations
  const getDDayInfo = () => {
    const validSchedules = schedules.filter(s => s.date && s.date !== '날짜 미정');
    if (validSchedules.length === 0) {
      return { dDayText: 'D-?', subText: '일정을 등록해주세요 🗓️', targetDate: null };
    }

    // Sort to find the earliest schedule date
    const sorted = [...validSchedules].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstTripDate = new Date(sorted[0].date);
    firstTripDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = firstTripDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let dDayText = '';
    let subText = `${sorted[0].title} 시작일까지`;

    if (diffDays > 0) {
      dDayText = `D-${diffDays}`;
    } else if (diffDays === 0) {
      dDayText = 'D-Day';
      subText = '설레는 첫 일정이 오늘 시작됩니다! 🎉';
    } else {
      dDayText = `D+${Math.abs(diffDays)}`;
      subText = '여행이 시작되었습니다! ✈️';
    }

    return { dDayText, subText, targetDate: sorted[0].date };
  };

  const { dDayText, subText, targetDate } = getDDayInfo();

  // Checklist Progress
  const totalChecklist = checklists.length;
  const completedChecklist = checklists.filter(c => c.completed).length;
  const checklistRate = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Get 3 incomplete personal items for quick action
  const quickChecklistItems = checklists
    .filter(c => !c.completed && (c.type === 'personal' && c.assignedTo === nickname))
    .slice(0, 3);

  // Active or Upcoming Timeline
  const getTimelineSchedule = () => {
    if (schedules.length === 0) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    // Try to find schedule for today
    const todaySchedule = schedules.find(s => s.date === todayStr);
    if (todaySchedule) return { schedule: todaySchedule, label: '오늘의 코스 📍' };

    // Try to find the closest upcoming schedule
    const upcomingSchedules = schedules
      .filter(s => s.date && s.date !== '날짜 미정' && new Date(s.date) >= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcomingSchedules.length > 0) {
      return { schedule: upcomingSchedules[0], label: `다음 일정 코스 (${upcomingSchedules[0].date}) 📍` };
    }

    // Default to the first one available
    return { schedule: schedules[0], label: `${schedules[0].title} 코스 📍` };
  };

  const activeTimeline = getTimelineSchedule();

  // Fetch new AI recommendation tip
  const handleGetAITip = async () => {
    if (!apiKey) {
      setTipError('설정 페이지에서 Gemini API Key를 등록해주시면 AI가 맞춤형 팁을 실시간으로 분석해 드립니다!');
      return;
    }
    setLoadingTip(true);
    setTipError(null);
    try {
      const tipText = await getAITravelTip(schedules, checklists, expenses, apiKey);
      if (tipText) {
        setAiTip(tipText);
        localStorage.setItem('tripsync_dashboard_ai_tip', tipText);
      }
    } catch (e) {
      console.error(e);
      setTipError(e.message || 'AI 팁 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoadingTip(false);
    }
  };

  // Rotate local tip if offline or no api key
  const handleRotateLocalTip = () => {
    const currentIndex = DEFAULT_TIPS.indexOf(aiTip);
    const nextIndex = (currentIndex + 1) % DEFAULT_TIPS.length;
    setAiTip(DEFAULT_TIPS[nextIndex]);
  };

  const pageVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 150 } }
  };

  return (
    <motion.div 
      variants={pageVariants} 
      initial="hidden" 
      animate="visible" 
      className="pb-8 space-y-6 px-4 sm:px-5"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-extrabold text-toss-text-primary tracking-tight">
            안녕하세요, {nickname}님 👋
          </h1>
          <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">
            TripSync와 함께 설레는 유럽 여행을 가꿔보세요!
          </p>
        </div>
        
        {/* Weather & Connectivity Info */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          {/* Real-time Weather Badge */}
          {weatherLoading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-md border border-toss-border/50 rounded-2xl shadow-sm text-toss-text-secondary text-[11px] font-semibold animate-pulse">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-toss-blue/20 border-t-toss-blue animate-spin" />
              <span>날씨 정보 불러오는 중...</span>
            </div>
          ) : weatherError ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 backdrop-blur-md border border-toss-border/50 rounded-2xl shadow-sm text-toss-text-tertiary text-[11px] font-semibold">
              <span className="text-[12px]">⚠️</span>
              <span>{weatherError === '오프라인 상태' ? '날씨 정보 오프라인' : '파리 날씨 로드 실패'}</span>
            </div>
          ) : weather ? (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-white/80 backdrop-blur-lg border border-toss-border/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className={`p-1.5 rounded-xl ${weather.bg}`}>
                <weather.icon 
                  className={`w-4 h-4 ${weather.color} ${weather.code === 0 ? 'animate-spin' : ''}`} 
                  style={weather.code === 0 ? { animationDuration: '12s' } : undefined} 
                />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-extrabold text-toss-text-primary leading-none">{weather.cityName}</span>
                  <span className="text-[11.5px] font-extrabold text-toss-blue tabular-nums leading-none">{weather.temp}°C</span>
                </div>
                <p className="text-[9.5px] font-semibold text-toss-text-secondary mt-0.5 leading-none">{weather.label}</p>
              </div>
            </motion.div>
          ) : null}

          <div className="flex items-center gap-1.5 px-3 py-2 bg-toss-blue-light/50 border border-toss-blue/10 rounded-2xl text-toss-blue text-[11px] font-extrabold shadow-sm shadow-toss-blue/5">
            <span className="w-1.5 h-1.5 bg-toss-blue rounded-full animate-pulse" />
            <span>실시간 연동 중</span>
          </div>
        </div>
      </motion.div>

      {/* Grid: 3 Core Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Widget 1: D-Day Countdown Card */}
        <motion.div 
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-toss-blue to-indigo-600 text-white p-5 flex flex-col justify-between shadow-lg shadow-toss-blue/15 min-h-[170px]"
        >
          {/* Subtle plane icon background */}
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
            <Compass className="w-48 h-48 rotate-12" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] sm:text-[13px] font-bold tracking-wider opacity-85 uppercase">유럽 여행 D-Day</span>
              <Calendar className="w-4.5 h-4.5 opacity-80" />
            </div>
            <p className="text-[34px] sm:text-[38px] md:text-[42px] font-extrabold tracking-tight tabular-nums">
              {dDayText}
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/15 mt-3">
            <p className="text-[11px] sm:text-[12px] opacity-80 font-medium truncate">{subText}</p>
            {targetDate && <p className="text-[10px] opacity-60 mt-0.5">출발 예정: {targetDate}</p>}
          </div>
        </motion.div>

        {/* Widget 2: Circular/Bar Checklist Progress Card */}
        <motion.div 
          variants={itemVariants}
          className="toss-card flex flex-col justify-between min-h-[170px]"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-toss-text-secondary">체크리스트 준비율</span>
              <Backpack className="w-4.5 h-4.5 text-toss-blue" />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[28px] sm:text-[32px] font-extrabold text-toss-text-primary tabular-nums">
                {checklistRate}%
              </span>
              <span className="text-[11px] font-semibold text-toss-text-secondary bg-toss-bg px-2 py-0.5 rounded-full mt-1.5">
                {completedChecklist}/{totalChecklist} 완료
              </span>
            </div>

            {/* Toss style progress bar */}
            <div className="w-full h-2 bg-toss-bg rounded-full overflow-hidden mt-3.5">
              <div 
                className="h-full bg-toss-blue rounded-full transition-all duration-700" 
                style={{ width: `${checklistRate}%` }}
              />
            </div>
          </div>

          {/* Quick checklist action */}
          {quickChecklistItems.length > 0 ? (
            <div className="border-t border-toss-border/50 pt-3 mt-4 space-y-1.5">
              <p className="text-[10.5px] font-bold text-toss-text-tertiary">내 빠른 체크리스트</p>
              {quickChecklistItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => checklistsSync.updateItem({ ...item, completed: true })}
                  className="flex items-center gap-2 group cursor-pointer active:opacity-70 text-[11px] font-medium text-toss-text-secondary hover:text-toss-blue transition-all"
                >
                  <Circle className="w-3.5 h-3.5 text-toss-text-tertiary group-hover:text-toss-blue shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10.5px] text-toss-text-tertiary italic text-center mt-4">
              {totalChecklist === 0 ? "준비물 탭에서 물품을 등록해보세요 🎒" : "내 준비물이 모두 완료되었습니다! ✨"}
            </p>
          )}
        </motion.div>

        {/* Widget 3: Budget Balance Card */}
        <motion.div 
          variants={itemVariants}
          className="toss-card flex flex-col justify-between min-h-[170px]"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-toss-text-secondary">여행 남은 예산</span>
              {isEditingBudget ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleSaveBudget} className="p-1 text-toss-success hover:bg-toss-bg rounded-md btn-icon-sm">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setBudgetInput(String(totalBudget)); setIsEditingBudget(false); }} className="p-1 text-toss-text-tertiary hover:bg-toss-bg rounded-md btn-icon-sm">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditingBudget(true)} className="p-1 hover:bg-toss-bg rounded-md text-toss-text-secondary btn-icon-sm">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditingBudget ? (
              <div className="mt-1">
                <input 
                  type="text" 
                  value={budgetInput} 
                  onChange={e => setBudgetInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-toss-bg rounded-lg text-[13px] font-bold border border-toss-blue outline-none"
                  autoFocus
                  placeholder="예산 입력(원)"
                />
                <span className="text-[9.5px] text-toss-text-tertiary mt-1 block">원화(KRW) 기준으로 입력해주세요.</span>
              </div>
            ) : (
              <div>
                <p className={`text-[25px] sm:text-[28px] font-extrabold tracking-tight tabular-nums ${remainingBudget < 0 ? 'text-toss-danger' : 'text-toss-text-primary'}`}>
                  {remainingBudget < 0 ? `-₩${formatKRW(Math.abs(remainingBudget))}` : `₩${formatKRW(remainingBudget)}`}
                </p>
                <div className="flex items-center justify-between text-[10.5px] text-toss-text-secondary mt-1">
                  <span>총 예산: ₩{formatKRW(totalBudget)}</span>
                  <span>지출: ₩{formatKRW(totalSpentKRW)}</span>
                </div>
              </div>
            )}

            {/* Toss style budget bar */}
            {!isEditingBudget && (
              <div className="w-full h-2 bg-toss-bg rounded-full overflow-hidden mt-3">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${budgetProgress > 85 ? 'bg-red-500' : 'bg-toss-blue'}`} 
                  style={{ width: `${budgetProgress}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[9.5px] text-toss-text-tertiary border-t border-toss-border/50 pt-2.5 mt-3">
            <span>실시간 환율 변환 적용 완료</span>
            {ratesLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
          </div>
        </motion.div>
      </div>

      {/* Grid: Timeline and AI Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Side (8/12 col): Timeline Course */}
        <motion.div 
          variants={itemVariants}
          className="toss-card md:col-span-7 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-[15px] font-bold text-toss-text-primary mb-4 flex items-center gap-1.5">
              <span>🗺️</span> {activeTimeline ? activeTimeline.label : '일정 타임라인'}
            </h3>

            {activeTimeline && activeTimeline.schedule.places?.length > 0 ? (
              <div className="relative pl-6 space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {/* Timeline vertical rule */}
                <div className="absolute left-[9.5px] top-2 bottom-6 w-0.5 bg-toss-border/80 border-dashed border-l" />

                {[...activeTimeline.schedule.places]
                  .sort((a, b) => {
                    if (!a.time && !b.time) return 0;
                    if (!a.time) return 1;
                    if (!b.time) return -1;
                    return a.time.localeCompare(b.time);
                  })
                  .map((place, idx) => (
                    <div key={place.id} className="relative flex gap-3 group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[22px] top-1 z-10 shrink-0">
                        <button
                          onClick={() => {
                            const updatedPlaces = activeTimeline.schedule.places.map(p => 
                              p.id === place.id ? { ...p, completed: !p.completed } : p
                            );
                            schedulesSync.updateItem({ ...activeTimeline.schedule, places: updatedPlaces });
                          }}
                          className="w-5 h-5 bg-white border-2 border-toss-blue rounded-full flex items-center justify-center shadow-sm text-toss-blue hover:bg-toss-blue-light transition-all active:scale-90"
                        >
                          {place.completed ? (
                            <div className="w-2.5 h-2.5 bg-toss-blue rounded-full" />
                          ) : (
                            <span className="text-[9px] font-extrabold">{idx + 1}</span>
                          )}
                        </button>
                      </div>

                      <div className="flex-1 min-w-0 bg-toss-bg/30 group-hover:bg-toss-bg/60 p-2.5 rounded-xl transition-all border border-transparent hover:border-toss-border/40">
                        <div className="flex items-center gap-2 flex-wrap">
                          {place.time && (
                            <span className="text-[9.5px] font-bold bg-toss-blue/10 text-toss-blue px-1.5 py-0.5 rounded">
                              ⏰ {place.time}
                            </span>
                          )}
                          <p className={`text-[12.5px] font-bold ${place.completed ? 'line-through text-toss-text-tertiary' : 'text-toss-text-primary'}`}>
                            {place.name}
                          </p>
                        </div>
                        {place.memo && (
                          <p className="text-[11px] text-toss-text-secondary mt-1 leading-relaxed">{place.memo}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-toss-text-secondary">
                <div className="w-10 h-10 bg-toss-bg rounded-full flex items-center justify-center mb-2.5">
                  <Compass className="w-5 h-5 text-toss-text-tertiary animate-spin-slow" style={{ animationDuration: '8s' }} />
                </div>
                <p className="text-[13px] font-semibold text-toss-text-primary">타임라인에 표시할 일정이 없습니다</p>
                <p className="text-[11px] text-toss-text-tertiary max-w-[200px] mt-0.5 leading-relaxed">
                  일정 탭에서 하루 계획을 짜고 세부 방문 장소들을 등록해보세요!
                </p>
              </div>
            )}
          </div>

          {activeTimeline && (
            <div className="border-t border-toss-border/50 pt-3 mt-4 flex justify-between items-center text-[11px] text-toss-blue font-bold shrink-0">
              <span>{activeTimeline.schedule.title} 전체 일정 코스</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </motion.div>

        {/* Right Side (5/12 col): Premium Dynamic AI Recommendation Tips Card */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-5.5 text-white flex flex-col justify-between shadow-lg shadow-indigo-950/20 min-h-[300px] border border-white/10"
        >
          {/* Decorative glowing gradient circle */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center gap-1.5 mb-4 shrink-0">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-toss-blue-light animate-pulse">
                <Sparkles className="w-4 h-4 text-toss-blue" fill="#3182f6" />
              </div>
              <h3 className="text-[14px] font-extrabold tracking-tight">TripSync AI 가이드 팁</h3>
            </div>

            {tipError && (
              <div className="p-3 bg-red-500/10 text-red-300 rounded-xl text-[11px] font-medium flex items-start gap-1.5 border border-red-500/20 mb-3 shrink-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{tipError}</div>
              </div>
            )}

            <div className="flex-1 flex items-center min-h-[100px] py-2">
              <AnimatePresence mode="wait">
                {loadingTip ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center justify-center text-center gap-2.5"
                  >
                    <div className="w-7 h-7 border-[2.5px] border-white/10 border-t-toss-blue rounded-full animate-spin" />
                    <p className="text-[11px] text-slate-400 font-medium">유럽 현지 가이드 팁 분석 중...</p>
                  </motion.div>
                ) : (
                  <motion.p 
                    key={aiTip}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-[13px] leading-relaxed font-semibold text-slate-100 italic"
                  >
                    "{aiTip}"
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-white/10 flex items-center justify-between shrink-0">
            <span className="text-[9.5px] text-slate-400">
              {apiKey ? "Gemini AI 실시간 개인 분석" : "TripSync 엄선 로컬 팁"}
            </span>

            {apiKey ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleGetAITip}
                disabled={loadingTip}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 rounded-xl text-[11px] font-bold shadow-md hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-toss-blue" />
                맞춤 AI 팁 요청
              </motion.button>
            ) : (
              <button
                onClick={handleRotateLocalTip}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-white rounded-xl text-[11px] font-bold hover:bg-white/20 transition-colors"
              >
                다른 팁 보기
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
