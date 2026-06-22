import { motion } from 'framer-motion';
import { Settings2, Calendar, Coins } from 'lucide-react';
import { formatKRW } from '../../utils/euroCurrency';

export default function TotalSummary({ stats, onOpenExchangeRateModal }) {
  const { totalKRW, tripDays, averagePerDay } = stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[24px] bg-gradient-to-tr from-toss-blue via-blue-600 to-indigo-600 text-white p-6 sm:p-7 shadow-lg shadow-toss-blue/20"
    >
      {/* Decorative background shapes */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

      {/* Header Area */}
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-0.5">
          <span className="text-[12px] sm:text-[13px] font-semibold text-white/80 tracking-wider uppercase">
            유럽 여행 총 경비
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {formatKRW(totalKRW)}
          </h2>
        </div>
        <button
          onClick={onOpenExchangeRateModal}
          className="p-2.5 bg-white/15 hover:bg-white/25 active:scale-95 rounded-full transition-all duration-200 cursor-pointer"
          title="환율 설정"
        >
          <Settings2 className="w-5.5 h-5.5 text-white" />
        </button>
      </div>

      {/* Stats Divider Line */}
      <div className="h-[1px] bg-white/15 my-5 sm:my-6 relative z-10" />

      {/* Stats Detail Row */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-white/70 font-medium">기록 일수</p>
            <p className="text-sm sm:text-base font-bold">{tripDays}일간의 여정</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] text-white/70 font-medium">하루 평균 지출</p>
            <p className="text-sm sm:text-base font-bold">{formatKRW(averagePerDay)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
