"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  demoAuthSessionResponseSchema,
  demoDecisionFlowResponseSchema,
  demoInteractiveDecisionResponseSchema,
  type DemoAuthSessionResponse,
  type DemoDecisionFlowResponse,
  type DemoDecisionFlowVariant,
  type DemoInteractiveDecisionResponse
} from "@smartpay/contracts";

type FlowStatus = "idle" | "loading" | "ready" | "error";
type DisplayResult = DemoDecisionFlowResponse | DemoInteractiveDecisionResponse;
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
type DemoFlowMode = "user" | "admin";
type DemoSession = DemoAuthSessionResponse["session"];

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

function hasInteraction(result: DisplayResult | null): result is DemoInteractiveDecisionResponse {
  return Boolean(result && "interaction" in result);
}

export function DemoFlow({
  apiBaseUrl,
  mode = "user"
}: {
  apiBaseUrl: string;
  mode?: DemoFlowMode;
}) {
  const isAdminMode = mode === "admin";
  const storageKey = isAdminMode ? "smartpay.demo.adminSession" : "smartpay.demo.userSession";
  const [emailInput, setEmailInput] = useState(
    isAdminMode ? "admin@smartpay.local" : "demo@example.com"
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [chatInput, setChatInput] = useState(
    "I want to book a 6 day Japan trip under S$2500."
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<DemoDecisionFlowVariant>("allow");
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [result, setResult] = useState<DisplayResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(storageKey);
    if (storedSession) {
      try {
        const parsed = demoAuthSessionResponseSchema.shape.session.safeParse(
          JSON.parse(storedSession) as unknown
        );
        if (parsed.success && parsed.data.role === mode) {
          setEmailInput(parsed.data.email);
          setSession(parsed.data);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
  }, [mode, storageKey]);

  const runFixtureDecision = useCallback(
    async (variant: DemoDecisionFlowVariant) => {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/demo/japan-trip/decision-flow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Trace-Id": createTraceId(),
            ...(session?.adminToken ? { "X-Demo-Admin-Token": session.adminToken } : {})
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
    [apiBaseUrl, session?.adminToken]
  );

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter an email to start the demo session.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/demo/auth/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": createTraceId(),
          ...(session?.adminToken ? { "X-Demo-Admin-Token": session.adminToken } : {})
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: isAdminMode ? passwordInput : undefined
        })
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(isAdminMode ? "Admin login failed." : "Demo login failed.");
      }

      const parsed = demoAuthSessionResponseSchema.parse(payload);
      if (parsed.session.role !== mode) {
        throw new Error(isAdminMode ? "Use the admin account for this page." : "Use a user email for this page.");
      }

      window.localStorage.setItem(storageKey, JSON.stringify(parsed.session));
      setSession(parsed.session);
      setStatus("idle");
    } catch (loginError) {
      setStatus("error");
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    }
  };

  const submitChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      setError("Start with an email session first.");
      return;
    }

    const message = chatInput.trim();
    if (!message) {
      setError("Enter a consumption request to analyze.");
      return;
    }

    setStatus("loading");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: message }]);

    try {
      const response = await fetch(`${apiBaseUrl}/api/demo/japan-trip/interactive-decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": createTraceId(),
          ...(session.adminToken ? { "X-Demo-Admin-Token": session.adminToken } : {})
        },
        body: JSON.stringify({
          email: session.email,
          message,
          conversationHistory: messages.slice(-8)
        })
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error("Interactive decision request failed.");
      }

      const parsed = demoInteractiveDecisionResponseSchema.parse(payload);
      setResult(parsed);
      setStatus("ready");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${parsed.interaction.summary} Final decision: ${parsed.decision.decision}.`
        }
      ]);
    } catch (requestError) {
      setStatus("error");
      setError(
        requestError instanceof Error ? requestError.message : "Interactive decision failed."
      );
    }
  };

  const logout = () => {
    window.localStorage.removeItem(storageKey);
    setSession(null);
    setMessages([]);
    setResult(null);
    setStatus("idle");
  };

  const decisionTone = result?.decision.decision ?? "neutral";
  const officialQuote = result?.quotes.officialQuote;
  const marketIntelligence = result?.quotes.marketIntelligence;
  const latestEvents = useMemo(() => result?.events.slice(-5) ?? [], [result]);
  const interactiveResult = hasInteraction(result) ? result : null;

  if (!session) {
    return (
      <main className="shell">
        <section className="login-layout" aria-label="Demo login">
          <div className="login-copy">
            <p className="eyebrow">SmartPay decision agent</p>
            <h1>Japan Trip Decision Flow</h1>
            <p>
              {isAdminMode
                ? "Sign in with the demo admin account to inspect backend analysis, debug rules, and traces."
                : "Start a mock email session, describe the trip purchase, and SmartPay will return a final allow, ask, or deny decision."}
            </p>
          </div>
          <form className="login-form" onSubmit={submitLogin}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="demo@example.com"
              type="email"
              value={emailInput}
            />
            {isAdminMode ? (
              <>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="Stored in secrets/admin.env"
                  type="password"
                  value={passwordInput}
                />
              </>
            ) : null}
            <button className="run-button" type="submit">
              {status === "loading" ? "Signing in" : "Continue"}
            </button>
            <p>
              {isAdminMode
                ? "Admin credentials are local demo secrets; no real identity provider is used."
                : "Demo auth is email-only local state; no real identity provider or payment account is used."}
            </p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SmartPay decision agent</p>
          <h1>Japan Trip Decision Flow</h1>
        </div>
        <div className="api-panel">
          <span>Session</span>
          <code>{session.email}</code>
          <span>API</span>
          <code>{apiBaseUrl}</code>
          <button className="text-button" onClick={logout} type="button">
            Sign out
          </button>
        </div>
      </header>

      <section className={`chat-workbench ${isAdminMode ? "" : "user-only"}`} aria-label="User interaction">
        <div className="chat-panel">
          <div className="panel-heading">
            <span>Conversation</span>
            <strong>Today</strong>
          </div>
          <div className="message-list" aria-live="polite">
            <div className="message assistant">
              <span>SmartPay</span>
              <p>What would you like to do today?</p>
            </div>
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === "user" ? "You" : "SmartPay"}</span>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
          <form className="chat-form" onSubmit={submitChat}>
            <textarea
              aria-label="Consumption request"
              onChange={(event) => setChatInput(event.target.value)}
              rows={3}
              value={chatInput}
            />
            <button className="run-button" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Analyzing" : "Analyze request"}
            </button>
          </form>
        </div>

        {isAdminMode ? (
          <aside className="analysis-panel">
            <div className="panel-heading">
              <span>Structured analysis</span>
              <strong>{interactiveResult?.interaction.llm?.provider ?? "pending"}</strong>
            </div>
            <p>
              {interactiveResult?.interaction.summary ??
                "Submit a request to generate a structured fit check."}
            </p>
            <dl className="metric-list">
              <div>
                <dt>Fit check</dt>
                <dd>
                  {interactiveResult?.interaction.analysis?.fitCheck.fitCheck ?? "pending"}
                </dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{interactiveResult?.interaction.llm?.model ?? "pending"}</dd>
              </div>
              <div>
                <dt>DeepSeek</dt>
                <dd>
                  {interactiveResult?.interaction.llm?.usedDeepSeek ? "configured" : "fallback"}
                </dd>
              </div>
            </dl>
          </aside>
        ) : null}
      </section>

      {isAdminMode ? (
        <section className="control-band compact" aria-label="Decision test fixtures">
          <div className="variant-group" role="group" aria-label="Decision variant">
            {variants.map((variant) => (
              <button
                aria-pressed={selectedVariant === variant.value}
                className={`variant-button ${variant.tone}`}
                disabled={status === "loading"}
                key={variant.value}
                onClick={() => {
                  setSelectedVariant(variant.value);
                  void runFixtureDecision(variant.value);
                }}
                type="button"
              >
                {variant.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}

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

        {isAdminMode ? (
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
        ) : null}

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

        {isAdminMode ? (
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
        ) : null}

        {isAdminMode && result?.debug ? (
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
