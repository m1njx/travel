import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Star, Navigation, RefreshCw, ChevronDown, ChevronUp,
  UtensilsCrossed, AlertCircle, Loader, Clock, DollarSign, Compass,
  ExternalLink, Sparkles, X
} from 'lucide-react';
import { searchNearbyRestaurantsWithGemini } from '../utils/gemini';

const CACHE_KEY = 'tripsync_nearby_restaurants';
const CACHE_DURATION = 30 * 60 * 1000; // 30분 캐시

/**
 * Reverse geocode GPS coordinates using the free Nominatim API.
 */
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
      { headers: { 'User-Agent': 'TripSync/2.0' } }
    );
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    const addr = data.address || {};
    const parts = [addr.city || addr.town || addr.village, addr.state, addr.country].filter(Boolean);
    return parts.join(', ') || data.display_name || '알 수 없는 위치';
  } catch {
    return '알 수 없는 위치';
  }
}

/**
 * Get current GPS position as a Promise.
 */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저에서 위치 서비스를 지원하지 않습니다.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('현재 위치 정보를 가져올 수 없습니다.'));
            break;
          case error.TIMEOUT:
            reject(new Error('위치 정보 요청 시간이 초과되었습니다.'));
            break;
          default:
            reject(new Error('위치를 가져오는 중 오류가 발생했습니다.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

function RestaurantCard({ restaurant, index }) {
  const [expanded, setExpanded] = useState(false);
  const isPremium = restaurant.ratingTier === 'premium';

  const ratingColor = isPremium ? 'text-amber-500' : 'text-toss-blue';
  const ratingBg = isPremium ? 'bg-amber-50' : 'bg-blue-50';
  const tierLabel = isPremium ? '⭐ 4.0+' : '👍 3.5+';
  const tierBadgeColor = isPremium
    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
    : 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-white rounded-2xl border border-toss-border/60 overflow-hidden hover:shadow-md transition-shadow duration-300"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        {/* Rank & Rating */}
        <div className="flex flex-col items-center gap-1 shrink-0 min-w-[44px]">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ratingBg}`}>
            <span className={`text-lg font-bold ${ratingColor}`}>{restaurant.rating}</span>
          </div>
          <span className="text-[9px] text-toss-text-tertiary font-medium">#{index + 1}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-[14px] font-bold text-toss-text-primary truncate leading-tight">
              {restaurant.name}
            </h4>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${tierBadgeColor} shrink-0`}>
              {tierLabel}
            </span>
          </div>
          {restaurant.nameKo && restaurant.nameKo !== restaurant.name && (
            <p className="text-[11px] text-toss-text-secondary mb-1">{restaurant.nameKo}</p>
          )}
          <div className="flex items-center gap-2.5 text-[11px] text-toss-text-secondary flex-wrap">
            <span className="flex items-center gap-0.5">
              <UtensilsCrossed className="w-3 h-3" />
              {restaurant.cuisine}
            </span>
            <span className="flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />
              {restaurant.priceRange}
            </span>
            <span className="flex items-center gap-0.5">
              <Navigation className="w-3 h-3" />
              {restaurant.distance >= 1000
                ? `${(restaurant.distance / 1000).toFixed(1)}km`
                : `${restaurant.distance}m`}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 pt-1">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-toss-text-tertiary" />
            : <ChevronDown className="w-4 h-4 text-toss-text-tertiary" />
          }
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2.5 border-t border-toss-border/40 pt-3">
              {/* Specialty */}
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-toss-text-primary leading-relaxed">{restaurant.specialty}</p>
              </div>

              {/* Signature Menu & Price */}
              {(restaurant.signatureMenu || restaurant.signaturePrice) && (
                <div className="flex items-start gap-2 bg-purple-50/50 rounded-lg p-2.5">
                  <span className="text-[12px] shrink-0 mt-0.5">🍽️</span>
                  <div className="flex-1">
                    <p className="text-[11.5px] font-bold text-toss-text-primary">
                      {restaurant.signatureMenu} 
                      {restaurant.signaturePrice && <span className="text-toss-blue ml-1.5">{restaurant.signaturePrice}</span>}
                    </p>
                    <p className="text-[10px] text-toss-text-tertiary mt-0.5">AI 추천 대표 메뉴</p>
                  </div>
                </div>
              )}

              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-toss-text-tertiary shrink-0 mt-0.5" />
                <p className="text-[11px] text-toss-text-secondary">{restaurant.address}</p>
              </div>

              {/* Tip */}
              {restaurant.tip && (
                <div className="bg-toss-bg rounded-xl p-2.5 flex items-start gap-2">
                  <span className="text-[12px]">💡</span>
                  <p className="text-[11px] text-toss-text-secondary leading-relaxed">{restaurant.tip}</p>
                </div>
              )}

              {/* Google Maps Link */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-toss-blue font-semibold hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Google Maps에서 보기
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function NearbyRestaurants({ apiKey }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'premium', 'good'

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          setResult(parsed.data);
          setLocationInfo(parsed.locationInfo);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const searchRestaurants = useCallback(async () => {
    if (!apiKey) {
      setError('API key가 설정되지 않았습니다. 설정 페이지에서 Gemini API key를 등록해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get current GPS position
      const position = await getCurrentPosition();
      const { latitude, longitude } = position;

      // Step 2: Reverse geocode to get location name
      const locationName = await reverseGeocode(latitude, longitude);
      setLocationInfo({ latitude, longitude, locationName });

      // Step 3: Call Gemini to search nearby restaurants
      const data = await searchNearbyRestaurantsWithGemini(latitude, longitude, locationName, apiKey);
      setResult(data);

      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        locationInfo: { latitude, longitude, locationName },
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Nearby restaurant search failed:', err);
      setError(err.message || '주변 맛집 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const restaurants = result?.restaurants || [];
  const filteredRestaurants = filter === 'all'
    ? restaurants
    : restaurants.filter(r => r.ratingTier === filter);
  const premiumCount = restaurants.filter(r => r.ratingTier === 'premium').length;
  const goodCount = restaurants.filter(r => r.ratingTier === 'good').length;

  return (
    <div className="bg-white rounded-2xl border border-toss-border/60 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !result && !loading) {
            searchRestaurants();
          }
        }}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-toss-bg/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-400 rounded-xl flex items-center justify-center shadow-sm">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-[15px] font-bold text-toss-text-primary">주변 맛집 추천</h3>
            <p className="text-[11px] text-toss-text-secondary mt-0.5">
              {result
                ? `${restaurants.length}개 맛집 발견 · 반경 ${result.searchRadius >= 1000 ? (result.searchRadius / 1000).toFixed(1) + 'km' : result.searchRadius + 'm'}`
                : 'GPS 기반 실시간 검색'}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown className="w-5 h-5 text-toss-text-tertiary" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
              {/* Location Info */}
              {locationInfo && (
                <div className="flex items-center gap-2 p-3 bg-toss-bg rounded-xl">
                  <Compass className="w-4 h-4 text-toss-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-toss-text-primary truncate">{locationInfo.locationName}</p>
                    <p className="text-[10px] text-toss-text-tertiary">
                      {locationInfo.latitude.toFixed(5)}, {locationInfo.longitude.toFixed(5)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      searchRestaurants();
                    }}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-white/80 transition-colors disabled:opacity-50"
                    title="다시 검색"
                  >
                    <RefreshCw className={`w-4 h-4 text-toss-blue ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader className="w-8 h-8 text-toss-blue" />
                  </motion.div>
                  <div className="text-center space-y-1">
                    <p className="text-[13px] font-semibold text-toss-text-primary">주변 맛집 검색 중...</p>
                    <p className="text-[11px] text-toss-text-secondary">위치 확인 → AI 분석 중</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-toss-danger" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[13px] font-semibold text-toss-text-primary">검색 실패</p>
                    <p className="text-[11px] text-toss-text-secondary max-w-xs">{error}</p>
                  </div>
                  <button
                    onClick={searchRestaurants}
                    className="px-4 py-2 bg-toss-blue text-white text-[12px] font-semibold rounded-xl hover:bg-toss-blue-dark transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {/* Results */}
              {!loading && !error && restaurants.length > 0 && (
                <>
                  {/* Filter Tabs */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                        filter === 'all'
                          ? 'bg-toss-text-primary text-white'
                          : 'bg-toss-bg text-toss-text-secondary hover:bg-toss-border/50'
                      }`}
                    >
                      전체 {restaurants.length}
                    </button>
                    <button
                      onClick={() => setFilter('premium')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                        filter === 'premium'
                          ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
                          : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      <Star className="w-3 h-3" /> 4.0+ ({premiumCount})
                    </button>
                    <button
                      onClick={() => setFilter('good')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                        filter === 'good'
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      👍 3.5+ ({goodCount})
                    </button>
                  </div>

                  {/* Restaurant List */}
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {filteredRestaurants
                      .sort((a, b) => b.rating - a.rating)
                      .map((restaurant, i) => (
                        <RestaurantCard key={`${restaurant.name}-${i}`} restaurant={restaurant} index={i} />
                      ))}
                  </div>

                  {filteredRestaurants.length === 0 && (
                    <p className="text-center text-[12px] text-toss-text-tertiary py-6">
                      해당 조건의 맛집이 없습니다.
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-toss-border/40">
                    <p className="text-[10px] text-toss-text-tertiary">
                      AI 추천 결과 · Google 평점 기준
                    </p>
                    <p className="text-[10px] text-toss-text-tertiary">
                      Powered by Gemini ✨
                    </p>
                  </div>
                </>
              )}

              {/* Empty state when no result yet */}
              {!loading && !error && !result && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-orange-400" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[13px] font-semibold text-toss-text-primary">위치를 확인해주세요</p>
                    <p className="text-[11px] text-toss-text-secondary max-w-xs">
                      GPS를 통해 현재 위치 주변의 맛집을 AI가 추천해드립니다
                    </p>
                  </div>
                  <button
                    onClick={searchRestaurants}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-400 to-red-400 text-white text-[12px] font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md shadow-orange-200"
                  >
                    <Navigation className="w-4 h-4" />
                    주변 맛집 검색하기
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
