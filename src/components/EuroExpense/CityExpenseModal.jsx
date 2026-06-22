import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Edit2, Trash2 } from 'lucide-react';
import { 
  EURO_CATEGORIES, 
  EURO_CITY_TEMPLATES, 
  formatEuroCurrency, 
  formatKRW, 
  convertEuroToKRW 
} from '../../utils/euroCurrency';

export default function CityExpenseModal({
  isOpen,
  onClose,
  city,
  expenses = [],
  exchangeRates = {},
  onEdit,
  onDelete
}) {
  if (!city) return null;

  // Filter and map expenses for the current city
  const cityExpenses = expenses
    .filter((item) => item.city === city)
    .map((item) => ({
      ...item,
      amountInKRW: convertEuroToKRW(item.amount, item.currency, exchangeRates)
    }))
    .sort((a, b) => {
      const dateA = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date).getTime();
      const dateB = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date).getTime();
      return dateB - dateA; // sorted by date descending
    });

  // Calculate total city expense in KRW
  const cityTotalKRW = cityExpenses.reduce((sum, item) => sum + item.amountInKRW, 0);

  // Group by date YYYY-MM-DD
  const groupMap = {};
  cityExpenses.forEach((item) => {
    const rawDate = item.date?.seconds 
      ? new Date(item.date.seconds * 1000) 
      : new Date(item.date);
    
    if (isNaN(rawDate.getTime())) return;

    const dateKey = rawDate.toISOString().split('T')[0];
    if (!groupMap[dateKey]) {
      groupMap[dateKey] = {
        date: rawDate,
        items: [],
        dayTotalKRW: 0
      };
    }
    groupMap[dateKey].items.push(item);
    groupMap[dateKey].dayTotalKRW += item.amountInKRW;
  });

  const sortedDates = Object.keys(groupMap).sort((a, b) => new Date(b) - new Date(a));

  const formatDateHeader = (date) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = days[date.getDay()];
    return `${month}월 ${day}일 ${dayName}`;
  };

  const matchedTemplate = EURO_CITY_TEMPLATES.find(t => t.city === city);
  const flag = matchedTemplate?.flag || '📍';
  const country = matchedTemplate?.country || '유럽';

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
            className="fixed inset-0 bg-black z-[45] cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed left-0 right-0 bottom-0 max-w-[430px] mx-auto bg-white rounded-t-[32px] shadow-2xl z-[46] h-[85vh] md:h-auto md:max-h-[80vh] flex flex-col md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:-translate-x-1/2 md:left-1/2 md:rounded-[32px] overflow-hidden border border-toss-border"
          >
            {/* Header Drag Bar Handle (Mobile only) */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3.5 mb-1 flex-shrink-0 md:hidden" />

            {/* Sticky Header */}
            <div className="px-6 py-4.5 border-b border-toss-border flex justify-between items-center bg-toss-bg/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{flag}</span>
                <div className="text-left">
                  <h3 className="font-bold text-toss-text-primary text-[15px] sm:text-base">
                    {city} 지출 내역
                  </h3>
                  <p className="text-[10px] text-toss-text-tertiary font-bold tracking-wide">
                    {country} • 총 {cityExpenses.length}건
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold text-toss-blue font-mono">
                  {formatKRW(cityTotalKRW)}
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 bg-toss-bg hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-toss-text-secondary" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {cityExpenses.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-toss-bg rounded-full flex items-center justify-center mx-auto text-xl">
                    💸
                  </div>
                  <div>
                    <h4 className="font-bold text-toss-text-primary text-xs">등록된 지출이 없습니다.</h4>
                    <p className="text-[10px] text-toss-text-tertiary mt-0.5">이 도시에 새로운 지출을 등록해보세요.</p>
                  </div>
                </div>
              ) : (
                sortedDates.map((dateKey) => {
                  const group = groupMap[dateKey];
                  return (
                    <div key={dateKey} className="space-y-2.5">
                      {/* Group Header */}
                      <div className="flex justify-between items-center px-1 text-[11px] font-bold text-toss-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-toss-text-tertiary" />
                          <span>{formatDateHeader(group.date)}</span>
                        </div>
                        <span>일일 합계: {formatKRW(group.dayTotalKRW)}</span>
                      </div>

                      {/* Group Items Container (Flat, fully visible) */}
                      <div className="bg-white rounded-2xl border border-toss-border/80 overflow-hidden divide-y divide-toss-border/40 shadow-sm shadow-black/2">
                        {group.items.map((item) => {
                          const catMeta = EURO_CATEGORIES[item.category] || EURO_CATEGORIES.etc;
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3.5 hover:bg-toss-bg/20 transition-colors"
                            >
                              {/* Item Info */}
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Icon */}
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 bg-toss-bg">
                                  {catMeta.emoji}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-toss-text-primary truncate">
                                      {item.description || catMeta.label}
                                    </span>
                                    {item.paymentMethod && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-toss-blue-light text-toss-blue text-[9px] rounded-full font-bold">
                                        💳 {item.paymentMethod}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-toss-text-tertiary font-mono">
                                    {formatEuroCurrency(item.amount, item.currency)}
                                  </p>
                                </div>
                              </div>

                              {/* Amount & Actions */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="font-extrabold text-xs sm:text-sm text-toss-text-primary">
                                  {formatKRW(item.amountInKRW)}
                                </span>

                                {/* Actions */}
                                <div className="flex gap-0.5">
                                  <button
                                    onClick={() => onEdit(item)}
                                    className="p-1.5 text-toss-text-secondary hover:text-toss-blue hover:bg-toss-bg rounded-lg active:scale-90 transition-all cursor-pointer"
                                    title="수정"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-1.5 text-toss-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-90 transition-all cursor-pointer"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
