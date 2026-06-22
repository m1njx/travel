import { motion } from 'framer-motion';
import { formatKRW, EURO_CITY_TEMPLATES } from '../../utils/euroCurrency';

export default function CityBreakdown({ stats, selectedCity, onSelectCity }) {
  const { citiesBreakdown, totalKRW } = stats;

  if (!citiesBreakdown || citiesBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-6 text-center text-toss-text-tertiary text-sm border border-toss-border">
        등록된 지출 도시 정보가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-base font-bold text-toss-text-primary">도시별 경비</h3>
        {selectedCity !== 'all' && (
          <button
            onClick={() => onSelectCity('all')}
            className="text-[12px] font-semibold text-toss-blue hover:underline cursor-pointer"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-3.5 overflow-x-auto pb-3.5 pt-0.5 scrollbar-none snap-x snap-mandatory">
        {citiesBreakdown.map((cityData) => {
          const { city, country, amountInKRW, count, currencies } = cityData;
          const percentage = totalKRW > 0 ? Math.round((amountInKRW / totalKRW) * 100) : 0;
          const isSelected = selectedCity === city;

          // Find country flag from templates, fallback to generic pin
          const matchedTemplate = EURO_CITY_TEMPLATES.find(t => t.city === city);
          const flag = matchedTemplate?.flag || '📍';

          return (
            <motion.button
              key={city}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectCity(isSelected ? 'all' : city)}
              className={`flex-shrink-0 w-[180px] sm:w-[200px] bg-white rounded-[20px] p-4.5 border text-left snap-start transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-toss-blue ring-2 ring-toss-blue/15 shadow-md shadow-toss-blue/5'
                  : 'border-toss-border hover:border-toss-text-tertiary/30 hover:shadow-sm'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-1">
                <span className="text-2xl">{flag}</span>
                <span className="text-[10px] px-2 py-0.5 bg-toss-bg text-toss-text-secondary rounded-full font-bold">
                  {count}건
                </span>
              </div>

              {/* City name & Info */}
              <div className="mt-3.5">
                <h4 className="font-bold text-toss-text-primary text-[15px] truncate">
                  {city}
                </h4>
                <p className="text-[10px] text-toss-text-tertiary truncate">
                  {country || '유럽'}
                </p>
              </div>

              {/* Amount */}
              <div className="mt-2.5">
                <p className="text-[14px] font-bold text-toss-text-primary">
                  {formatKRW(amountInKRW)}
                </p>
                {/* Secondary currency preview if single currency is used in the city */}
                <p className="text-[10px] text-toss-text-tertiary truncate mt-0.5">
                  {Object.entries(currencies).map(([curr, amt]) => {
                    const formattedAmt = amt.toLocaleString(undefined, { maximumFractionDigits: 0 });
                    return `${curr} ${formattedAmt}`;
                  }).join(', ')}
                </p>
              </div>

              {/* Progress bar container */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-[9px] font-semibold text-toss-text-tertiary">
                  <span>비율</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-toss-bg rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-toss-blue rounded-full"
                  />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
