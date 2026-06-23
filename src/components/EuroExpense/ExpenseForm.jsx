import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Edit3, Plus, Landmark, FileText } from 'lucide-react';
import { EURO_CURRENCIES, EURO_CATEGORIES, EURO_CITY_TEMPLATES } from '../../utils/euroCurrency';

const formatInputAmount = (val) => {
  if (!val) return '';
  const cleanVal = val.replace(/[^0-9.]/g, '');
  const parts = cleanVal.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.slice(0, 2).join('.');
};

export default function ExpenseForm({
  isOpen,
  onClose,
  onSubmit,
  editItem = null,
  existingCities = [],
  nickname,
  paymentMethods = ['현금', '카드', '트래블로그', '트래블월렛'],
  onAddPaymentMethod
}) {
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('food');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('카드');
  const [customMethodInput, setCustomMethodInput] = useState('');

  // Sync state if editing
  useEffect(() => {
    if (editItem) {
      setCity(editItem.city || '');
      setCategory(editItem.category || 'food');
      setAmount(editItem.amount ? formatInputAmount(editItem.amount.toString()) : '');
      setCurrency(editItem.currency || 'EUR');
      setDescription(editItem.description || '');
      setPaymentMethod(editItem.paymentMethod || '카드');
      
      const itemDate = editItem.date?.seconds 
        ? new Date(editItem.date.seconds * 1000) 
        : new Date(editItem.date || new Date());
      setDate(itemDate.toISOString().split('T')[0]);
    } else {
      // Reset to defaults
      setCity('');
      setCategory('food');
      setAmount('');
      setCurrency('EUR');
      setDescription('');
      setPaymentMethod('카드');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editItem, isOpen]);

  const handleCitySelect = (selectedCity) => {
    setCity(selectedCity);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('지출 내역을 입력해 주세요.');
      return;
    }
    const cleanAmount = amount.replace(/,/g, '');
    if (!cleanAmount || isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) {
      alert('올바른 지출 금액을 입력해 주세요.');
      return;
    }

    const matchedCity = EURO_CITY_TEMPLATES.find(t => t.city === city.trim());
    const countryVal = matchedCity ? (
      matchedCity.flag === '🇬🇧' ? '영국' :
      matchedCity.flag === '🇫🇷' ? '프랑스' :
      matchedCity.flag === '🇨🇭' ? '스위스' :
      matchedCity.flag === '🇩🇪' ? '독일' :
      matchedCity.flag === '🇨🇿' ? '체코' :
      matchedCity.flag === '🇦🇹' ? '오스트리아' :
      matchedCity.flag === '🇭🇺' ? '헝가리' :
      matchedCity.flag === '🇮🇹' ? '이탈리아' :
      matchedCity.flag === '🇪🇸' ? '스페인' : '유럽'
    ) : '유럽';

    const payload = {
      id: editItem?.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      city: city.trim() || '미지정',
      country: countryVal,
      category,
      amount: Number(cleanAmount),
      currency,
      description: description.trim(),
      date: new Date(date).toISOString(),
      createdAt: editItem?.createdAt || new Date().toISOString(),
      createdBy: editItem?.createdBy || nickname,
      paymentMethod
    };

    onSubmit(payload);
    onClose();
  };

  // Find flag for user typed/selected city
  const matchedTemplate = EURO_CITY_TEMPLATES.find(t => t.city === city.trim());
  const currentFlag = matchedTemplate?.flag || '📍';

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
            className="fixed inset-0 bg-black z-50 cursor-pointer"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed left-0 right-0 bottom-0 max-w-[430px] mx-auto bg-white rounded-t-[32px] shadow-2xl z-50 max-h-[92vh] overflow-y-auto flex flex-col"
          >
            {/* Header Drag Bar Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3.5 mb-2 flex-shrink-0" />

            <div className="px-6 pb-6 pt-2 flex justify-between items-center border-b border-toss-border flex-shrink-0">
              <h3 className="text-lg font-bold text-toss-text-primary flex items-center gap-2">
                {editItem ? <Edit3 className="w-5 h-5 text-toss-blue" /> : <Plus className="w-5 h-5 text-toss-blue" />}
                {editItem ? '지출 기록 수정' : '새로운 지출 추가'}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 bg-toss-bg hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-toss-text-secondary" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 px-6 py-5 space-y-6">
              {/* 1. 도시 및 국가 */}
              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider block mb-2">
                    도시 및 국가
                  </label>
                  
                  {/* Quick Select Templates */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2.5 scrollbar-none">
                    {EURO_CITY_TEMPLATES.map((item) => (
                      <button
                        key={item.city}
                        type="button"
                        onClick={() => handleCitySelect(item.city)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                          city === item.city
                            ? 'bg-toss-blue-light text-toss-blue border-toss-blue/20'
                            : 'bg-white text-toss-text-secondary border-toss-border hover:bg-toss-bg'
                        }`}
                      >
                        {item.flag} {item.city}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-toss-bg rounded-2xl px-4 py-3.5 border border-toss-border focus-within:border-toss-blue transition-all">
                  <span className="text-lg">{currentFlag}</span>
                  <input
                    type="text"
                    placeholder="도시명 (예: 파리)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-toss-text-primary focus:outline-none border-none p-0"
                  />
                </div>
              </div>

              {/* 2. 지출 내역 (Description) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  지출 내역
                </label>
                <div className="flex items-center gap-3 bg-toss-bg rounded-2xl px-4 py-3.5 border border-toss-border focus-within:border-toss-blue transition-all">
                  <FileText className="w-4 h-4 text-toss-text-tertiary flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="예: 에펠탑 입장권, 식당 저녁식사 등"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-toss-text-primary focus:outline-none border-none p-0"
                    required
                  />
                </div>
              </div>

              {/* 3. 지출 날짜 */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  지출 날짜
                </label>
                <div className="flex items-center gap-3 bg-toss-bg rounded-2xl px-4 py-3.5 border border-toss-border focus-within:border-toss-blue transition-all">
                  <Calendar className="w-5 h-5 text-toss-text-tertiary" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-semibold text-toss-text-primary focus:outline-none border-none p-0 cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* 4. 금액 입력 */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  지출 금액
                </label>
                <div className="flex items-center gap-3 bg-toss-bg rounded-2xl px-4.5 py-4 border border-toss-border focus-within:border-toss-blue focus-within:ring-2 focus-within:ring-toss-blue/15 transition-all">
                  <span className="text-xl font-bold text-toss-text-secondary font-mono">
                    {EURO_CURRENCIES[currency]?.symbol || currency}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(formatInputAmount(e.target.value))}
                    className="flex-1 bg-transparent text-xl font-extrabold text-toss-text-primary focus:outline-none border-none p-0 font-mono"
                    required
                  />
                </div>
              </div>

              {/* 통화 선택 */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  통화 선택
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {Object.values(EURO_CURRENCIES).map((curr) => {
                    const isSelected = currency === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => setCurrency(curr.code)}
                        className={`flex-shrink-0 flex items-center gap-1 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-toss-blue text-white border-toss-blue'
                            : 'bg-white text-toss-text-secondary border-toss-border hover:bg-toss-bg'
                        }`}
                      >
                        <span>{curr.flag}</span>
                        <span>{curr.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. 카테고리 선택 */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  카테고리 선택
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.values(EURO_CATEGORIES).map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-toss-blue-light border-toss-blue/30 text-toss-blue font-bold scale-[1.02] shadow-sm'
                            : 'bg-white border-toss-border text-toss-text-secondary hover:bg-toss-bg hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl mb-1.5">{cat.emoji}</span>
                        <span className="text-[11px] font-semibold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. 결제 방법 선택 */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  결제 방법 선택
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap">
                  {paymentMethods.map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-toss-blue text-white border-toss-blue'
                            : 'bg-white text-toss-text-secondary border-toss-border hover:bg-toss-bg'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
                
                {/* 결제 방법 추가 인풋 */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="새 결제 방법 추가 (예: 토스카드)"
                    value={customMethodInput}
                    onChange={(e) => setCustomMethodInput(e.target.value)}
                    className="flex-1 bg-toss-bg text-xs font-semibold text-toss-text-primary rounded-xl px-3.5 py-2 border border-toss-border focus:outline-none focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/15"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = customMethodInput.trim();
                      if (!clean) return;
                      if (paymentMethods.includes(clean)) {
                        alert('이미 존재하는 결제 방법입니다.');
                        return;
                      }
                      onAddPaymentMethod(clean);
                      setPaymentMethod(clean);
                      setCustomMethodInput('');
                    }}
                    className="px-3.5 py-2 bg-toss-bg hover:bg-gray-200 active:scale-95 text-toss-text-secondary font-bold text-xs rounded-xl border border-toss-border transition-all cursor-pointer"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="w-full py-4.5 bg-toss-blue hover:bg-blue-600 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-toss-blue/15 transition-all text-[15px] cursor-pointer"
                >
                  {editItem ? '지출 기록 수정 완료' : '경비 등록하기'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
