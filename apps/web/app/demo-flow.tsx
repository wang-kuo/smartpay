"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  demoDecisionFlowResponseSchema,
  type DemoDecisionFlowResponse,
  type DemoDecisionFlowVariant
} from "@smartpay/contracts";

type FlowStatus = "idle" | "loading" | "ready" | "error";

const variants: Array<{
  value: DemoDecisionFlowVariant;
  label: string;
  tone: "allow" | "ask" | "deny" | "neutral";
}> = [
  { value: "allow", label: "Allow", tone: "allow" },
  { value: "ask", label: "Ask", tone: "ask" },
  { value: "deny", label: "Deny", tone: "deny" },
  { value: "missing_fit_check", label: "Missing AI", tone: "neutral" }
];

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

function createTraceId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `trace_${Date.now()}`;
}

export function DemoFlow({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [selectedVariant, setSelectedVariant] = useState<DemoDecisionFlowVariant>("allow");
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [result, setResult] = useState<DemoDecisionFlowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDecision = useCallback(
    async (variant: DemoDecisionFlowVariant) => {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/demo/japan-trip/decision-flow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Trace-Id": createTraceId()
          },
          body: JSON.stringify({ variant })
        });
        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          throw new Error("Decision flow request failed.");
        }

        setResult(demoDecisionFlowResponseSchema.parse(payload));
        setStatus("ready");
      } catch (requestError) {
        setStatus("error");
        setError(requestError instanceof Error ? requestError.message : "Decision flow failed.");
      }
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    void runDecision("allow");
  }, [runDecision]);

  const decisionTone = result?.decision.decision ?? "neutral";
  const officialQuote = result?.quotes.officialQuote;
  const marketIntelligence = result?.quotes.marketIntelligence;
  const latestEvents = useMemo(() => result?.events.slice(-5) ?? [], [result]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SmartPay decision agent</p>
          <h1>Japan Trip Decision Flow</h1>
        </div>
        <div className="api-panel">
          <span>API</span>
          <code>{apiBaseUrl}</code>
        </div>
      </header>

      <section className="control-band" aria-label="Decision controls">
        <div className="variant-group" role="group" aria-label="Decision variant">
          {variants.map((variant) => (
            <button
              aria-pressed={selectedVariant === variant.value}
              className={`variant-button ${variant.tone}`}
              disabled={status === "loading"}
              key={variant.value}
              onClick={() => {
                setSelectedVariant(variant.value);
                void runDecision(variant.value);
              }}
              type="button"
            >
              {variant.label}
            </button>
          ))}
        </div>
        <button
          className="run-button"
          disabled={status === "loading"}
          onClick={() => void runDecision(selectedVariant)}
          type="button"
        >
          {status === "loading" ? "Running" : "Run decision"}
        </button>
      </section>

      {error ? <p className="error-banner" role="alert">{error}</p> : null}

      <section className={`decision-band ${decisionTone}`} aria-label="Decision result">
        <div>
          <span>Decision</span>
          <strong data-testid="decision-badge">{result?.decision.decision ?? "pending"}</strong>
        </div>
        <div>
          <span>Next action</span>
          <strong>{result?.decision.nextAction ?? "pending"}</strong>
        </div>
        <div>
          <span>Trace</span>
          <code>{result?.traceId ?? "pending"}</code>
        </div>
      </section>

      <section className="workspace" aria-label="Decision workspace">
        <article className="panel profile-panel">
          <div className="panel-heading">
            <span>Profile</span>
            <strong>{result?.profile.avatarState.mood ?? "pending"}</strong>
          </div>
          <p>{result?.profile.avatarState.message ?? "Awaiting decision flow."}</p>
          <div className="tag-row">
            {result?.profile.profileTags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <span>Authorization</span>
            <strong>{result?.authorization.authorizationId ?? "pending"}</strong>
          </div>
          <dl className="metric-list">
            <div>
              <dt>Category</dt>
              <dd>{result?.authorization.category ?? "pending"}</dd>
            </div>
            <div>
              <dt>Auto limit</dt>
              <dd>
                {result
                  ? formatMoney(
                      result.authorization.autoExecutionMaxAmount,
                      result.authorization.currency
                    )
                  : "pending"}
              </dd>
            </div>
            <div>
              <dt>Frequency</dt>
              <dd>
                {result
                  ? `${result.authorization.executionFrequency.usedCount}/${result.authorization.executionFrequency.maxCount}`
                  : "pending"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <span>Official quote</span>
            <strong>{officialQuote?.merchantName ?? "pending"}</strong>
          </div>
          <p className="money-line">
            {officialQuote ? formatMoney(officialQuote.amount, officialQuote.currency) : "pending"}
          </p>
          <p className="muted-line">{officialQuote?.quoteId ?? "pending"}</p>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <span>Market signal</span>
            <strong>{marketIntelligence?.signal ?? "pending"}</strong>
          </div>
          <dl className="metric-list">
            <div>
              <dt>Average</dt>
              <dd>
                {marketIntelligence && officialQuote
                  ? formatMoney(marketIntelligence.marketAverage, officialQuote.currency)
                  : "pending"}
              </dd>
            </div>
            <div>
              <dt>Range</dt>
              <dd>
                {marketIntelligence && officialQuote
                  ? `${formatMoney(
                      marketIntelligence.priceRange.low,
                      officialQuote.currency
                    )} - ${formatMoney(marketIntelligence.priceRange.high, officialQuote.currency)}`
                  : "pending"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="panel wide">
          <div className="panel-heading">
            <span>Fit check</span>
            <strong>{result?.fitCheck.fitCheck ?? "pending"}</strong>
          </div>
          <p>{result?.fitCheck.explanation ?? "Awaiting structured fit check."}</p>
          <div className="tag-row">
            {result?.fitCheck.softRisks.map((risk) => <span key={risk}>{risk}</span>)}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <span>Execution</span>
            <strong>{result?.execution.orderStatus ?? "pending"}</strong>
          </div>
          <dl className="metric-list">
            <div>
              <dt>Payment</dt>
              <dd>{result?.execution.paymentStatus ?? "pending"}</dd>
            </div>
            <div>
              <dt>Order</dt>
              <dd>{result?.execution.merchantOrderId ?? "none"}</dd>
            </div>
          </dl>
        </article>

        <article className="panel wide">
          <div className="panel-heading">
            <span>Event trace</span>
            <strong>{result?.events.length ?? 0}</strong>
          </div>
          <ol className="event-list">
            {latestEvents.map((event) => (
              <li key={event.eventId}>
                <span>{event.type}</span>
                <code>{event.eventId}</code>
              </li>
            ))}
          </ol>
        </article>

        {result?.debug ? (
          <article className="panel wide debug-panel">
            <div className="panel-heading">
              <span>Debug rules</span>
              <strong>{result.debug.hardRulesPassed ? "passed" : "failed"}</strong>
            </div>
            <ol className="rule-list">
              {result.debug.ruleEvaluation.checks.map((check) => (
                <li className={check.passed ? "pass" : "fail"} key={check.code}>
                  <span>{check.code}</span>
                  <p>{check.message}</p>
                </li>
              ))}
            </ol>
          </article>
        ) : null}
      </section>
    </main>
  );
}
