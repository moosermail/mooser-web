export const metadata = {
  title: "Cron Jobs | Moosermail Docs",
  description: "Schedule recurring email sends with Moosermail cron jobs.",
};

const CRON_EXAMPLES = [
  ["* * * * *",    "Every minute"],
  ["0 * * * *",    "Every hour on the hour"],
  ["*/5 * * * *",  "Every 5 minutes"],
  ["0 9 * * *",    "Daily at 9:00 AM"],
  ["0 9 * * 1",    "Every Monday at 9 AM"],
  ["0 9 * * 1-5",  "Weekdays at 9 AM"],
  ["0 9 1 * *",    "1st of each month at 9 AM"],
  ["0 0 * * *",    "Midnight daily"],
  ["0 12 * * 3",   "Wednesdays at noon"],
  ["0 9,17 * * *", "9 AM and 5 PM daily"],
];

export default function CronPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", marginBottom: ".5rem" }}>CRON JOBS</h1>
      <p style={{ color: "var(--grey)", fontSize: ".9rem", lineHeight: 1.8, marginBottom: "2rem" }}>
        Schedule recurring email sends. Pick a template, set recipients, define a cron expression, and
        Moosermail sends automatically. The worker checks every 30 seconds.
      </p>

      <Endpoint method="GET" path="/api/cron" />
      <P>List all cron jobs with template names, next run time, and last run time.</P>

      <Endpoint method="POST" path="/api/cron" />
      <P>Create a cron job.</P>
      <Pre>{`{
  "name": "Weekly digest",
  "template_id": "template-uuid",
  "to_addresses": ["team@company.com", "boss@company.com"],
  "variables": {"week": "12", "year": "2026"},
  "cron_expression": "0 9 * * 1",
  "timezone": "US/Eastern"
}`}</Pre>

      <Endpoint method="PUT" path="/api/cron/:id" />
      <P>Update any fields. Toggle <code>enabled</code> to pause a job without deleting it.</P>

      <Endpoint method="DELETE" path="/api/cron/:id" />
      <P>Delete a cron job permanently.</P>

      <H2>CRON EXPRESSIONS</H2>
      <P>Standard 5-field format: <code>minute hour day-of-month month day-of-week</code></P>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: ".4rem 1rem", fontSize: ".82rem", marginBottom: "1.5rem" }}>
        {CRON_EXAMPLES.map(([expr, desc]) => (
          <div key={expr} style={{ display: "contents" }}>
            <code style={{ background: "var(--mid)", padding: ".25rem .5rem", borderRadius: 4, color: "var(--fg)", whiteSpace: "nowrap" }}>{expr}</code>
            <span style={{ color: "var(--grey)", alignSelf: "center" }}>{desc}</span>
          </div>
        ))}
      </div>

      <H2>TIMEZONES</H2>
      <P>
        Supported: UTC, US/Eastern, US/Central, US/Mountain, US/Pacific, Europe/London, Europe/Paris,
        Europe/Berlin, Asia/Tokyo, Asia/Shanghai, Australia/Sydney. Defaults to UTC if not specified.
      </P>

      <H2>HOW IT WORKS</H2>
      <ul style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 2, paddingLeft: "1.25rem" }}>
        <li>Worker process checks the database every 30 seconds</li>
        <li>When <code>next_run_at</code> is in the past, the job fires</li>
        <li>Each address in <code>to_addresses</code> gets an individual email</li>
        <li>Template variables are substituted at send time -- set dynamic values via the API before each run if needed</li>
        <li>After sending, <code>next_run_at</code> is recalculated from the cron expression and timezone</li>
        <li>All sends are logged in the send log with the cron job name</li>
        <li>Disable a job to pause it. Re-enable to resume. The next run calculates forward from re-enable time.</li>
      </ul>
    </div>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = { GET: "#3b82f6", POST: "#ef4444", PUT: "#f59e0b", DELETE: "#e11d48" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".75rem", marginTop: "1.5rem" }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: ".75rem", letterSpacing: ".1em", padding: ".25rem .6rem", borderRadius: 4, background: colors[method] || "#888", color: "#fff" }}>{method}</span>
      <code style={{ fontSize: ".9rem", color: "var(--fg)" }}>{path}</code>
    </div>
  );
}
function Pre({ children }: { children: string }) {
  return <pre style={{ background: "var(--mid)", padding: "1rem", borderRadius: 8, fontSize: ".78rem", lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: ".75rem" }}>{children}</pre>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--grey)", fontSize: ".85rem", lineHeight: 1.7, marginBottom: ".75rem" }}>{children}</p>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", marginBottom: "1rem", marginTop: "2rem" }}>{children}</h2>;
}
