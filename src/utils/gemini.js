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
        throw new Error('API 한도 초과(1분당 15회 또는 일일 제공량 1,500회 소진). 1분 뒤에도 안되면 내일 시도하거나 새 키를 발급받으세요.');
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
    } catch (error) { if (error.message && error.message.includes('API 호출 한도')) { throw error; }
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
    "id": "기존 장소의 id (새로 추천하는 장소라면 빈 문자열 '')",
    "name": "장소 이름",
    "time": "시작시간 ~ 종료시간 (예: '09:00 ~ 11:00')",
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
        throw new Error('API 한도 초과(1분당 15회 또는 일일 제공량 1,500회 소진). 1분 뒤에도 안되면 내일 시도하거나 새 키를 발급받으세요.');
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
    } catch (error) { if (error.message && error.message.includes('API 호출 한도')) { throw error; }
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
        throw new Error('API 한도 초과(1분당 15회 또는 일일 제공량 1,500회 소진). 1분 뒤에도 안되면 내일 시도하거나 새 키를 발급받으세요.');
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
    } catch (error) { if (error.message && error.message.includes('API 호출 한도')) { throw error; }
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
        throw new Error('API 한도 초과(1분당 15회 또는 일일 제공량 1,500회 소진). 1분 뒤에도 안되면 내일 시도하거나 새 키를 발급받으세요.');
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
    } catch (error) { if (error.message && error.message.includes('API 호출 한도')) { throw error; }
      console.error(`Gemini rate search with ${model} failed:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('Gemini API 실시간 환율 검색에 실패했습니다.');
}

/**
 * Generate AI travel packing recommendations based on destination and weather/season.
 * Returns parsed JSON list of items: [{ name: "item name", category: "essential|clothing|medicine|etc", reason: "reason to pack" }]
 */
export async function getAIPackingRecommendations(destination, weather, apiKey) {
  if (!apiKey) {
    throw new Error('API key가 없습니다. 설정 페이지에서 Gemini API key를 등록해주세요.');
  }

  const prompt = `
당신은 최고의 여행 비서이자 패킹 가이드 전문가입니다.
여행지와 날씨/시기 정보를 기반으로 반드시 가져가야 할 유용하고 센스있는 준비물 목록을 분석해 주세요.

여행지: "${destination}"
날씨/시기: "${weather}"

[요구사항]
1. 여행지의 고유 특성(예: 수질, 치안, 전압, 관광 종류)과 날씨/계절에 맞춘 세부 품목을 최소 5개에서 최대 8개까지 생성해 주세요.
2. 각 품목은 한국어로 명확하고 간결해야 합니다. (예: "샤워기 필터", "멀티 플러그", "우산", "상비 소화제")
3. 각 품목의 카테고리는 다음 중 하나로 배정해 주세요: "essential", "clothing", "medicine", "etc".
4. 왜 가져가야 하는지 한국어로 아주 짤막한 1문장의 사유("reason")를 적어주세요.

응답은 반드시 마크다운 코드 블록 등이 없는 순수 JSON 형태여야 하며, 다음 포맷의 배열이어야 합니다:
[
  {
    "name": "품목 이름",
    "category": "essential 또는 clothing 또는 medicine 또는 etc",
    "reason": "해당 품목을 추천하는 사유"
  }
]
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
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.status === 429) {
        throw new Error('API 한도 초과(1분당 15회 또는 일일 제공량 1,500회 소진). 1분 뒤에도 안되면 내일 시도하거나 새 키를 발급받으세요.');
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
        return parsed;
      }
    } catch (error) {
      if (error.message && error.message.includes('API 호출 한도')) { throw error; }
      lastError = error;
    }
  }

  throw lastError || new Error('All Gemini models failed to generate packing recommendations.');
}
