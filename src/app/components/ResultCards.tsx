"use client";

import type { RecommendResult } from "@/lib/menu";

export function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-live="polite" aria-busy="true">
      <p className="text-center text-muted">Gemini가 메뉴를 고르고 있어요…</p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-line bg-surface p-5"
        >
          <div className="h-6 w-1/3 rounded bg-line" />
          <div className="mt-4 h-4 w-full rounded bg-line" />
          <div className="mt-2 h-4 w-4/5 rounded bg-line" />
          <div className="mt-4 flex gap-2">
            <div className="h-7 w-24 rounded-full bg-line" />
            <div className="h-7 w-24 rounded-full bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ResultCards({
  result,
  onRetry,
}: {
  result: RecommendResult;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="rise text-center text-lg font-semibold">{result.headline}</p>

      {result.menus.map((m, i) => (
        <article
          key={`${m.name}-${i}`}
          className="rise rounded-2xl border border-line bg-surface p-5 shadow-sm"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <header className="flex items-center gap-3">
            <span aria-hidden="true" className="text-3xl">
              {m.emoji}
            </span>
            <h2 className="flex-1 text-xl font-bold">{m.name}</h2>
            <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-sm text-brand">
              {m.priceHint}
            </span>
          </header>

          <p className="mt-3 leading-relaxed text-muted">{m.reason}</p>

          <dl className="mt-4 flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
              <dt className="text-muted">사이드</dt>
              <dd className="font-medium">{m.side}</dd>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
              <dt className="text-muted">음료</dt>
              <dd className="font-medium">{m.drink}</dd>
            </div>
          </dl>
        </article>
      ))}

      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl border border-line bg-surface px-6 py-4 font-semibold transition-colors hover:border-brand hover:text-brand"
      >
        조건 바꿔서 다시 추천받기
      </button>
    </div>
  );
}
