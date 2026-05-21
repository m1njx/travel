import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Wallet, TrendingUp, RefreshCw, Clock, ArrowRightLeft, Camera, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { fetchExchangeRates, convertToKRW, formatKRW, getCurrencySymbol, formatRateTime, CURRENCIES } from '../utils/exchangeRate';
import { scanReceiptWithGemini } from '../utils/gemini';

const genId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function ExpensePage({ members, sync, apiKey }) {
  const { items: expenses, addItem, removeItem } = sync;
  const [rates, setRates] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const loadRates = async (force = false) => {
    setLoading(true);
    const result = await fetchExchangeRates(force);
    setRates(result.rates);
    setLastUpdated(result.lastUpdated);
    setLoading(false);
  };

  useEffect(() => { loadRates(); }, []);

  const handleAdd = async (e) => {
    await addItem({
      ...e, id: genId(), createdAt: Date.now(),
      rateSnapshot: rates ? { ...rates } : null,
      rateSnapshotTime: lastUpdated || Date.now(),
    });
    setShowAdd(false);
  };

  const totalKRW = expenses.reduce((a, e) => {
    const r = e.rateSnapshot || rates;
    return a + (r ? convertToKRW(e.amount, e.currency, r) : 0);
  }, 0);

  return (
    <div className="pb-6">
      {/* Header with Add Button on Desktop */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 sm:px-5 pt-2 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] sm:text-[26px] md:text-[28px] font-bold text-toss-text-primary tracking-tight">가계부</h1>
          <p className="text-[13px] sm:text-[14px] text-toss-text-secondary mt-1">여행 경비를 스마트하게 관리하세요 💰</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
          className="hidden md:flex items-center gap-1.5 px-4 py-2.5 bg-toss-blue text-white rounded-xl text-[14px] font-semibold shadow-sm hover:bg-toss-blue-dark">
          <Plus className="w-4 h-4" /> 지출 기록
        </motion.button>
      </motion.div>

      {/* Grid container for stats cards (Responsive layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-4 sm:mx-5 mb-6">
        {/* Total Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-toss-blue to-blue-600 rounded-2xl p-5 text-white md:col-span-2 flex flex-col justify-between shadow-md shadow-toss-blue/15 min-h-[160px]">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] sm:text-[14px] font-medium opacity-80">총 지출</span>
              <Wallet className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-[28px] sm:text-[32px] md:text-[36px] font-extrabold tabular-nums">₩{formatKRW(totalKRW)}</p>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/20">
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[10px] sm:text-[11px] opacity-70">현재 환율 기준: {formatRateTime(lastUpdated)}</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => loadRates(true)} disabled={loading} className="ml-auto p-1 rounded-full hover:bg-white/10 btn-icon-sm">
              <RefreshCw className={`w-3.5 h-3.5 opacity-70 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </motion.div>

        {/* Exchange Rates Card */}
        {rates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="toss-card md:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-toss-blue" />
                  <span className="text-[13px] font-semibold text-toss-text-primary">주요 환율</span>
                </div>
                <span className="text-[10px] text-toss-text-tertiary">{formatRateTime(lastUpdated)} 기준</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2 max-h-[120px] md:max-h-[150px] overflow-y-auto pr-1">
                {CURRENCIES.slice(0, 4).map(c => (
                  <div key={c.code} className="flex items-center justify-between px-3 py-1.5 bg-toss-bg rounded-xl">
                    <span className="text-[11px] sm:text-[12px]">{c.flag} 1{c.code}</span>
                    <span className="text-[11px] sm:text-[12px] font-semibold tabular-nums text-toss-text-primary">₩{formatKRW(rates[c.code] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Expense List */}
      <div className="px-4 sm:px-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] sm:text-[16px] font-bold text-toss-text-primary">지출 내역</span>
          <span className="text-[13px] text-toss-text-secondary">{expenses.length}건</span>
        </div>
        
        {/* Large screen layout structure */}
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {expenses.map((e, i) => {
              const expRate = e.rateSnapshot || rates;
              const krw = expRate ? convertToKRW(e.amount, e.currency, expRate) : 0;
              return (
                <motion.div key={e.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: i * 0.03 }} className="toss-card hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-toss-blue-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] sm:text-[16px]">{getCategoryEmoji(e.category)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-[14px] font-semibold text-toss-text-primary truncate">{e.description}</p>
                      <p className="text-[11px] sm:text-[12px] text-toss-text-secondary">{e.paidBy} • {getCategoryLabel(e.category)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] sm:text-[14px] font-bold text-toss-text-primary tabular-nums">{getCurrencySymbol(e.currency)}{e.amount.toLocaleString()}</p>
                      <p className="text-[10px] sm:text-[11px] text-toss-text-secondary tabular-nums">₩{formatKRW(krw)}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeItem(e.id)} className="p-1.5 rounded-full hover:bg-red-50 flex-shrink-0 btn-icon-sm">
                      <X className="w-3.5 h-3.5 text-toss-text-tertiary" />
                    </motion.button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 pl-11 sm:pl-13">
                    <Clock className="w-3 h-3 text-toss-text-tertiary" />
                    <span className="text-[9px] sm:text-[10px] text-toss-text-tertiary">
                      {formatRateTime(e.rateSnapshotTime || e.createdAt)} 환율
                      {expRate && e.currency && ` · 1${e.currency}=₩${formatKRW(expRate[e.currency] || 0)}`}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {expenses.length === 0 && (
            <div className="flex flex-col items-center py-16 bg-white rounded-2xl border border-toss-border/60">
              <div className="w-16 h-16 bg-toss-blue-light rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-toss-blue" />
              </div>
              <p className="text-[16px] font-semibold text-toss-text-primary mb-1">지출 내역이 없어요</p>
              <p className="text-[14px] text-toss-text-secondary">첫 지출을 추가하고 함께 정산해 보세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button for Mobile only */}
      <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-24 right-4 sm:right-5 w-14 h-14 bg-toss-blue rounded-full flex items-center justify-center shadow-lg shadow-toss-blue/30 z-40">
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {showAdd && (
          <AddExpenseModal
            members={members}
            onSave={handleAdd}
            onClose={() => setShowAdd(false)}
            rates={rates}
            lastUpdated={lastUpdated}
            apiKey={apiKey}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function getCategoryEmoji(c) { return { food:'🍽️', transport:'🚇', stay:'🏨', ticket:'🎫', shopping:'🛍️', etc:'📌' }[c] || '📌'; }
function getCategoryLabel(c) { return { food:'식비', transport:'교통', stay:'숙소', ticket:'입장료', shopping:'쇼핑', etc:'기타' }[c] || '기타'; }

function AddExpenseModal({ members, onSave, onClose, rates, lastUpdated, apiKey }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [category, setCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(members[0] || '');
  const [splitWith, setSplitWith] = useState(members.map(() => true));
  
  // OCR AI states
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [showScanOptions, setShowScanOptions] = useState(false);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const cats = [
    { id:'food',label:'식비',emoji:'🍽️' }, { id:'transport',label:'교통',emoji:'🚇' },
    { id:'stay',label:'숙소',emoji:'🏨' }, { id:'ticket',label:'입장료',emoji:'🎫' },
    { id:'shopping',label:'쇼핑',emoji:'🛍️' }, { id:'etc',label:'기타',emoji:'📌' },
  ];
  const toggle = (i) => setSplitWith(p => p.map((v,idx) => idx===i?!v:v));
  const num = parseFloat(amount) || 0;
  const krw = rates ? convertToKRW(num, currency, rates) : 0;
  const splitCount = splitWith.filter(Boolean).length;
  const perPerson = splitCount > 0 ? Math.round(krw/splitCount) : 0;

  const save = () => {
    if (!desc.trim() || num <= 0) return;
    onSave({ description:desc.trim(), amount:num, currency, category, paidBy, splitWith:members.filter((_,i)=>splitWith[i]), splitCount });
  };

  const handleOcrClick = () => {
    if (!apiKey) {
      setScanError('설정에서 Gemini API 키를 먼저 등록해 주세요.');
      return;
    }
    // Toggle the sub-menu selection list
    setShowScanOptions(!showScanOptions);
  };

  const handleCameraScan = () => {
    setShowScanOptions(false);
    cameraInputRef.current?.click();
  };

  const handleGalleryScan = () => {
    setShowScanOptions(false);
    galleryInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        try {
          const parsed = await scanReceiptWithGemini(base64Data, file.type, apiKey);
          setDesc(parsed.description);
          setAmount(parsed.amount.toString());
          setCurrency(parsed.currency);
          setCategory(parsed.category);
          setScanning(false);
        } catch (err) {
          console.error(err);
          setScanError('영수증 스캔에 실패했습니다. 다시 시도해 주세요.');
          setScanning(false);
        }
      };
      reader.onerror = () => {
        setScanError('파일을 읽는 과정에서 에러가 발생했습니다.');
        setScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setScanError('이미지 로딩 에러');
      setScanning(false);
    }
    
    // Clear values so the same file can trigger change event again
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <motion.div initial={{ y:'100%', scale: 1 }} animate={{ y:0, scale: 1 }} exit={{ y:'100%', scale: 0.95 }} transition={{ type:'spring', damping:25, stiffness:300 }}
        onClick={e=>e.stopPropagation()} className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-5 sm:p-6 md:p-8 safe-bottom modal-sheet md:my-auto md:max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-toss-border rounded-full mx-auto mb-5 md:hidden" />
        
        <div className="flex items-center justify-between mb-5 relative">
          <h2 className="text-[18px] sm:text-[20px] md:text-[22px] font-bold text-toss-text-primary">지출 기록</h2>
          
          {/* AI Scanner Button */}
          <div className="relative">
            {/* Native camera file input (capture="environment" forces camera on mobile) */}
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            {/* Native gallery file input */}
            <input
              type="file"
              ref={galleryInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleOcrClick}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3.5 py-1.8 bg-toss-blue-light text-toss-blue text-[12px] font-bold rounded-xl border border-toss-blue/20 cursor-pointer"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-toss-blue" />
                  영수증 AI 스캔
                </>
              )}
            </motion.button>

            {/* Micro Dropdown for Scan Options (Toss Style) */}
            <AnimatePresence>
              {showScanOptions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowScanOptions(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-44 bg-white border border-toss-border rounded-2xl shadow-xl p-1.5 z-20"
                  >
                    <button
                      onClick={handleCameraScan}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-toss-bg rounded-xl text-[13px] text-toss-text-primary font-semibold text-left transition-colors"
                    >
                      <Camera className="w-4 h-4 text-toss-blue" />
                      영수증 바로 촬영
                    </button>
                    <button
                      onClick={handleGalleryScan}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-toss-bg rounded-xl text-[13px] text-toss-text-primary font-semibold text-left transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      앨범에서 불러오기
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Scan Error Message */}
        {scanError && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-red-50 text-toss-danger text-[12px] font-semibold rounded-xl flex items-center gap-2">
            <X className="w-4 h-4 cursor-pointer" onClick={() => setScanError('')} />
            <span>{scanError}</span>
          </motion.div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <div><label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">설명</label>
            <input type="text" placeholder="예: 점심 파스타" value={desc} onChange={e=>setDesc(e.target.value)}
              className="w-full px-4 py-3 sm:py-3.5 bg-toss-bg rounded-2xl text-[15px]" autoFocus /></div>
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1"><label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">금액</label>
              <input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}
                className="w-full px-4 py-3 sm:py-3.5 bg-toss-bg rounded-2xl text-[15px] tabular-nums" /></div>
            <div className="w-28 sm:w-32"><label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">통화</label>
              <select value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full px-2 sm:px-3 py-3 bg-toss-bg rounded-2xl text-[14px] sm:text-[15px]">
                {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select></div>
          </div>
          {num > 0 && rates && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="px-4 py-3 bg-toss-blue-light rounded-2xl">
              <p className="text-[13px] text-toss-blue font-semibold">≈ ₩{formatKRW(krw)}</p>
              <div className="flex items-center justify-between mt-1">
                {splitCount>0 && <p className="text-[12px] text-toss-blue/70">1인당 ₩{formatKRW(perPerson)}</p>}
                <p className="text-[10px] text-toss-blue/50 ml-auto">{formatRateTime(lastUpdated)} 기준</p>
              </div>
            </motion.div>
          )}
          <div><label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">카테고리</label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {cats.map(c=>(
                <motion.button key={c.id} whileTap={{ scale:0.95 }} onClick={()=>setCategory(c.id)}
                  className={`py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-medium ${category===c.id?'bg-toss-blue text-white':'bg-toss-bg text-toss-text-secondary'}`}>
                  {c.emoji} {c.label}
                </motion.button>
              ))}
            </div></div>
          <div><label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">결제자</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {members.map(m=>(
                <motion.button key={m} whileTap={{ scale:0.95 }} onClick={()=>setPaidBy(m)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-medium ${paidBy===m?'bg-toss-blue text-white':'bg-toss-bg text-toss-text-secondary'}`}>{m}</motion.button>
              ))}
            </div></div>
          <div><label className="text-[13px] font-semibold text-toss-text-secondary mb-1.5 block">정산 대상</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {members.map((m,i)=>(
                <motion.button key={m} whileTap={{ scale:0.95 }} onClick={()=>toggle(i)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-medium ${splitWith[i]?'bg-toss-blue text-white':'bg-toss-bg text-toss-text-secondary'}`}>{m}</motion.button>
              ))}
            </div></div>
        </div>
        <div className="flex gap-3 mt-5 sm:mt-6">
          <button onClick={onClose} className="flex-1 py-3.5 sm:py-4 rounded-2xl text-[15px] font-semibold text-toss-text-secondary bg-toss-bg">취소</button>
          <motion.button whileTap={{ scale:0.97 }} onClick={save} disabled={!desc.trim()||num<=0||scanning}
            className="flex-1 py-3.5 sm:py-4 rounded-2xl text-[15px] font-semibold text-white bg-toss-blue disabled:opacity-40">기록</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
