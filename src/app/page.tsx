"use client";

import { useState } from "react";
import MenuForm from "./components/MenuForm";
import ResultCards, { Skeleton } from "./components/ResultCards";
import { EMPTY_INPUT, type RecommendInput, type RecommendResult } from "@/lib/menu";

type Status = "form" | "loading" | "done";

/** 종이를 손으로 찢은 듯한 가장자리를 만드는 필터. 배경 레이어에만 건다. */
function Deckle() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        <filter id="deckle" x="-6%" y="-8%" width="112%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.042" numOctaves="4" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="deckle-lg" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="4" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/** 찢어낸 색종이 조각과 손으로 그린 선 몇 개 */
function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <span
        className="scrap"
        style={{ top: "-5rem", left: "-4rem", width: "20rem", height: "15rem", background: "var(--rust)", borderRadius: "48% 52% 40% 60% / 56% 44% 56% 44%" }}
      />
      <span
        className="scrap"
        style={{ top: "3rem", right: "-6rem", width: "17rem", height: "17rem", background: "var(--clay)", opacity: 0.42, borderRadius: "50%" }}
      />
      <span
        className="scrap"
        style={{ top: "42%", left: "-5rem", width: "15rem", height: "11rem", background: "var(--sage)", opacity: 0.45, borderRadius: "44% 56% 62% 38% / 48% 52% 48% 52%" }}
      />
      <span
        className="scrap"
        style={{ bottom: "-4rem", right: "8%", width: "19rem", height: "13rem", background: "var(--ochre)", opacity: 0.4, borderRadius: "58% 42% 46% 54% / 50% 56% 44% 50%" }}
      />
      <span
        className="scrap"
        style={{ bottom: "18%", left: "6%", width: "12rem", height: "12rem", background: "var(--terracotta)", opacity: 0.3, borderRadius: "50%" }}
      />

      {/* 굵은 마커로 그린 포크와 스푼 */}
      <svg
        className="doodle"
        style={{ top: "7.5rem", left: "1.2rem", transform: "rotate(-12deg)" }}
        width="34" height="84" viewBox="0 0 34 84" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M6 5c-.6 6-.9 12 .4 17M12 4.5c.2 6 .1 12 .2 17.2M18.4 5.4c.7 6 .6 12 .2 16.8" />
        <path d="M12 22c1.4 18 .6 38-.6 57" />
        <path d="M29 5.5c4.4 6.2 3.8 15-.6 18.6-3.8-4.2-3.4-13 .6-18.6ZM28.2 24.4c.8 18 .5 37-.8 55" />
      </svg>

      {/* 접시 */}
      <svg
        className="doodle"
        style={{ bottom: "11%", right: "1.5rem", opacity: 0.24 }}
        width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2.6"
      >
        <path d="M48 5c24.5 0 43.6 19.6 42.8 43.6C90 71 71 91 47.4 90.8 24 90.6 5 71.2 5.2 47.6 5.4 24.4 24.6 5 48 5Z" strokeDasharray="5 9" />
        <path d="M48 20c15.6.4 28.2 12.6 27.6 28.4C75 63.4 62.6 75.6 47.6 75.2 33 74.8 20.4 62 21 47.2 21.6 32.6 33.6 19.6 48 20Z" />
      </svg>

      {/* 손으로 그린 화살표 — 레퍼런스의 그 느낌 */}
      <svg
        className="doodle"
        style={{ top: "26%", right: "2.5rem", transform: "rotate(14deg)", opacity: 0.26 }}
        width="70" height="48" viewBox="0 0 70 48" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M4 40C14 16 36 4 64 9" />
        <path d="M52 4c4.6 1.6 8.6 3.2 12 5-2.6 3.4-5.4 7-8 11.4" />
      </svg>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState<RecommendInput>(EMPTY_INPUT);
  const [status, setStatus] = useState<Status>("form");
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "추천을 받지 못했어요.");
        setStatus("form");
        return;
      }
      setResult(data as RecommendResult);
      setStatus("done");
    } catch {
      setError("서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.");
      setStatus("form");
    }
  }

  return (
    <>
      <Deckle />
      <Backdrop />
      <main className="relative mx-auto w-full max-w-xl flex-1 px-5 py-12 sm:py-16">
        <header className="relative mb-11">
          <p
            className="hand mb-1"
            style={{ fontSize: "1.35rem", color: "var(--rust)", transform: "rotate(-2.5deg)" }}
          >
            오늘의 한 끼
          </p>
          <h1 className="display" style={{ fontSize: "clamp(2.6rem, 11vw, 3.6rem)" }}>
            오늘 뭐 먹지?
            <span
              className="ml-2 inline-block align-middle"
              style={{ fontSize: "0.62em", transform: "rotate(-8deg)" }}
              aria-hidden="true"
            >
              🍽️
            </span>
          </h1>

          {/* 제목 밑에 거칠게 그은 밑줄 */}
          <svg
            className="mt-1 w-56 max-w-full"
            height="12"
            viewBox="0 0 240 12"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M3 8.2C42 3.4 84 9.6 124 5.2c32-3.5 74 3.4 113 1.2"
              stroke="var(--terracotta)"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.75"
            />
          </svg>

          <p className="mt-3 text-[1.02rem] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            지금 상황만 골라주세요. AI가 메뉴 3가지를 이유까지 붙여 골라드려요.
          </p>
        </header>

        {error ? (
          <p
            role="alert"
            className="mb-6 rounded-2xl px-4 py-3.5 text-sm"
            style={{
              color: "var(--terracotta)",
              background: "rgba(192, 86, 58, 0.1)",
              border: "1.5px solid rgba(192, 86, 58, 0.3)",
            }}
          >
            {error}
          </p>
        ) : null}

        {status === "loading" ? (
          <Skeleton />
        ) : status === "done" && result ? (
          <ResultCards
            result={result}
            onRetry={() => {
              setStatus("form");
              setResult(null);
            }}
          />
        ) : (
          <MenuForm input={input} onChange={setInput} onSubmit={submit} loading={false} />
        )}

        <footer className="mt-14 text-center" style={{ color: "var(--ink-3)" }}>
          <span className="hand" style={{ fontSize: "1.1rem" }}>
            메뉴와 가격은 AI가 생성한 참고용 추천이에요
          </span>
        </footer>
      </main>
    </>
  );
}
