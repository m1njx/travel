import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Info, ChevronRight, ChevronLeft, VolumeX } from 'lucide-react';

const PHRASES_DATA = [
  {
    country: '프랑스',
    flag: '🇫🇷',
    color: 'from-blue-500/20 to-red-500/20',
    borderColor: 'border-blue-500/30',
    lang: 'fr-FR',
    phrases: [
      { ko: '안녕하세요', text: 'Bonjour', pron: '봉쥬르' },
      { ko: '감사합니다', text: 'Merci', pron: '메르시' },
      { ko: '영수증 주세요', text: "L'addition, s'il vous plaît", pron: '라디시옹 실 부 플레' },
      { ko: '화장실은 어디인가요?', text: 'Où sont les toilettes ?', pron: '우 송 레 뚜알렛?' },
    ],
    etiquette: '팁은 의무가 아니며 보통 서비스료가 포함되어 있습니다. 웨이터를 소리쳐 부르지 않고 눈을 마주쳐서 부르는 것이 예의입니다.'
  },
  {
    country: '이탈리아',
    flag: '🇮🇹',
    color: 'from-green-500/20 to-red-500/20',
    borderColor: 'border-green-500/30',
    lang: 'it-IT',
    phrases: [
      { ko: '안녕하세요', text: 'Buongiorno / Ciao', pron: '본조르노 / 챠오' },
      { ko: '감사합니다', text: 'Grazie', pron: '그라치에' },
      { ko: '계산할게요', text: 'Il conto, per favore', pron: '일 콘토 페르 파보레' },
      { ko: '화장실은 어디인가요?', text: "Dov'è il bagno?", pron: '도베 일 바뇨?' },
    ],
    etiquette: '식당에서 자릿세(Coperto)가 1~3유로 정도 따로 붙는 경우가 많습니다. 식후에는 아메리카노 대신 에스프레소를 마십니다.'
  },
  {
    country: '영국',
    flag: '🇬🇧',
    color: 'from-blue-700/20 to-red-700/20',
    borderColor: 'border-blue-700/30',
    lang: 'en-GB',
    phrases: [
      { ko: '안녕하세요', text: 'Hello / Hi', pron: '헬로 / 하이' },
      { ko: '감사합니다', text: 'Thank you / Cheers', pron: '땡큐 / 치어스' },
      { ko: '계산할게요', text: 'Could I have the bill, please?', pron: '쿠 다이 해브 더 빌, 플리즈?' },
      { ko: '화장실은 어디인가요?', text: 'Where is the toilet?', pron: '웨어 이즈 더 토일렛?' },
    ],
    etiquette: '줄 서기 문화를 매우 중시합니다. 펍(Pub)에서는 자리에 앉아서 주문하지 않고 바(Bar)에 직접 가서 주문과 결제를 합니다.'
  },
  {
    country: '스페인',
    flag: '🇪🇸',
    color: 'from-red-500/20 to-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    lang: 'es-ES',
    phrases: [
      { ko: '안녕하세요', text: 'Hola', pron: '올라' },
      { ko: '감사합니다', text: 'Gracias', pron: '그라시아스' },
      { ko: '계산할게요', text: 'La cuenta, por favor', pron: '라 쿠엔타 뽀르 파보르' },
      { ko: '화장실은 어디인가요?', text: '¿Dónde está el baño?', pron: '돈데 에스타 엘 바뇨?' },
    ],
    etiquette: '오후 2~5시 사이에는 시에스타(낮잠) 시간으로 문을 닫는 상점이 많습니다. 저녁 식사는 보통 밤 8시 30분 이후에 늦게 시작합니다.'
  },
  {
    country: '독일',
    flag: '🇩🇪',
    color: 'from-black/20 via-red-500/20 to-yellow-500/20',
    borderColor: 'border-black/30',
    lang: 'de-DE',
    phrases: [
      { ko: '안녕하세요', text: 'Guten Tag', pron: '구텐 탁' },
      { ko: '감사합니다', text: 'Danke', pron: '당케' },
      { ko: '계산할게요', text: 'Die Rechnung, bitte', pron: '디 레흐눙 비테' },
      { ko: '화장실은 어디인가요?', text: 'Wo ist die Toilette?', pron: '보 이스트 디 토알레테?' },
    ],
    etiquette: '계산할 때 더치페이가 아주 자연스럽습니다("Zusammen oder getrennt?"). 물은 기본적으로 탄산수를 주므로 일반 물은 "Stilles Wasser"라고 해야 합니다.'
  }
];

export default function SurvivalPhrases() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingPhrase, setPlayingPhrase] = useState(null);
  const scrollRef = useRef(null);

  const handleSpeak = (text, lang) => {
    if (!window.speechSynthesis) return;
    
    // Stop current speech if any
    window.speechSynthesis.cancel();

    if (playingPhrase === text) {
      setPlayingPhrase(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85; // slightly slower for clarity
    
    utterance.onend = () => {
      setPlayingPhrase(null);
    };

    setPlayingPhrase(text);
    window.speechSynthesis.speak(utterance);
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = scrollRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / cardWidth);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  const scrollTo = (index) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  return (
    <div className="w-full flex flex-col pt-2 pb-6">
      <div className="flex items-center justify-between px-5 mb-4">
        <div className="flex items-center gap-1.5 font-bold text-toss-text-primary text-[15px]">
          <span className="text-[16px]">💬</span>
          <span>오프라인 생존 회화 & 에티켓</span>
        </div>
        <div className="flex gap-1">
          {PHRASES_DATA.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeIndex ? 'bg-toss-blue w-3' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative w-full">
        {/* Left/Right controls for desktop */}
        <button 
          onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
          className={`hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md items-center justify-center z-10 transition-opacity ${activeIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105'}`}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <button 
          onClick={() => scrollTo(Math.min(PHRASES_DATA.length - 1, activeIndex + 1))}
          className={`hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md items-center justify-center z-10 transition-opacity ${activeIndex === PHRASES_DATA.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105'}`}
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide px-5 gap-4"
          style={{ scrollBehavior: 'smooth' }}
        >
          {PHRASES_DATA.map((data, idx) => (
            <div 
              key={idx}
              className={`flex-none w-full max-w-[400px] snap-center shrink-0 rounded-2xl bg-gradient-to-br ${data.color} border ${data.borderColor} p-5 backdrop-blur-md relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-4 text-5xl opacity-20 transform translate-x-2 -translate-y-2 select-none pointer-events-none">
                {data.flag}
              </div>
              
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className="text-2xl">{data.flag}</span>
                <h4 className="font-extrabold text-[18px] text-gray-800">{data.country} 필수 회화</h4>
              </div>

              <div className="flex flex-col gap-3 relative z-10">
                {data.phrases.map((phrase, pIdx) => (
                  <div key={pIdx} className="flex items-center justify-between bg-white/70 backdrop-blur-md rounded-xl p-3 shadow-sm border border-white/50">
                    <div className="flex flex-col">
                      <span className="text-[12px] text-toss-blue font-bold mb-0.5">{phrase.ko}</span>
                      <span className="font-extrabold text-gray-900 tracking-tight">{phrase.text}</span>
                      <span className="text-[11px] text-gray-500 font-medium mt-0.5">{phrase.pron}</span>
                    </div>
                    <button 
                      onClick={() => handleSpeak(phrase.text, data.lang)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${playingPhrase === phrase.text ? 'bg-toss-blue text-white shadow-md animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {playingPhrase === phrase.text ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-white/60 backdrop-blur-md rounded-xl p-3.5 border border-white/50 relative z-10 flex gap-2.5 items-start">
                <div className="mt-0.5 bg-yellow-100 text-yellow-600 rounded-full p-1 shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-gray-800 mb-0.5">문화 팁 & 에티켓</span>
                  <span className="text-[12px] text-gray-600 font-medium leading-relaxed tracking-tight">
                    {data.etiquette}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
