/** 화면에 나오는 모든 문구. 선택지 이름은 menu.ts 의 ko/en 을 쓴다. */

import type { Lang } from "./menu";

export type Copy = {
  langName: string;
  kicker: string;
  title: string;
  subtitle: string;

  secMood: string;
  secBudget: string;
  secCompany: string;
  secWeather: string;
  secPrefer: string;
  secAvoid: string;
  secAge: string;

  noteMood: string;
  noteBudget: string;
  noteWeather: string;
  notePrefer: string;
  noteAvoid: string;
  noteAge: string;

  moodLow: string;
  moodMid: string;
  moodHigh: string;
  moodAria: string;
  moodValueText: (score: number, step: string) => string;

  avoidEtcLabel: string;
  avoidEtcPlaceholder: string;

  alcoholQuestion: string;
  minorNote: string;

  ctaReady: string;
  ctaIncomplete: string;
  ctaLoading: string;

  loadingLine: string;
  resultSub: string;
  side: string;
  drink: string;
  pairing: string;
  retry: string;
  footer: string;

  errNetwork: string;
  errGeneric: string;
};

const ko: Copy = {
  langName: "한국어",
  kicker: "오늘의 한 끼",
  title: "오늘 뭐 먹지?",
  subtitle: "지금 상황만 고르면 AI가 취향에 딱 맞는 3가지 음식을 이유와 함께 추천해드려요!",

  secMood: "지금 기분",
  secBudget: "예산",
  secCompany: "함께 먹는 사람",
  secWeather: "날씨",
  secPrefer: "평소 선호하는 메뉴",
  secAvoid: "못 먹는 음식",
  secAge: "나이",

  noteMood: "드래그해서 골라요",
  noteBudget: "1인분 기준",
  noteWeather: "오늘 밖은 어때요?",
  notePrefer: "여러 개 골라도 돼요",
  noteAvoid: "없으면 넘어가요",
  noteAge: "술 추천 때문에 물어요",

  moodLow: "기분 최악",
  moodMid: "기분 중간",
  moodHigh: "기분 최고",
  moodAria: "지금 기분",
  moodValueText: (score, step) => `${score}점, ${step}`,

  avoidEtcLabel: "그 밖에 빼고 싶은 재료가 있다면",
  avoidEtcPlaceholder: "예: 고수, 번데기",

  alcoholQuestion: "술도 추천받을까요?",
  minorNote: "술은 빼고 음료로만 골라드릴게요 🧃",

  ctaReady: "메뉴 추천받기",
  ctaIncomplete: "위 항목을 골라주세요",
  ctaLoading: "고르는 중…",

  loadingLine: "Gemini가 메뉴를 고르고 있어요…",
  resultSub: "오늘의 세 접시",
  side: "사이드",
  drink: "음료",
  pairing: "한 잔",
  retry: "조건 바꿔서 다시 추천받기",
  footer: "메뉴와 가격은 AI가 생성한 참고용 추천이에요",

  errNetwork: "서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.",
  errGeneric: "추천을 받지 못했어요.",
};

const en: Copy = {
  langName: "English",
  kicker: "Today's meal",
  title: "What should I eat?",
  subtitle: "Tell us about your day, and we'll pick 3 dishes that fit just right!",

  secMood: "Your mood",
  secBudget: "Budget",
  secCompany: "Who you're eating with",
  secWeather: "Weather",
  secPrefer: "What you usually like",
  secAvoid: "Foods you can't eat",
  secAge: "Age",

  noteMood: "drag to set",
  noteBudget: "per person",
  noteWeather: "how's it outside?",
  notePrefer: "pick as many as you like",
  noteAvoid: "skip if none",
  noteAge: "asked for drink pairing",

  moodLow: "Awful",
  moodMid: "Okay",
  moodHigh: "Amazing",
  moodAria: "Your mood right now",
  moodValueText: (score, step) => `${score} out of 100, ${step}`,

  avoidEtcLabel: "Anything else you'd like left out",
  avoidEtcPlaceholder: "e.g. cilantro, olives",

  alcoholQuestion: "Want a drink pairing?",
  minorNote: "No alcohol — we'll stick to soft drinks 🧃",

  ctaReady: "Find my 3 dishes",
  ctaIncomplete: "Pick the options above",
  ctaLoading: "Picking…",

  loadingLine: "Gemini is picking your dishes…",
  resultSub: "Three plates for today",
  side: "Side",
  drink: "Drink",
  pairing: "Pairing",
  retry: "Change your answers and try again",
  footer: "Dishes and prices are AI-generated suggestions",

  errNetwork: "Couldn't reach the server. Check your connection and try again.",
  errGeneric: "Couldn't get a recommendation.",
};

export const COPY: Record<Lang, Copy> = { ko, en };

export const LANG_KEY = "menu.lang";

export function isLang(v: unknown): v is Lang {
  return v === "ko" || v === "en";
}

/* 고른 언어는 브라우저에만 남긴다.
   effect 안에서 setState 하는 대신 작은 외부 스토어로 둬야 첫 렌더가 어긋나지 않는다.
   저장이 막힌 브라우저(시크릿 모드 등)에서는 그냥 한국어로 뜬다. */
let listeners: (() => void)[] = [];

export function subscribeLang(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function getLangSnapshot(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* 무시 */
  }
  return "ko";
}

/** 서버에서는 늘 한국어로 그린다. */
export function getLangServerSnapshot(): Lang {
  return "ko";
}

export function setStoredLang(next: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* 무시 */
  }
  listeners.forEach((cb) => cb());
}
