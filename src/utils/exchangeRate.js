// Real-time exchange rate service with multi-API failover
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

let cachedRates = null;
let lastFetchTime = null;
let rateSource = '';

// Default fallback rates (approximate, used only when all APIs are unreachable)
const FALLBACK_RATES = {
  EUR: 1515,
  GBP: 1775,
  CHF: 1570,
  CZK: 60,
  USD: 1375,
  HUF: 3.7,
};

// Fixed date for fallback rates to avoid deceiving user with dynamic "just updated" labels
const FALLBACK_DATE = new Date('2026-05-21T00:00:00Z').getTime();

/**
 * Fetch real-time exchange rates from APIs with automatic failover
 */
export async function fetchExchangeRates(force = false) {
  // Check memory cache first (skip if forced)
  if (!force && cachedRates && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
    return { rates: cachedRates, lastUpdated: lastFetchTime, fromCache: true, source: rateSource };
  }

  // Check localStorage cache (skip if forced)
  try {
    if (!force) {
      const stored = localStorage.getItem('tripsync_exchange_rates');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.lastUpdated < CACHE_DURATION) {
          cachedRates = parsed.rates;
          lastFetchTime = parsed.lastUpdated;
          rateSource = parsed.source || 'cache';
          return { rates: cachedRates, lastUpdated: lastFetchTime, fromCache: true, source: rateSource };
        }
      }
    }
  } catch {
    // ignore
  }

  // Try API 1: Open.er-api.com
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/EUR?t=${Date.now()}`); // cache busting
    if (!res.ok) throw new Error(`API 1 Status ${res.status}`);
    const data = await res.json();

    if (data.result !== 'success' || !data.rates) {
      throw new Error('API 1 invalid response');
    }

    const rates = parseRatesFromData(data.rates);
    saveRatesToCache(rates, data.time_last_update_utc || new Date().toISOString());
    return { rates, lastUpdated: lastFetchTime, fromCache: false, source: rateSource };
  } catch (err1) {
    console.warn('Primary exchange rate API failed. Trying backup API...', err1);
    
    // Try API 2: api.exchangerate-api.com
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/EUR?t=${Date.now()}`);
      if (!res.ok) throw new Error(`API 2 Status ${res.status}`);
      const data = await res.json();
      
      if (!data.rates) throw new Error('API 2 invalid response');
      
      const rates = parseRatesFromData(data.rates);
      saveRatesToCache(rates, new Date(data.date).toISOString());
      return { rates, lastUpdated: lastFetchTime, fromCache: false, source: rateSource };
    } catch (err2) {
      console.warn('Secondary exchange rate API failed. Trying backup API 3 (Frankfurter)...', err2);

      // Try API 3: Frankfurter.app (highly reliable ECB rates)
      try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=EUR&t=${Date.now()}`);
        if (!res.ok) throw new Error(`API 3 Status ${res.status}`);
        const data = await res.json();

        if (!data.rates) throw new Error('API 3 invalid response');
        
        // Frankfurter does not include EUR in rates since base is EUR, add it back as 1.0
        const rawRates = { ...data.rates, EUR: 1.0 };
        // Frankfurter base is EUR, but does it have KRW? Yes.
        const rates = parseRatesFromData(rawRates);
        saveRatesToCache(rates, new Date(data.date).toISOString());
        return { rates, lastUpdated: lastFetchTime, fromCache: false, source: rateSource };
      } catch (err3) {
        console.error('All exchange rate APIs failed. Using cached or fallback rates.', err3);
        
        // Return memory cached rates if available
        if (cachedRates) {
          return { rates: cachedRates, lastUpdated: lastFetchTime, fromCache: true, source: rateSource };
        }
        
        // Otherwise return static fallback rates with static date
        return { 
          rates: FALLBACK_RATES, 
          lastUpdated: FALLBACK_DATE, 
          fromCache: false, 
          isFallback: true, 
          source: '서버 연결 실패 (기본 고정 환율)' 
        };
      }
    }
  }
}

function parseRatesFromData(rawRates) {
  const krwPerEur = rawRates.KRW;
  if (!krwPerEur) throw new Error('KRW rate not found');

  const rates = {};
  const targetCurrencies = ['EUR', 'GBP', 'CHF', 'CZK', 'USD', 'HUF'];

  targetCurrencies.forEach(code => {
    if (code === 'EUR') {
      rates[code] = krwPerEur;
    } else if (rawRates[code]) {
      rates[code] = krwPerEur / rawRates[code];
    }
  });

  return rates;
}

function saveRatesToCache(rates, sourceTime) {
  cachedRates = rates;
  lastFetchTime = Date.now();
  rateSource = sourceTime;

  try {
    localStorage.setItem('tripsync_exchange_rates', JSON.stringify({
      rates: cachedRates,
      lastUpdated: lastFetchTime,
      source: rateSource,
    }));
  } catch (e) {
    console.error('Failed to cache exchange rates:', e);
  }
}

/**
 * Convert foreign currency amount to KRW
 */
export function convertToKRW(amount, currency, rates) {
  if (!rates || !rates[currency]) return 0;
  return Math.round(amount * rates[currency]);
}

/**
 * Format KRW amount with commas
 */
export function formatKRW(amount) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

/**
 * Format foreign currency amount
 */
export function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency) {
  const symbols = {
    EUR: '€',
    GBP: '£',
    CHF: 'CHF',
    CZK: 'Kč',
    USD: '$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    HUF: 'Ft',
    KRW: '₩',
  };
  return symbols[currency] || currency;
}

/**
 * Format a timestamp as a human-readable date-time string
 */
export function formatRateTime(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export const CURRENCIES = [
  { code: 'EUR', name: '유로', flag: '🇪🇺' },
  { code: 'GBP', name: '영국 파운드', flag: '🇬🇧' },
  { code: 'CHF', name: '스위스 프랑', flag: '🇨🇭' },
  { code: 'CZK', name: '체코 코루나', flag: '🇨🇿' },
  { code: 'USD', name: '미국 달러', flag: '🇺🇸' },
  { code: 'HUF', name: '헝가리 포린트', flag: '🇭🇺' },
];
