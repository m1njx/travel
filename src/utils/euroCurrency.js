// Supported currencies for Europe Travel Expense Tracker
export const EURO_CURRENCIES = {
  EUR: { code: 'EUR', name: '유로', symbol: '€', flag: '🇫🇷', defaultRate: 1500 },
  GBP: { code: 'GBP', name: '파운드', symbol: '£', flag: '🇬🇧', defaultRate: 1800 },
  CHF: { code: 'CHF', name: '스위스 프랑', symbol: 'CHF', flag: '🇨🇭', defaultRate: 1600 },
  CZK: { code: 'CZK', name: '체코 코루나', symbol: 'Kč', flag: '🇨🇿', defaultRate: 60 },
  HUF: { code: 'HUF', name: '헝가리 포린트', symbol: 'Ft', flag: '🇭🇺', defaultRate: 3.8 },
  PLN: { code: 'PLN', name: '폴란드 즈로티', symbol: 'zł', flag: '🇵🇱', defaultRate: 350 },
  KRW: { code: 'KRW', name: '원화', symbol: '₩', flag: '🇰🇷', defaultRate: 1 },
};

// Default rates for easy export
export const DEFAULT_EURO_RATES = Object.keys(EURO_CURRENCIES).reduce((acc, code) => {
  acc[code] = EURO_CURRENCIES[code].defaultRate;
  return acc;
}, {});

/**
 * Convert foreign currency amount to KRW (Korean Won)
 * @param {number} amount - Foreign amount
 * @param {string} currency - Currency code (e.g. 'EUR')
 * @param {object} customRates - Custom exchange rates object
 * @returns {number} Amount in KRW
 */
export function convertEuroToKRW(amount, currency, customRates = {}) {
  if (!amount || isNaN(amount)) return 0;
  const rate = customRates[currency] || DEFAULT_EURO_RATES[currency] || 1;
  return Math.round(amount * rate);
}

/**
 * Format foreign currency with symbol
 * @param {number} amount 
 * @param {string} currency 
 */
export function formatEuroCurrency(amount, currency) {
  if (amount === undefined || amount === null) return '';
  const meta = EURO_CURRENCIES[currency];
  const symbol = meta ? meta.symbol : currency;
  const formatted = Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
}

/**
 * Format Korean Won
 * @param {number} amount 
 */
export function formatKRW(amount) {
  if (amount === undefined || amount === null) return '0원';
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

/**
 * Common European travel category mapping with emoji and colors
 */
export const EURO_CATEGORIES = {
  accommodation: { id: 'accommodation', label: '숙박', emoji: '🏨', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  food: { id: 'food', label: '식비', emoji: '🍽️', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  transport: { id: 'transport', label: '교통', emoji: '🚇', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  sightseeing: { id: 'sightseeing', label: '관광', emoji: '🎭', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  shopping: { id: 'shopping', label: '쇼핑', emoji: '🛍️', color: 'bg-pink-50 text-pink-600 border-pink-100' },
  etc: { id: 'etc', label: '기타', emoji: '💳', color: 'bg-gray-50 text-gray-600 border-gray-100' },
};

/**
 * List of common European countries & cities with flags for helper dropdown/suggestions
 */
export const EURO_CITY_TEMPLATES = [
  { city: '런던', flag: '🇬🇧' },
  { city: '파리', flag: '🇫🇷' },
  { city: '인터라켄', flag: '🇨🇭' },
  { city: '뮌헨', flag: '🇩🇪' },
  { city: '프라하', flag: '🇨🇿' },
  { city: '비엔나', flag: '🇦🇹' },
  { city: '부다페스트', flag: '🇭🇺' },
  { city: '베니스', flag: '🇮🇹' },
  { city: '피렌체', flag: '🇮🇹' },
  { city: '로마', flag: '🇮🇹' },
  { city: '바르셀로나', flag: '🇪🇸' },
];
