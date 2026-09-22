"use client";

import { COPY } from "@/lib/i18n";
import type { Lang, RecommendResult } from "@/lib/menu";

export function Skeleton({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col gap-4" aria-live="polite" aria-busy="true">
      <p className="hand text-center" style={{ fontSize: "1.3rem", color: "var(--terracotta)" }}>
        {COPY[lang].loadingLine}
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="torn card" style={{ opacity: 0.75 }}>
          <div className="flex items-center gap-4">
            <div
              className="card__plate"
              style={{ animation: "pulse-soft 1.4s ease-in-out infinite", animationDelay: `${i * 0.18}s` }}
            />
            <div className="flex-1">
              <div className="h-5 w-2/5 rounded-full" style={{ background: "var(--sand)" }} />
              <div className="mt-3 h-3.5 w-full rounded-full" style={{ background: "var(--sand)" }} />
              <div className="mt-2 h-3.5 w-3/5 rounded-full" style={{ background: "var(--sand)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 카드 귀퉁이에 흩뿌리는 부스러기 */
function Crumbs({ className }: { className: string }) {
  return (
    <svg className={`crumbs ${className}`} width="64" height="40" viewBox="0 0 64 40" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="8" cy="12" r="2.4" />
        <circle cx="22" cy="6" r="1.5" />
        <circle cx="18" cy="24" r="1.9" />
        <circle cx="36" cy="16" r="1.2" />
        <circle cx="46" cy="28" r="2.1" />
        <circle cx="56" cy="10" r="1.4" />
      </g>
    </svg>
  );
}

export default function ResultCards({
  result,
  lang,
  onRetry,
}: {
  result: RecommendResult;
  lang: Lang;
  onRetry: () => void;
}) {
  const t = COPY[lang];

  return (
    <div className="flex flex-col gap-5">
      <div className="rise relative text-center">
        <p className="display" style={{ fontSize: "1.45rem" }}>
          {result.headline}
        </p>
        <p className="hand mt-1" style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>
          {t.resultSub}
        </p>
      </div>

      {result.menus.map((m, i) => (
        <article
          key={`${m.name}-${i}`}
          className="rise torn card"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <Crumbs className="-right-2 -top-1" />

          <header className="flex items-center gap-4">
            <span className="card__plate" aria-hidden="true">
              {m.emoji}
            </span>
            <h2 className="card__name flex-1">{m.name}</h2>
            <span className="price">{m.priceHint}</span>
          </header>

          <p className="mt-4 leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {m.reason}
          </p>

          <div
            className="my-4 h-px w-full"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--hairline) 0 6px, transparent 6px 12px)",
            }}
            aria-hidden="true"
          />

          <dl className="flex flex-wrap gap-2">
            <div className="pair">
              <dt>{t.side}</dt>
              <dd>{m.side}</dd>
            </div>
            <div className="pair">
              <dt>{t.drink}</dt>
              <dd>{m.drink}</dd>
            </div>
            {m.alcohol ? (
              <div className="pair pair--booze">
                <dt>{t.pairing}</dt>
                <dd>{m.alcohol}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      ))}

      <button
        type="button"
        onClick={onRetry}
        className="chip justify-center"
        style={{ padding: "1.05rem", fontSize: "1rem" }}
      >
        <span className="chip__emoji" aria-hidden="true">
          ↺
        </span>
        {t.retry}
      </button>
    </div>
  );
}
