const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">SmartPay decision agent</p>
          <h1>Japan Trip Decision Flow</h1>
          <p className="lede">
            A small runnable demo for authorization, decision, and mock execution. The API
            contract is shared with future web, mobile, and WeChat clients.
          </p>
        </div>
        <div className="status-panel">
          <span>API</span>
          <code>{apiBaseUrl}</code>
        </div>
      </section>

      <section className="flow-grid" aria-label="Decision flow">
        {[
          "Behavior profile",
          "Japan trip goal",
          "Temporary authorization",
          "Official quote",
          "Market intelligence",
          "AI fit check",
          "allow / ask / deny",
          "Mock execution",
          "Feedback trace"
        ].map((label, index) => (
          <article className="step" key={label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
