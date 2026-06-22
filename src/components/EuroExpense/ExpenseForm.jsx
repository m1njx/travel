import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Edit3, Plus, Landmark, FileText } from 'lucide-react';
import { EURO_CURRENCIES, EURO_CATEGORIES, EURO_CITY_TEMPLATES } from '../../utils/euroCurrency';

export default function ExpenseForm({
  isOpen,
  onClose,
  onSubmit,
  editItem = null,
  existingCities = []
}) {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('food');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Sync state if editing
  useEffect(() => {
    if (editItem) {
      setCity(editItem.city || '');
      setCountry(editItem.country || '');
      setCategory(editItem.category || 'food');
      setAmount(editItem.amount ? editItem.amount.toString() : '');
      setCurrency(editItem.currency || 'EUR');
      setDescription(editItem.description || '');
      
      const itemDate = editItem.date?.seconds 
        ? new Date(editItem.date.seconds * 1000) 
        : new Date(editItem.date || new Date());
      setDate(itemDate.toISOString().split('T')[0]);
    } else {
      // Reset to defaults
      setCity('');
      setCountry('');
      setCategory('food');
      setAmount('');
      setCurrency('EUR');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editItem, isOpen]);

  const handleCitySelect = (selectedCity, selectedCountry) => {
    setCity(selectedCity);
    setCountry(selectedCountry);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!city.trim()) {
      alert('도시명을 입력해 주세요.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('올바른 지출 금액을 입력해 주세요.');
      return;
    }

    const payload = {
      id: editItem?.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      city: city.trim(),
      country: country.trim() || '유럽',
      category,
      amount: Number(amount),
      currency,
      description: description.trim(),
      date: new Date(date).toISOString(),
      createdAt: editItem?.createdAt || new Date().toISOString()
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
              {/* Currency & Amount Input (Big Toss Style) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  금액 입력
                </label>
                <div className="flex items-center gap-3 bg-toss-bg rounded-2xl px-4.5 py-4 border border-toss-border focus-within:border-toss-blue focus-within:ring-2 focus-within:ring-toss-blue/15 transition-all">
                  <span className="text-xl font-bold text-toss-text-secondary font-mono">
                    {EURO_CURRENCIES[currency]?.symbol || currency}
                  </span>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-xl font-extrabold text-toss-text-primary focus:outline-none border-none p-0 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Currency Chips Selector */}
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

              {/* City Suggestion Chips & Custom Inputs */}
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
                        onClick={() => handleCitySelect(item.city, item.country)}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 bg-toss-bg rounded-2xl px-4 py-3.5 border border-toss-border focus-within:border-toss-blue transition-all">
                    <span className="text-lg">{currentFlag}</span>
                    <input
                      type="text"
                      placeholder="도시명 (예: 파리)"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-toss-text-primary focus:outline-none border-none p-0"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-toss-bg rounded-2xl px-4 py-3.5 border border-toss-border focus-within:border-toss-blue transition-all">
                    <Landmark className="w-4 h-4 text-toss-text-tertiary" />
                    <input
                      type="text"
                      placeholder="국가명 (예: 프랑스)"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-toss-text-primary focus:outline-none border-none p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Category Grid */}
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

              {/* Date Input */}
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

              {/* Description/Memo */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-toss-text-secondary uppercase tracking-wider">
                  메모 (선택사항)
                </label>
                <div className="flex items-center gap-3 bg-toss-bg rounded-2xl px-4 py-3.5 border border-toss-border focus-within:border-toss-blue transition-all">
                  <FileText className="w-4 h-4 text-toss-text-tertiary flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="지출에 대한 메모 입력..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-toss-text-primary focus:outline-none border-none p-0"
                  />
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
