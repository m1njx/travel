import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Info } from 'lucide-react';

const loadGeocodeCache = () => {
  try {
    const saved = localStorage.getItem('tripsync_geocodes');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const saveGeocodeCache = (cache) => {
  try {
    localStorage.setItem('tripsync_geocodes', JSON.stringify(cache));
  } catch (e) {}
};

export default function TravelMap({ places, dateLabel }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  
  const [geocodedPlaces, setGeocodedPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Geocode all places using Nominatim API + Local Cache
  useEffect(() => {
    let active = true;
    
    const geocodeAll = async () => {
      setLoading(true);
      setError(null);
      
      const cache = loadGeocodeCache();
      const results = [];
      let updatedCache = false;

      // Filter and clean place names
      const placesToGeocode = places.filter(p => p.name && p.name.trim() !== '');

      for (let i = 0; i < placesToGeocode.length; i++) {
        const place = placesToGeocode[i];
        // Strip emojis
        const query = place.name.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
        
        if (!query) continue;

        if (cache[query]) {
          results.push({
            ...place,
            lat: cache[query].lat,
            lng: cache[query].lng,
          });
        } else {
          // Add a slight delay between requests to Nominatim to be nice (OSM usage policy)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }

          try {
            console.log(`Geocoding via Nominatim: ${query}`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                cache[query] = { lat, lng };
                updatedCache = true;
                results.push({
                  ...place,
                  lat,
                  lng,
                });
              }
            }
          } catch (e) {
            console.error('Nominatim search failed for:', query, e);
          }
        }
      }

      if (updatedCache) {
        saveGeocodeCache(cache);
      }

      if (active) {
        setGeocodedPlaces(results);
        setLoading(false);
        if (results.length === 0 && placesToGeocode.length > 0) {
          setError('장소들의 위치 정보를 찾을 수 없습니다. 주소나 정확한 명칭으로 수정해보세요.');
        }
      }
    };

    geocodeAll();

    return () => {
      active = false;
    };
  }, [places]);

  // 2. Load Leaflet script & CSS dynamically if not present
  useEffect(() => {
    if (loading || geocodedPlaces.length === 0) return;

    let mapInstance = null;

    const initMap = () => {
      if (!window.L || !mapContainerRef.current) return;

      // Clean up previous map if it exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = window.L;

      // Center around the first place or a default
      const startCoords = [geocodedPlaces[0].lat, geocodedPlaces[0].lng];
      
      mapInstance = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(startCoords, 14);

      mapInstanceRef.current = mapInstance;

      // Add elegant CartoDB Positron tiles (light modern look)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance);

      // Create Custom DivIcons and markers
      const coordinates = [];
      markersRef.current = [];

      geocodedPlaces.forEach((place, index) => {
        const latLng = [place.lat, place.lng];
        coordinates.push(latLng);

        // Styled CSS DivIcon - clean round blue bubble with sequence number
        const customIcon = L.divIcon({
          html: `<div class="w-7 h-7 rounded-full bg-toss-blue border-2 border-white text-white flex items-center justify-center text-[12px] font-bold shadow-md shadow-toss-blue/30 transform transition-transform hover:scale-110 duration-200">
                  ${index + 1}
                 </div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const popupContent = `
          <div class="p-2.5 font-sans min-w-[140px]">
            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
              <span class="text-[10px] font-bold bg-toss-blue/10 text-toss-blue px-1.5 py-0.5 rounded">코스 ${index + 1}</span>
              ${place.time ? `<span class="text-[10px] font-semibold text-toss-text-secondary bg-toss-bg px-1.5 py-0.5 rounded">⏰ ${place.time}</span>` : ''}
            </div>
            <h5 class="text-[13px] font-bold text-toss-text-primary m-0">${place.name}</h5>
            ${place.memo ? `<p class="text-[11px] text-toss-text-secondary mt-1 m-0 leading-relaxed border-t border-toss-bg pt-1">${place.memo}</p>` : ''}
          </div>
        `;

        const marker = L.marker(latLng, { icon: customIcon })
          .addTo(mapInstance)
          .bindPopup(popupContent, { closeButton: false, offset: [0, -5] });

        markersRef.current.push(marker);
      });

      // Draw Polyline connecting places sequentially
      if (coordinates.length > 1) {
        polylineRef.current = L.polyline(coordinates, {
          color: '#3182f6',
          weight: 4,
          opacity: 0.65,
          dashArray: '8, 8', // dashed path for active flight/walking route feel
          lineJoin: 'round'
        }).addTo(mapInstance);

        // Zoom fit all markers with bounds padding
        const bounds = L.latLngBounds(coordinates);
        mapInstance.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    // Load Leaflet CDN if not already loaded in window
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        initMap();
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, geocodedPlaces]);

  return (
    <div className="bg-toss-bg/30 rounded-2xl border border-toss-border/60 overflow-hidden relative min-h-[380px] h-[420px] shadow-inner">
      {loading && (
        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-[3.5px] border-toss-blue-light border-t-toss-blue rounded-full animate-spin" />
          <p className="text-[13px] font-semibold text-toss-text-secondary">지도 로딩 및 장소 위치 정보 탐색 중...</p>
          <span className="text-[11px] text-toss-text-tertiary">첫 탐색 이후로는 캐시되어 즉시 표시됩니다.</span>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mb-3">
            <Info className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-[14px] font-bold text-toss-text-primary mb-1">{error}</p>
          <p className="text-[12px] text-toss-text-secondary max-w-[280px]">등록하신 장소의 이름을 프랑스 에펠탑처럼 상세히 작성하시면 더 정확한 매핑이 이루어집니다.</p>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Info Badge overlay */}
      {!loading && !error && geocodedPlaces.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-sm border border-toss-border/80 max-w-[280px] pointer-events-none">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-toss-blue" />
            <span className="text-[12px] font-bold text-toss-text-primary">{dateLabel} 동선</span>
          </div>
          <p className="text-[11px] text-toss-text-secondary leading-relaxed m-0">총 {geocodedPlaces.length}개 코스 연결 완료. 핀을 클릭하시면 상세 일정을 확인하실 수 있습니다.</p>
        </div>
      )}
    </div>
  );
}
