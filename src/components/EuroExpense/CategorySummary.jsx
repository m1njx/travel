import { motion } from 'framer-motion';
import { EURO_CATEGORIES, formatKRW } from '../../utils/euroCurrency';

export default function CategorySummary({ stats, selectedCategory, onSelectCategory }) {
  const { categories, totalKRW } = stats;

  // Transform object to array and calculate percent
  const categoryList = Object.entries(EURO_CATEGORIES).map(([id, meta]) => {
    const amount = categories[id] || 0;
    const percentage = totalKRW > 0 ? Math.round((amount / totalKRW) * 100) : 0;
    return {
      id,
      amount,
      percentage,
      ...meta
    };
  }).sort((a, b) => b.amount - a.amount); // Sort by amount descending

  return (
    <div className="bg-white rounded-[24px] p-5.5 border border-toss-border space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-base font-bold text-toss-text-primary">카테고리별 지출</h3>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-[12px] font-semibold text-toss-blue hover:underline cursor-pointer"
          >
            필터 초기화
          </button>
        )}
      </div>

      <div className="space-y-4">
        {categoryList.map((category) => {
          const { id, label, emoji, amount, percentage, color } = category;
          const isSelected = selectedCategory === id;
          const hasSpending = amount > 0;

          return (
            <div
              key={id}
              onClick={() => onSelectCategory(isSelected ? 'all' : id)}
              className={`group flex items-center justify-between p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isSelected 
                  ? 'bg-toss-blue-light/50' 
                  : 'hover:bg-toss-bg/70'
              }`}
            >
              {/* Category Icon & Progress */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${color}`}>
                  {emoji}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5 pr-4">
                  <div className="flex justify-between text-sm">
                    <span className={`font-semibold ${isSelected ? 'text-toss-blue' : 'text-toss-text-primary'}`}>
                      {label}
                    </span>
                    <span className="text-[11px] font-bold text-toss-text-tertiary">
                      {percentage}%
                    </span>
                  </div>
                  {/* Progress slide */}
                  <div className="w-full h-1.5 bg-toss-bg rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        isSelected ? 'bg-toss-blue' : 'bg-toss-text-secondary/40 group-hover:bg-toss-text-secondary/60'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className={`text-[14px] font-bold ${hasSpending ? 'text-toss-text-primary' : 'text-toss-text-tertiary'}`}>
                  {formatKRW(amount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
