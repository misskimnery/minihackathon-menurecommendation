"use client";

import { useState } from "react";
import MenuForm from "./components/MenuForm";
import ResultCards, { Skeleton } from "./components/ResultCards";
import { EMPTY_INPUT, type RecommendInput, type RecommendResult } from "@/lib/menu";

type Status = "form" | "loading" | "done";

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
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          오늘 뭐 먹지? <span aria-hidden="true">🍽️</span>
        </h1>
        <p className="mt-2 text-muted">
          지금 상황만 골라주세요. AI가 메뉴 3가지를 이유까지 붙여 골라드려요.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
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
        <MenuForm
          input={input}
          onChange={setInput}
          onSubmit={submit}
          loading={false}
        />
      )}

      <footer className="mt-12 text-center text-xs text-muted">
        메뉴와 가격은 AI가 생성한 참고용 추천이에요.
      </footer>
    </main>
  );
}
