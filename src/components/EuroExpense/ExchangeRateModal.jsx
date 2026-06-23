import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Check, Sparkles } from 'lucide-react';
import { EURO_CURRENCIES, DEFAULT_EURO_RATES } from '../../utils/euroCurrency';

const formatRateTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

export default function ExchangeRateModal({
  isOpen,
  onClose,
  rates,
  onUpdateRate
}) {
  const [localRates, setLocalRates] = useState({});
  const [geminiData, setGeminiData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLocalRates({ ...rates });
      try {
        const stored = localStorage.getItem('tripsync_exchange_rates');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.rates) {
            setGeminiData(parsed);
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, [rates, isOpen]);

  const handleApplyGeminiRates = () => {
    if (geminiData && geminiData.rates) {
      setLocalRates(prev => {
        const next = { ...prev };
        Object.keys(geminiData.rates).forEach(code => {
          if (code !== 'KRW') {
            next[code] = geminiData.rates[code];
          }
        });
        return next;
      });
      alert('Gemini가 조회한 실시간 환율을 적용했습니다. 저장 버튼을 누르면 최종 적용됩니다.');
    }
  };

  const handleInputChange = (code, val) => {
    setLocalRates(prev => ({
      ...prev,
      [code]: val
    }));
  };

  const handleResetToDefault = () => {
    if (window.confirm('모든 환율을 기본값으로 복원하시겠습니까?')) {
      setLocalRates({ ...DEFAULT_EURO_RATES });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    // Validate inputs
    for (const [code, value] of Object.entries(localRates)) {
      const numVal = Number(value);
      if (value === '' || value === null || value === undefined || isNaN(numVal) || numVal <= 0) {
        alert(`${code} 환율은 0보다 큰 숫자여야 합니다.`);
        return;
      }
    }

    // Update all
    Object.entries(localRates).forEach(([code, value]) => {
      onUpdateRate(code, Number(value));
    });

    alert('환율 설정이 성공적으로 저장되었습니다.');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[100] cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-white rounded-[24px] shadow-2xl z-[101] overflow-hidden border border-toss-border flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-toss-border flex justify-between items-center bg-toss-bg/30">
              <h3 className="font-bold text-toss-text-primary text-[15px]">
                수동 환율 관리
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-toss-bg rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-toss-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSave} className="p-5.5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-[12px] text-toss-text-secondary leading-relaxed mb-1">
                유럽 여행지에서 사용하는 각 통화의 1 단위당 원화(KRW) 가치를 직접 설정합니다. 지출 내역의 원화 환산 시 적용됩니다.
              </p>

              {/* Gemini Exchange Rates Panel */}
              {geminiData && (
                <div className="p-3.5 bg-toss-blue/5 border border-toss-blue/15 rounded-2xl text-left flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11.5px] font-black text-toss-blue flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Gemini 실시간 검색 환율
                    </span>
                    <span className="text-[9.5px] font-bold text-toss-text-tertiary">
                      {formatRateTime(geminiData.lastUpdated)} 기준
                    </span>
                  </div>
                  <p className="text-[10px] text-toss-text-secondary leading-relaxed">
                    가계부에서 AI가 조회한 실시간 환율 정보를 수동 환율로 일괄 가져옵니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleApplyGeminiRates}
                    className="w-full py-2 bg-toss-blue text-white rounded-xl text-xs font-black hover:bg-blue-600 transition-colors cursor-pointer shadow-sm shadow-toss-blue/5"
                  >
                    Gemini 환율 가져와 채우기
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {Object.values(EURO_CURRENCIES).filter((curr) => curr.code !== 'KRW').map((curr) => {
                  const val = localRates[curr.code] !== undefined ? localRates[curr.code] : curr.defaultRate;
                  return (
                    <div
                      key={curr.code}
                      className="flex items-center justify-between gap-4 p-3 bg-toss-bg/50 rounded-2xl border border-toss-border"
                    >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xl">{curr.flag}</span>
                        <div className="text-left">
                          <p className="text-xs font-bold text-toss-text-primary">{curr.code}</p>
                          <p className="text-[9px] text-toss-text-tertiary font-medium">{curr.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-toss-text-tertiary">=</span>
                        <div className="flex items-center gap-1.5 bg-white border border-toss-border rounded-xl px-2.5 py-1.5 focus-within:border-toss-blue focus-within:ring-1 focus-within:ring-toss-blue/15 transition-all">
                          <input
                            type="number"
                            step="any"
                            value={val}
                            onChange={(e) => handleInputChange(curr.code, e.target.value)}
                            className="w-[70px] text-right font-extrabold text-sm text-toss-text-primary focus:outline-none border-none p-0 font-mono"
                            required
                          />
                          <span className="text-xs text-toss-text-secondary font-bold">원</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3.5 border-t border-toss-border">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-toss-bg hover:bg-gray-200 active:scale-95 text-toss-text-secondary font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  기본값 복원
                </button>

                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-toss-blue hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-toss-blue/10 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  설정 저장
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
