/**
 * Utility for interacting with Google Gemini API
 */

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite'
];

/**
 * Scan a receipt image using Gemini models with automatic fallback on failure or model-not-found errors.
 * Returns parsed JSON: { amount, currency, description, category }
 */
export async function scanReceiptWithGemini(base64Image, mimeType, apiKey) {
  if (!apiKey) {
    throw new Error('API key is missing. Please register your Gemini API key in Settings.');
  }

  // Clean base64 string
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '');

  const prompt = `
You are an expert receipt parser. Analyze this receipt image and extract:
1. "amount": The total cost/amount paid (number, e.g. 15.50).
2. "currency": The currency code (must be one of: EUR, GBP, CHF, USD, CZK, HUF, PLN, SEK, NOK, DKK, KRW). Defaults to EUR if unsure.
3. "description": A short itemized title or shop name translated to Korean (string, e.g. "식료품 (Lidl)").
4. "category": The expense category. Must be EXACTLY one of: "food", "transport", "stay", "ticket", "shopping", or "etc".

Response MUST be a single raw JSON object. Do not include markdown code block syntax (like \`\`\`json).
Format:
{
  "amount": 15.50,
  "currency": "EUR",
  "description": "식료품 구매 (Lidl)",
  "category": "food"
}
`;

  let lastError = null;

  // Try each model sequentially until one succeeds
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    console.log(`Attempting receipt scan with model: ${model}`);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      // Rate Limit (429) 에러 발생 시 전체 키가 막힌 것이므로 다른 모델 시도 없이 즉시 중단
      if (response.status === 429) {
        console.warn(`API Rate Limit Exceeded (429). Stop retrying.`);
        throw new Error('API 호출 한도(1분당 15회)를 초과했습니다. 약 1분 후에 다시 시도해주세요.');
      }

      // 404, 400, 503 등 특정 모델이 지원되지 않거나 과부하일 경우 다음 모델로 폴백
      if (response.status === 404 || response.status === 400 || response.status === 503) {
        console.warn(`Model ${model} is not available (Status ${response.status}). Trying fallback...`);
        lastError = new Error(`Model ${model} returned ${response.status}`);
        continue; 
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} failed with HTTP ${response.status}:`, errText);
        lastError = new Error(`HTTP Error ${response.status}: ${errText}`);
        continue;
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        console.warn(`Model ${model} response was empty. Trying next...`);
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }

      // Try parsing JSON
      try {
        const cleanedText = textResponse.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        console.log(`Successfully scanned receipt using model: ${model}`);
        return {
          amount: parseFloat(parsed.amount) || 0,
          currency: (parsed.currency || 'EUR').toUpperCase(),
          description: parsed.description || '영수증 지출',
          category: parsed.category || 'etc',
        };
      } catch (e) {
        console.warn(`Failed to parse JSON from model ${model}. Trying next...`, e);
        lastError = new Error(`JSON parse error in model ${model}`);
        continue;
      }
    } catch (error) {
      console.warn(`Network/Request error using model ${model}:`, error);
      lastError = error;
      // Continue to try the next model
    }
  }

  // If we exhausted all models without success, throw the last gathered error
  console.error('All Gemini models failed to parse the receipt.');
  throw lastError || new Error('All Gemini models failed to scan the receipt.');
}

/**
 * Optimize travel schedule places chronologically and add helpful memos using Gemini.
 */
export async function optimizeScheduleWithGemini(scheduleTitle, places, apiKey) {
  if (!apiKey) {
    throw new Error('API key가 없습니다. 설정 페이지에서 Gemini API key를 등록해주세요.');
  }

  const prompt = `
당신은 최고의 여행 일정 플래너이자 동선 최적화 전문가입니다.
아래의 하루 여행 일정 정보와 방문지 리스트를 바탕으로, 지리적 근접성과 추천 방문 순서를 최적화하여 시간대와 함께 일정을 다시 짜주세요.

일정 제목: "${scheduleTitle}"
현재 등록된 장소들:
${places.map((p, i) => `${i + 1}. 이름: "${p.name}", 메모: "${p.memo || '없음'}", 현재 시간: "${p.time || '지정 안 됨'}", url: "${p.url || ''}"`).join('\n')}

[요구사항]
1. 각 장소의 지리적 근접성을 고려하여 최적의 이동 동선(방문 순서)을 설정하세요. (예: 루브르 박물관과 튈르리 정원은 가까우므로 묶어서 배치)
2. 시작 시간과 종료 시간을 포맷에 맞게 지정하세요. (예: "09:00 ~ 11:00", "11:30 ~ 13:00")
3. 이동 시간을 감안하여 현실적으로 시간을 배정하고, 메모가 비어있거나 간단하다면 해당 장소에 대한 유용한 여행 꿀팁(예: "뮤지엄패스 필수", "예약 필수", "경치 좋은 포토 스팟")을 한국어로 친절히 1~2문장 이내의 "memo"로 채워주세요. 기존 메모가 유용하다면 유지하거나 더 발전시켜주세요.
4. 추천할 만한 추가적인 주변 명소가 있다면 최대 1개 추천 장소로 새롭게 일정에 추가해주셔도 좋습니다. (새로운 장소의 id는 빈 문자열로 리턴해주세요)

응답은 반드시 마크다운 코드 블록 등이 없는 순수 JSON 형태여야 하며, 다음 포맷의 배열이어야 합니다:
[
  {
    "id": "기존 장소의 id (새로 추천하는 장소라면 빈 문자열 \"\")",
    "name": "장소 이름",
    "time": "시작시간 ~ 종료시간 (예: \"09:00 ~ 11:00\")",
    "memo": "이 장소에 대한 팁 또는 기존 메모 내용",
    "url": "기존 장소의 url 또는 새 장소의 경우 비워둠"
  }
]
`;

  let lastError = null;

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    console.log(`Attempting schedule optimization with model: ${model}`);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      // Rate Limit (429) 에러 발생 시 전체 키가 막힌 것이므로 다른 모델 시도 없이 즉시 중단
      if (response.status === 429) {
        console.warn(`API Rate Limit Exceeded (429). Stop retrying.`);
        throw new Error('API 호출 한도(1분당 15회)를 초과했습니다. 약 1분 후에 다시 시도해주세요.');
      }

      // 404, 400, 503 등 특정 모델이 지원되지 않거나 과부하일 경우 다음 모델로 폴백
      if (response.status === 404 || response.status === 400 || response.status === 503) {
        console.warn(`Model ${model} is not available (Status ${response.status}). Trying fallback...`);
        lastError = new Error(`Model ${model} returned ${response.status}`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} failed with HTTP ${response.status}:`, errText);
        lastError = new Error(`HTTP Error ${response.status}: ${errText}`);
        continue;
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        console.warn(`Model ${model} response was empty. Trying next...`);
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }

      try {
        const cleanedText = textResponse.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        return parsed;
      } catch (e) {
        console.warn(`Failed to parse JSON from model ${model}. Trying next...`, e);
        lastError = new Error(`JSON parse error in model ${model}`);
        continue;
      }
    } catch (error) {
      console.warn(`Network/Request error using model ${model}:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('All Gemini models failed to optimize the schedule.');
}

/**
 * Generate a dynamic, highly personalized travel tip based on schedules, checklists, and expenses.
 */
export async function getAITravelTip(schedules, checklists, expenses, apiKey) {
  if (!apiKey) {
    throw new Error('API key가 없습니다. 설정 페이지에서 Gemini API key를 등록해주세요.');
  }

  const prompt = `
당신은 최고의 여행 동반자이자 노련한 유럽 현지 여행 가이드입니다.
아래의 여행 정보를 분석하여 오늘 하루 여행자에게 정말로 힘이 되고 유용한 꿀팁을 한국어로 다정하고 세련된 말투로 추천해 주세요.

[여행자 요약 정보]
- 예정된 일정: ${schedules.slice(0, 4).map(s => `"${s.title}" (${s.date || '날짜 미정'})`).join(', ') || '등록된 일정 없음'}
- 준비물 점검: 총 ${checklists.length}개 중 ${checklists.filter(c => c.completed).length}개 준비 완료
- 가계부 내역: 등록된 지출 건수 ${expenses.length}건

[요구사항]
- 2~3문장 이내로 친근하고 다정하게 작성해주세요 (예: "~하는 것을 잊지 마세요!", "~해보면 어떨까요?").
- 지리적 요령, 준비물 대비 팁, 환전/소매치기 예방 등 구체적이고 실전적인 꿀팁 1개를 핵심으로 전달해주세요.
- 순수 텍스트(마크다운 코드블록이나 기호가 없는 깔끔한 문자열)로 리턴해주세요.
`;

  let lastError = null;

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });

      // Rate Limit (429) 에러 발생 시 전체 키가 막힌 것이므로 다른 모델 시도 없이 즉시 중단
      if (response.status === 429) {
        throw new Error('API 호출 한도(1분당 15회)를 초과했습니다. 약 1분 후에 다시 시도해주세요.');
      }

      if (response.status === 404 || response.status === 400 || response.status === 503) {
        lastError = new Error(`Model ${model} returned ${response.status}`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`HTTP Error ${response.status}: ${errText}`);
        continue;
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textResponse) {
        return textResponse.trim().replace(/^```text\s*/i, '').replace(/```$/, '').trim();
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('All Gemini models failed to generate travel tips.');
}

/**
 * Search the web for live, real-time exchange rates using Gemini API Google Search Grounding tool
 */
export async function getLiveRatesWithGemini(apiKey) {
  if (!apiKey) {
    throw new Error('API key가 없습니다. 설정 페이지에서 Gemini API key를 등록해주세요.');
  }

  const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const prompt = `
Today's date is ${todayStr}. Search the web for the absolute latest, live, real-time exchange rates of the following currencies to Korean Won (KRW) right now (as of today, ${todayStr}):
Currencies to search: EUR, GBP, CHF, CZK, USD, HUF.
Please find the current value of 1 unit of each currency in South Korean Won (KRW). For example, 1 EUR to KRW, 1 USD to KRW, etc.

You must respond with a single valid JSON object containing:
1. "rates": An object where keys are the currency codes (EUR, GBP, CHF, CZK, USD, HUF) and values are numbers representing the KRW value (e.g. EUR: 1515.5, USD: 1380.2).
2. "lastUpdated": The exact time or date of the rates you found, as a ISO string or human readable string in Korean Standard Time (e.g., "${new Date().toISOString().slice(0, 10)} 21:00").

Example response format:
{
  "rates": {
    "EUR": 1515.2,
    "GBP": 1785.4,
    "CHF": 1572.0,
    "CZK": 60.1,
    "USD": 1378.5,
    "HUF": 3.75
  },
  "lastUpdated": "${todayStr}"
}
`;

  let lastError = null;

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      });

      // Rate Limit (429) 에러 발생 시 즉시 중단
      if (response.status === 429) {
        throw new Error('API 호출 한도(1분당 15회)를 초과했습니다. 약 1분 후에 다시 시도해주세요.');
      }

      if (response.status === 404 || response.status === 400 || response.status === 503) {
        lastError = new Error(`Model ${model} returned ${response.status}`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`HTTP Error ${response.status}: ${errText}`);
        continue;
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textResponse) {
        const cleanedText = textResponse.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        let parsedTime = Date.now();
        if (parsed.lastUpdated) {
          const d = new Date(parsed.lastUpdated);
          if (!isNaN(d.getTime())) {
            parsedTime = d.getTime();
          }
        }

        return {
          rates: parsed.rates,
          lastUpdated: parsedTime,
          source: 'Gemini 실시간 검색 환율'
        };
      }
    } catch (error) {
      console.error(`Gemini rate search with ${model} failed:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('Gemini API 실시간 환율 검색에 실패했습니다.');
}

/**
 * Search for nearby restaurants based on GPS coordinates using Gemini.
 * Uses reverse-geocoded location info to find restaurants within radius.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} locationName - reverse geocoded address / area name
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<Object>} - { restaurants: [...], searchRadius, locationName }
 */
export async function searchNearbyRestaurantsWithGemini(latitude, longitude, locationName, apiKey) {
  if (!apiKey) {
    throw new Error('API key가 없습니다. 설정 페이지에서 Gemini API key를 등록해주세요.');
  }

  const prompt = `
당신은 유럽 현지 맛집 전문 가이드입니다.
아래의 GPS 좌표와 위치 정보를 기반으로, 해당 위치에서 반경 1km 이내에 있는 맛집들을 추천해주세요.
만약 1km 이내 맛집이 10개 미만이라면, 반경 1.5km까지 확장하여 추천해주세요.

[현재 위치 정보]
- GPS 좌표: 위도 ${latitude}, 경도 ${longitude}
- 위치명: ${locationName || '알 수 없음'}

[요구사항]
⚠️ 매우 중요 (CRITICAL) ⚠️
제공된 위도/경도(${latitude}, ${longitude}) 및 위치명(${locationName})을 정확히 기준으로 삼으세요.
반드시 도보로 이동 가능한 반경 1km 이내(최대 1.5km)의 식당만 엄격하게 선별해야 합니다.
절대로 해당 범위를 벗어난 먼 거리의 식당(예: 다른 지역, 차로 이동해야 하는 거리)을 포함하지 마세요.
distance 필드는 실제 위도/경도 기준 직선거리를 미터(m) 단위로 최대한 정확히 추정하여 기재하세요.

1. Google 평점 4.0 이상인 맛집과 3.5 이상인 맛집을 구분하여 추천해주세요.
2. 각 식당에 대해 다음 정보를 포함해주세요:
   - name: 식당 이름 (현지어 + 한국어 번역)
   - rating: Google 예상 평점 (숫자)
   - cuisine: 요리 종류 (예: 이탈리안, 프렌치, 한식 등)
   - priceRange: 가격대 (€, €€, €€€ 중 하나)
   - specialty: 대표 메뉴 또는 특징 (한국어 1~2문장)
   - signatureMenu: 식당의 추천 대표 메뉴 이름 (현지 음식일 경우 한국어로 번역해서 기재, 예: "트러플 까르보나라")
   - signaturePrice: 대표 메뉴의 대략적인 가격 (구글맵 기준 현지 통화 단위 포함, 예: "€15", "£12")
   - distance: 현재 위치에서의 대략적 거리 (미터 단위 숫자)
   - lat: 식당의 정확한 위도 좌표 (숫자)
   - lng: 식당의 정확한 경도 좌표 (숫자)
   - address: 간단한 주소
   - tip: 한국 여행자를 위한 팁 (한국어 1문장)
3. 최소 5개, 최대 15개의 식당을 추천해주세요.
4. 실제로 존재할 법한 식당을 추천해주세요. 해당 지역의 유명하고 인기 있는 실제 식당 위주로 추천해주세요.

응답은 반드시 마크다운 코드 블록 없는 순수 JSON 형태여야 하며, 다음 포맷이어야 합니다:
{
  "searchRadius": 1000,
  "locationName": "위치명",
  "restaurants": [
    {
      "name": "식당 이름 (현지어)",
      "nameKo": "식당 이름 (한국어)",
      "rating": 4.5,
      "ratingTier": "premium",
      "cuisine": "이탈리안",
      "priceRange": "€€",
      "specialty": "현지인이 추천하는 정통 해산물 파스타 맛집",
      "signatureMenu": "해산물 링귀니",
      "signaturePrice": "€18",
      "distance": 450,
      "lat": 41.9028,
      "lng": 12.4964,
      "address": "Via Roma 12, Rome",
      "tip": "점심 세트 메뉴가 저녁 대비 30% 저렴합니다"
    }
  ]
}

ratingTier 규칙:
- 평점 4.0 이상: "premium"
- 평점 3.5 이상 ~ 4.0 미만: "good"
`;

  let lastError = null;

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    console.log(`Attempting nearby restaurant search with model: ${model}`);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      // Rate Limit (429) 에러 발생 시 전체 키가 막힌 것이므로 다른 모델 시도 없이 즉시 중단
      if (response.status === 429) {
        throw new Error('API 호출 한도(1분당 15회)를 초과했습니다. 약 1분 후에 다시 시도해주세요.');
      }

      if (response.status === 404 || response.status === 400 || response.status === 503) {
        console.warn(`Model ${model} is not available (Status ${response.status}). Trying fallback...`);
        lastError = new Error(`Model ${model} returned ${response.status}`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} failed with HTTP ${response.status}:`, errText);
        lastError = new Error(`HTTP Error ${response.status}: ${errText}`);
        continue;
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        console.warn(`Model ${model} response was empty. Trying next...`);
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }

      try {
        const cleanedText = textResponse.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        // 하버사인 공식(Haversine formula)으로 실제 거리 계산 및 필터링
        if (parsed && Array.isArray(parsed.restaurants)) {
          const R = 6371e3; // 지구 반경 (미터)
          const toRad = (value) => value * Math.PI / 180;
          const lat1 = latitude;
          const lon1 = longitude;
          
          parsed.restaurants = parsed.restaurants.map(rest => {
            if (rest.lat && rest.lng) {
              const lat2 = rest.lat;
              const lon2 = rest.lng;
              const dLat = toRad(lat2 - lat1);
              const dLon = toRad(lon2 - lon1);
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const realDistance = Math.round(R * c);
              
              // 모델이 추정한 거리 대신 실제 거리를 적용
              rest.distance = realDistance;
            }
            return rest;
          }).filter(rest => rest.distance <= 1500); // 1.5km 이내만 통과
        }
        
        if (parsed.restaurants.length === 0) {
          throw new Error('1.5km 반경 내에 검색된 맛집이 없습니다.');
        }

        console.log(`Successfully found nearby restaurants using model: ${model}`);
        return parsed;
      } catch (e) {
        console.warn(`Failed to parse JSON or no valid restaurants from model ${model}. Trying next...`, e);
        lastError = new Error(e.message || `JSON parse error in model ${model}`);
        continue;
      }
    } catch (error) {
      console.warn(`Network/Request error using model ${model}:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('주변 맛집 검색에 실패했습니다.');
}
