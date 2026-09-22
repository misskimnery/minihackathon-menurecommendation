"use client";

import { useState } from "react";
import MenuForm from "./components/MenuForm";
import ResultCards, { Skeleton } from "./components/ResultCards";
import { EMPTY_INPUT, type RecommendInput, type RecommendResult } from "@/lib/menu";

type Status = "form" | "loading" | "done";

/** 배경에 깔리는 장식 — 번진 색 덩어리와 손그림 몇 점 */
function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <span
        className="blob"
        style={{ top: "-6rem", left: "-5rem", width: "22rem", height: "18rem", background: "var(--yolk)" }}
      />
      <span
        className="blob"
        style={{ top: "28%", right: "-7rem", width: "20rem", height: "20rem", background: "var(--tomato)", opacity: 0.28 }}
      />
      <span
        className="blob"
        style={{ bottom: "-6rem", left: "10%", width: "24rem", height: "16rem", background: "var(--basil)", opacity: 0.3 }}
      />

      {/* 포크와 스푼 */}
      <svg
        className="doodle"
        style={{ top: "7rem", left: "1.5rem", transform: "rotate(-14deg)" }}
        width="30" height="76" viewBox="0 0 30 76" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      >
        <path d="M6 4v16M11 4v16M16 4v16M11 20v52" />
        <path d="M25 4c4 6 4 14 0 18-4-4-4-12 0-18ZM25 22v50" />
      </svg>

      {/* 접시 */}
      <svg
        className="doodle"
        style={{ bottom: "12%", right: "2rem" }}
        width="90" height="90" viewBox="0 0 90 90" fill="none" stroke="currentColor" strokeWidth="1.4"
      >
        <circle cx="45" cy="45" r="40" strokeDasharray="3 6" />
        <circle cx="45" cy="45" r="28" />
      </svg>

      {/* 소스가 흐른 자국 */}
      <svg
        className="doodle"
        style={{ top: "44%", left: "-1rem", opacity: 0.3 }}
        width="120" height="70" viewBox="0 0 120 70" fill="currentColor"
      >
        <path d="M4 34c18-22 44-30 68-18 14 7 26 4 44-6-10 20-30 32-52 30C40 38 22 44 4 34Z" />
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
      <Backdrop />
      <main className="relative mx-auto w-full max-w-xl flex-1 px-5 py-12 sm:py-16">
        <header className="relative mb-10">
          <p
            className="hand mb-1"
            style={{ fontSize: "1.3rem", color: "var(--chili)", transform: "rotate(-2deg)" }}
          >
            오늘의 한 끼
          </p>
          <h1 className="display" style={{ fontSize: "clamp(2.6rem, 11vw, 3.6rem)" }}>
            오늘 뭐 먹지?
            <span
              className="ml-2 inline-block align-middle"
              style={{ fontSize: "0.62em", transform: "rotate(-8deg)", display: "inline-block" }}
              aria-hidden="true"
            >
              🍽️
            </span>
          </h1>
          <p className="mt-3 text-[1.02rem] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            지금 상황만 골라주세요. AI가 메뉴 3가지를 이유까지 붙여 골라드려요.
          </p>
          <div
            className="mt-5 h-1.5 w-28 rounded-full"
            style={{ background: "linear-gradient(90deg, var(--tomato), var(--yolk), var(--basil))" }}
            aria-hidden="true"
          />
        </header>

        {error ? (
          <p
            role="alert"
            className="mb-6 rounded-2xl px-4 py-3.5 text-sm"
            style={{
              color: "var(--tomato)",
              background: "rgba(219, 81, 56, 0.1)",
              border: "1px solid rgba(219, 81, 56, 0.28)",
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

        <footer className="mt-14 text-center text-xs" style={{ color: "var(--ink-3)" }}>
          <span className="hand" style={{ fontSize: "1.05rem" }}>
            메뉴와 가격은 AI가 생성한 참고용 추천이에요
          </span>
        </footer>
      </main>
    </>
  );
}
