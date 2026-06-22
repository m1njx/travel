import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { EURO_CATEGORIES, EURO_CITY_TEMPLATES, formatEuroCurrency, formatKRW } from '../../utils/euroCurrency';

export default function ExpenseList({
  expenses,
  onEdit,
  onDelete
}) {
  // Group expenses by date (YYYY-MM-DD)
  const groupMap = {};
  if (expenses) {
    expenses.forEach((item) => {
      const rawDate = item.date?.seconds 
        ? new Date(item.date.seconds * 1000) 
        : new Date(item.date);
      
      // Check for valid date
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
  }

  // Sort dates descending
  const sortedDates = Object.keys(groupMap).sort((a, b) => new Date(b) - new Date(a));

  const [expandedDates, setExpandedDates] = useState({});
  const [prevDatesCount, setPrevDatesCount] = useState(0);

  useEffect(() => {
    if (sortedDates.length > 0 && sortedDates.length !== prevDatesCount) {
      setExpandedDates(prev => ({
        ...prev,
        [sortedDates[0]]: true
      }));
      setPrevDatesCount(sortedDates.length);
    }
  }, [sortedDates, prevDatesCount]);

  const toggleDate = (dateKey) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // Date formatting helper
  const formatDateHeader = (date) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = days[date.getDay()];
    return `${month}월 ${day}일 ${dayName}`;
  };

  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white rounded-[24px] border border-toss-border p-12 text-center space-y-3.5">
        <div className="w-14 h-14 bg-toss-bg rounded-full flex items-center justify-center mx-auto text-2xl">
          💸
        </div>
        <div>
          <h4 className="font-bold text-toss-text-primary text-[15px]">등록된 지출이 없습니다.</h4>
          <p className="text-xs text-toss-text-tertiary mt-1">유럽 여행 중 사용한 경비를 추가해 보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => {
        const group = groupMap[dateKey];
        const isExpanded = !!expandedDates[dateKey];

        return (
          <div key={dateKey} className="bg-white rounded-[24px] border border-toss-border overflow-hidden shadow-sm shadow-black/5">
            {/* Clickable Accordion Header */}
            <button
              onClick={() => toggleDate(dateKey)}
              className="w-full flex justify-between items-center px-5 py-4.5 bg-toss-bg/20 hover:bg-toss-bg/50 active:bg-toss-bg transition-colors text-left font-bold text-xs sm:text-[13px] border-b border-toss-border/30 cursor-pointer"
            >
              <div className="flex items-center gap-2 text-toss-text-secondary">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-toss-text-tertiary" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-toss-text-tertiary" />
                )}
                <Calendar className="w-3.5 h-3.5 text-toss-text-tertiary" />
                <span className="text-toss-text-primary">{formatDateHeader(group.date)}</span>
                <span className="text-[10px] text-toss-text-tertiary font-bold px-1.5 py-0.5 bg-white border border-toss-border/50 rounded-md">
                  {group.items.length}건
                </span>
              </div>
              <span className="text-toss-text-primary font-extrabold font-mono text-[13px]">
                {formatKRW(group.dayTotalKRW)}
              </span>
            </button>

            {/* Collapsible Items Container */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="divide-y divide-toss-border/40 overflow-hidden bg-white"
                >
                  {group.items.map((item) => {
                    const catMeta = EURO_CATEGORIES[item.category] || EURO_CATEGORIES.etc;
                    const flag = EURO_CITY_TEMPLATES.find(t => t.city === item.city)?.flag || '📍';

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4.5 hover:bg-toss-bg/30 transition-colors"
                      >
                        {/* Item Info */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-toss-bg">
                            {catMeta.emoji}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-toss-text-primary truncate">
                                {item.description || catMeta.label}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-toss-bg text-toss-text-secondary text-[10px] rounded-full font-bold">
                                {flag} {item.city}
                              </span>
                              {item.paymentMethod && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-toss-blue-light text-toss-blue text-[10px] rounded-full font-bold">
                                  💳 {item.paymentMethod}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-toss-text-tertiary truncate">
                              {formatEuroCurrency(item.amount, item.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <span className="font-extrabold text-sm sm:text-base text-toss-text-primary">
                              {formatKRW(item.amountInKRW)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => onEdit(item)}
                              className="p-2 text-toss-text-secondary hover:text-toss-blue hover:bg-toss-bg rounded-xl active:scale-95 transition-all cursor-pointer"
                              title="수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(item.id)}
                              className="p-2 text-toss-text-secondary hover:text-red-500 hover:bg-red-50 rounded-xl active:scale-95 transition-all cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
