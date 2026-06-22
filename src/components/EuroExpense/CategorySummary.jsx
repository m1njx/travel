import { motion } from 'framer-motion';
import { EURO_CATEGORIES, formatKRW } from '../../utils/euroCurrency';

export default function CategorySummary({ stats, selectedCategory, onSelectCategory }) {
  const { categories, totalKRW } = stats;

  // Transform object to array and keep standard order
  const categoryList = Object.entries(EURO_CATEGORIES).map(([id, meta]) => {
    const amount = categories[id] || 0;
    const percentage = totalKRW > 0 ? Math.round((amount / totalKRW) * 100) : 0;
    return {
      id,
      amount,
      percentage,
      ...meta
    };
  });

  return (
    <div className="bg-white rounded-[24px] p-4.5 border border-toss-border space-y-3">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] sm:text-sm font-bold text-toss-text-secondary">카테고리별 지출</h3>
          {selectedCategory !== 'all' && (
            <span className="text-[10px] px-2 py-0.5 bg-toss-blue-light text-toss-blue font-bold rounded-full">
              필터 적용 중
            </span>
          )}
        </div>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[11px] font-bold text-toss-blue hover:underline cursor-pointer"
          >
            초기화
          </button>
        )}
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {categoryList.map((category) => {
          const { id, label, emoji, amount, percentage, color } = category;
          const isSelected = selectedCategory === id;
          const hasSpending = amount > 0;

          return (
            <button
              key={id}
              onClick={() => onSelectCategory(isSelected ? 'all' : id)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-toss-blue-light border-toss-blue/30 text-toss-blue font-bold scale-[1.02] shadow-sm'
                  : 'bg-toss-bg/30 border-toss-border/60 text-toss-text-secondary hover:bg-toss-bg hover:border-gray-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base mb-1.5 ${color} bg-white shadow-sm`}>
                {emoji}
              </div>
              <span className="text-[11px] font-bold truncate w-full">{label}</span>
              <span className={`text-[10px] font-mono mt-1 font-extrabold truncate w-full ${hasSpending ? (isSelected ? 'text-toss-blue' : 'text-toss-text-primary') : 'text-toss-text-tertiary'}`}>
                {hasSpending ? formatKRW(amount) : '0원'}
              </span>
              <span className="text-[9px] text-toss-text-tertiary font-medium mt-0.5">
                {percentage}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
