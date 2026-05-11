import { redirect } from "next/navigation";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { RouteToast } from "@/components/route-toast";
import { getCurrentSession } from "@/lib/session-server";
import {
  listProjectSequences,
  listProjectsBySequence,
  listProjectRevenues,
  listProjectCosts,
  listOfficeExpensesBySequence,
  listOfficeExpenseItems,
  calculateProjectReport,
  computeAnnualOfficeBurden,
  ensureProjectTables,
  type LandProject,
  type ProjectFinancialReport,
} from "@/lib/projects";
import { LandProjectForms } from "@/components/projects/LandProjectForms";
import { OfficeItemsPanel } from "@/components/projects/OfficeItemsPanel";
import { completeProjectAction } from "@/app/actions/projects";
import { OfficeExpensePanel } from "@/components/projects/OfficeExpensePanel";

type Props = {
  searchParams: Promise<{
    seq?: string;
    project?: string;
    tab?: string;
    status?: string;
    error?: string;
    create?: string;
  }>;
};

function fmt(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000,
  );
}

export default async function LandProjectPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/");
  if (session.role !== "director" && session.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  await ensureProjectTables();

  const sequences = await listProjectSequences();
  const activeSeqId = params.seq
    ? Number(params.seq)
    : (sequences[0]?.id ?? null);
  const activeSeq = sequences.find((s) => s.id === activeSeqId) ?? null;
  const projects = activeSeqId ? await listProjectsBySequence(activeSeqId) : [];

  const selectedProjectId = params.project ? Number(params.project) : null;
  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;

  // Sequence-level office expenses + master items list
  const seqOfficeExpenses = activeSeqId
    ? await listOfficeExpensesBySequence(activeSeqId)
    : [];
  const officeItems = await listOfficeExpenseItems();
  const seqOfficeTotal = seqOfficeExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const N = activeSeq ? Math.max(1, Number(activeSeq.totalProjects)) : 4;

  // Build financial reports for all projects in sequence
  const reports: ProjectFinancialReport[] = [];
  for (const proj of projects) {
    const [revs, costs] = await Promise.all([
      listProjectRevenues(proj.id),
      listProjectCosts(proj.id),
    ]);
    // Active projects: use sequence-level office expenses; completed projects use snapshot.
    const officeForCalc =
      proj.status === "completed" ? [] : [{ amount: seqOfficeTotal }];
    reports.push(
      calculateProjectReport(proj, revs, costs, officeForCalc, {
        sequenceTotalProjects: N,
      }),
    );
  }

  const totalLandCost = projects.reduce((s, p) => s + Number(p.landCost), 0);
  const totalOfficeAlloc = reports.reduce((s, r) => s + r.officeAllocation, 0);
  const latestReport = reports.find((r) => r.projectId === selectedProject?.id);
  const runningCapital = activeSeq ? Number(activeSeq.currentCapital) : 0;

  // Annual office burden (sum monthly × 12 + sum yearly) and per-project share
  const burden = computeAnnualOfficeBurden(officeItems);
  const annualPerProjectShare = burden.annual / N;

  const tab = params.tab ?? "overview";
  const showCreate = params.create === "1";

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/projects/land" />

      <div className="dashboard-content">
        {/* ── Page hero ── */}
        <section className="page-hero">
          <div>
            <span className="eyebrow">Projects</span>
            <h1 className="page-title">Land Projects</h1>
            <p className="subtle-copy">
              4-cycle capital growth sequences · 3-month project duration
            </p>
          </div>
          <Link
            href="/projects/land?create=1"
            className="button-primary"
          >
            + New Sequence
          </Link>
        </section>

        {/* ── Flash messages ── */}
        <RouteToast status={params.status} error={params.error} />

        {/* ── Create sequence form ── */}
        {showCreate && (
          <section className="section-card form-card" style={{ marginBottom: 18 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">New sequence</span>
                <h2 className="section-title">Create Land Project Sequence</h2>
              </div>
              <Link href="/projects/land" className="button-ghost">
                Cancel
              </Link>
            </div>
            <LandProjectForms mode="create-sequence" />
          </section>
        )}

        {/* ── Stat cards ── */}
        <section className="summary-grid">
          <div className="stat-card section-card">
            <p className="stat-label">Land Cost (total)</p>
            <p className="stat-value">TZS {fmt(totalLandCost)}</p>
            <p className="stat-detail">across all projects</p>
          </div>
          <div className="stat-card section-card">
            <p className="stat-label">Office Allocation</p>
            <p className="stat-value">TZS {fmt(totalOfficeAlloc)}</p>
            <p className="stat-detail">
              {((1 / N) * 100).toFixed(0)}% × recorded office expenses (1/{N})
            </p>
          </div>
          <div className="stat-card section-card">
            <p className="stat-label">Net Profit</p>
            <p className="stat-value">
              {latestReport ? `TZS ${fmt(Math.max(0, latestReport.netProfit))}` : "—"}
            </p>
            <p className="stat-detail">selected project</p>
          </div>
          <div className="stat-card section-card">
            <p className="stat-label">Running Capital</p>
            <p className="stat-value">TZS {fmt(runningCapital)}</p>
            <p className="stat-detail">
              {activeSeq
                ? `${activeSeq.completedProjects} of ${activeSeq.totalProjects} complete`
                : "no active sequence"}
            </p>
          </div>
        </section>

        {/* ── Annual office burden card row ── */}
        <section className="summary-grid" style={{ marginTop: 12 }}>
          <div className="stat-card section-card">
            <p className="stat-label">Annual Office Burden</p>
            <p className="stat-value">TZS {fmt(burden.annual)}</p>
            <p className="stat-detail">
              monthly × 12 (TZS {fmt(burden.monthlySum * 12)}) + yearly (TZS{" "}
              {fmt(burden.yearlySum)})
            </p>
          </div>
          <div className="stat-card section-card">
            <p className="stat-label">Per Project Annual Share</p>
            <p className="stat-value">TZS {fmt(annualPerProjectShare)}</p>
            <p className="stat-detail">
              1/{N} = {((1 / N) * 100).toFixed(0)}% of annual burden
            </p>
          </div>
          <div className="stat-card section-card">
            <p className="stat-label">Monthly items</p>
            <p className="stat-value">TZS {fmt(burden.monthlySum)}/mo</p>
            <p className="stat-detail">{officeItems.filter((i) => i.recurrence === "monthly").length} items</p>
          </div>
          <div className="stat-card section-card">
            <p className="stat-label">Yearly items</p>
            <p className="stat-value">TZS {fmt(burden.yearlySum)}/yr</p>
            <p className="stat-detail">{officeItems.filter((i) => i.recurrence === "yearly").length} items</p>
          </div>
        </section>

        {/* ── Sequence tabs ── */}
        {sequences.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              margin: "18px 0 -1px",
              paddingBottom: 1,
            }}
          >
            {sequences.map((seq) => (
              <Link
                key={seq.id}
                href={`/projects/land?seq=${seq.id}&tab=${tab}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: "12px 12px 0 0",
                  fontSize: "0.84rem",
                  fontWeight: seq.id === activeSeqId ? 600 : 400,
                  background:
                    seq.id === activeSeqId
                      ? "rgba(212,162,63,0.12)"
                      : "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(148,163,184,0.14)",
                  borderBottom:
                    seq.id === activeSeqId
                      ? "1px solid transparent"
                      : "1px solid rgba(148,163,184,0.14)",
                  color: seq.id === activeSeqId ? "#f4d48d" : "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {seq.name}
                <span style={{ marginLeft: 6, opacity: 0.5, fontSize: "0.78rem" }}>
                  {seq.completedProjects}/{seq.totalProjects}
                </span>
              </Link>
            ))}
          </div>
        )}

        {sequences.length === 0 && !showCreate && (
          <div className="section-card" style={{ marginTop: 18 }}>
            <div className="empty-state">
              No sequences yet.{" "}
              <Link href="/projects/land?create=1" className="text-primary hover:underline">
                Create your first land project sequence
              </Link>
              .
            </div>
          </div>
        )}

        {activeSeq && (
          <section className="section-card" style={{ marginTop: 0, borderRadius: "0 12px 12px 12px" }}>
            {/* ── Inner tabs ── */}
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: 18,
                borderBottom: "1px solid rgba(148,163,184,0.14)",
                paddingBottom: 12,
              }}
            >
              {(
                [
                  { key: "overview", label: "Overview" },
                  { key: "flow", label: "Financial Flow" },
                  { key: "report", label: "Full Report" },
                  { key: "entries", label: "Add Entry" },
                  { key: "office", label: "Office Expenses" },
                  { key: "office-items", label: "Office Items" },
                  { key: "add-project", label: "+ Next Project" },
                ] as const
              ).map(({ key, label }) => (
                <Link
                  key={key}
                  href={`/projects/land?seq=${activeSeqId}${selectedProject ? `&project=${selectedProject.id}` : ""}&tab=${key}`}
                  className={`pill${tab === key ? " pill--gold" : ""}`}
                  style={{ fontSize: "0.82rem" }}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* ── TAB: Overview ── */}
            {tab === "overview" && (
              <div>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Sequence</span>
                    <h2 className="section-title">{activeSeq.name}</h2>
                  </div>
                </div>

                {projects.length === 0 ? (
                  <div className="empty-state">No projects in this sequence yet.</div>
                ) : (
                  <div className="recent-list">
                    {projects.map((proj) => {
                      const report = reports.find((r) => r.projectId === proj.id);
                      const today = new Date().toISOString().slice(0, 10);
                      const total = daysBetween(proj.startsAt, proj.endsAt);
                      const elapsed = daysBetween(proj.startsAt, today);
                      const daysLeft = Math.max(0, daysBetween(today, proj.endsAt));
                      const pct = proj.status === "completed"
                        ? 100
                        : Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
                      const isSelected = selectedProject?.id === proj.id;

                      return (
                        <div
                          key={proj.id}
                          className="recent-item"
                          style={{
                            display: "block",
                            borderColor: isSelected
                              ? "rgba(212,162,63,0.4)"
                              : undefined,
                            background: isSelected
                              ? "rgba(212,162,63,0.06)"
                              : undefined,
                          }}
                        >
                          <Link
                            href={`/projects/land?seq=${activeSeqId}&project=${proj.id}&tab=flow`}
                            style={{ display: "block" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: 8,
                              }}
                            >
                              <div>
                                <strong style={{ display: "block" }}>
                                  P{proj.projectNumber} · {proj.name}
                                </strong>
                                <span>
                                  {new Date(proj.startsAt).toLocaleDateString(
                                    "en-GB",
                                    { day: "numeric", month: "short", year: "numeric" },
                                  )}{" "}
                                  →{" "}
                                  {new Date(proj.endsAt).toLocaleDateString(
                                    "en-GB",
                                    { day: "numeric", month: "short", year: "numeric" },
                                  )}
                                </span>
                              </div>
                              <StatusBadge status={proj.status} daysLeft={daysLeft} />
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 12,
                                marginBottom: 10,
                              }}
                            >
                              <MetaItem label="Land cost" value={`TZS ${fmt(Number(proj.landCost))}`} />
                                <MetaItem
                                 label="Net profit"
                                 value={report ? `TZS ${fmt(Math.max(0, report.netProfit))}` : "—"}
                               />
                              <MetaItem
                                label="Capital after"
                                value={report ? `TZS ${fmt(report.runningCapitalAfter)}` : "—"}
                              />
                            </div>

                            {/* Progress bar */}
                            <div
                              style={{
                                height: 3,
                                background: "rgba(148,163,184,0.14)",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background:
                                    proj.status === "completed"
                                      ? "rgba(88,199,173,0.8)"
                                      : "rgba(212,162,63,0.8)",
                                  borderRadius: 2,
                                  transition: "width 0.4s",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 4,
                                fontSize: "0.76rem",
                                color: "var(--muted)",
                              }}
                            >
                              <span>
                                {proj.status === "completed" ? "Completed" : `${pct}% elapsed`}
                              </span>
                              {proj.status === "active" && (
                                <span>{daysLeft} days remaining</span>
                              )}
                            </div>
                          </Link>

                          {/* Action buttons - outside Link */}
                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <a
                              href={`/api/export/land-project/${proj.id}`}
                              className="button-ghost"
                              target="_blank"
                              rel="noopener"
                            >
                              ↓ Download Report
                            </a>
                            {proj.status === "active" && (
                              <form action={completeProjectAction}>
                                <input type="hidden" name="project_id" value={proj.id} />
                                <button type="submit" className="button-secondary">
                                  Mark as Complete
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Financial Flow ── */}
            {tab === "flow" && (
              <div>
                {!selectedProject ? (
                  <div className="empty-state">
                    Select a project from the Overview tab to view its financial flow.
                  </div>
                ) : (
                  <FinancialFlowView
                    report={reports.find((r) => r.projectId === selectedProject.id)!}
                    project={selectedProject}
                  />
                )}
              </div>
            )}

            {/* ── TAB: Full Report ── */}
            {tab === "report" && (
              <div>
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Analytics</span>
                    <h2 className="section-title">4-Project Sequence Report</h2>
                  </div>
                </div>
                <div className="record-table-wrapper">
                  <table className="record-table">
                    <thead>
                      <tr>
                        {[
                          "Project",
                          "Revenue",
                          "Land + PC",
                          "Gross Profit",
                          "Office Alloc",
                          "Net Profit",
                          "Tithe",
                          "Debt Payment",
                          "Retained",
                          "New Capital",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((proj) => {
                        const r = reports.find((x) => x.projectId === proj.id);
                        return (
                          <tr key={proj.id}>
                            <td>
                              P{proj.projectNumber} · {proj.name}
                            </td>
                            <td>{r ? fmt(r.totalRevenue) : "—"}</td>
                            <td>{r ? fmt(r.landCost + r.projectCosts) : "—"}</td>
                            <td>{r ? fmt(r.grossProfit) : "—"}</td>
                            <td>{r ? fmt(r.officeAllocation) : "—"}</td>
                             <td>{r ? fmt(Math.max(0, r.netProfit)) : "—"}</td>
                            <td>{r ? fmt(r.tithe) : "—"}</td>
                            <td>{r ? fmt(r.debtPayment) : "—"}</td>
                            <td>{r ? fmt(r.retainedEarnings) : "—"}</td>
                            <td>{r ? fmt(r.runningCapitalAfter) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB: Add Entry ── */}
            {tab === "entries" && (
              <div>
                {!selectedProject ? (
                  <div className="empty-state">
                    Select a project from Overview first.
                  </div>
                ) : (
                  <LandProjectForms
                    mode="entries"
                    project={selectedProject}
                    seqId={activeSeqId!}
                  />
                )}
              </div>
            )}

            {/* ── TAB: Office Expenses (sequence-level) ── */}
            {tab === "office" && activeSeqId && (
              <OfficeExpensePanel
                sequenceId={activeSeqId}
                sequenceTotalProjects={N}
                items={officeItems}
                entries={seqOfficeExpenses}
                canDelete={session.role === "admin" || session.role === "director"}
              />
            )}

            {/* ── TAB: Office Items (master items) ── */}
            {tab === "office-items" && (
              <OfficeItemsPanel
                items={officeItems}
                canEdit={session.role === "admin" || session.role === "director"}
              />
            )}

            {/* ── TAB: Add Next Project ── */}
            {tab === "add-project" && (
              <div>
                {projects.length >= 4 ? (
                  <div className="empty-state">
                    This sequence already has 4 projects (maximum).
                  </div>
                ) : (
                  <LandProjectForms
                    mode="add-project"
                    seqId={activeSeqId!}
                    nextNumber={(projects.length) + 1}
                  />
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

// ── Financial Flow ─────────────────────────────────────────────────────────────

function FinancialFlowView({
  report,
  project,
}: {
  report: ProjectFinancialReport | undefined;
  project: LandProject;
}) {
  if (!report) {
    return (
      <div className="empty-state">
        No financial data yet. Add revenue and costs in the Add Entry tab.
      </div>
    );
  }

  const rows = [
    { step: "1", label: "Revenue", formula: "R = total sales", amount: report.totalRevenue, positive: true },
    {
      step: "2",
      label: "Land Cost + Project Costs",
      formula: `L (${fmt(report.landCost)}) + PC (${fmt(report.projectCosts)})`,
      amount: -(report.landCost + report.projectCosts),
      positive: false,
    },
    { step: "=", label: "Gross Profit", formula: "R − (L + PC)", amount: report.grossProfit, positive: true, subtotal: true },
    {
      step: "3",
      label: "Office Allocation (25%)",
      formula: `0.25 × OE (${fmt(report.officeExpenses)})`,
      amount: -report.officeAllocation,
      positive: false,
    },
    { step: "=", label: "Net Profit", formula: "Gross Profit − Office Allocation", amount: Math.max(0, report.netProfit), positive: true, subtotal: true },
    { step: "5", label: "Tithe (10%)", formula: "0.10 × Net Profit", amount: -report.tithe, positive: false },
    {
      step: "6",
      label: "Debt Payment (20%)",
      formula: "0.20 × (Net Profit − Tithe)",
      amount: -report.debtPayment,
      positive: false,
    },
    {
      step: "=",
      label: "Retained Earnings",
      formula: "Net Profit − Tithe − Debt",
      amount: report.retainedEarnings,
      positive: true,
      result: true,
    },
    {
      step: "8",
      label: "New Running Capital",
      formula: `Old Capital (${fmt(report.runningCapitalBefore)}) + Retained`,
      amount: report.runningCapitalAfter,
      positive: true,
      capital: true,
    },
  ];

  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">P{report.projectNumber} · {report.projectName}</span>
          <h2 className="section-title">Financial Flow</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`/api/export/land-project/${project.id}`}
            className="button-ghost"
            target="_blank"
            rel="noopener"
          >
            ↓ Download Report
          </a>
          {project.status === "active" && (
            <form action={completeProjectAction}>
              <input type="hidden" name="project_id" value={project.id} />
              <button type="submit" className="button-secondary">
                Mark Complete
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="approval-row" style={{ display: "grid", gap: 0, padding: 0 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "11px 16px",
              borderBottom:
                i < rows.length - 1 ? "1px solid rgba(148,163,184,0.10)" : "none",
              background: row.capital
                ? "rgba(212,162,63,0.07)"
                : row.result
                ? "rgba(88,199,173,0.06)"
                : row.subtotal
                ? "rgba(255,255,255,0.03)"
                : "transparent",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.72rem",
                fontWeight: 600,
                flexShrink: 0,
                background: row.subtotal || row.result || row.capital
                  ? "rgba(212,162,63,0.18)"
                  : "rgba(148,163,184,0.12)",
                color: row.subtotal || row.result || row.capital
                  ? "#f4d48d"
                  : "var(--muted)",
              }}
            >
              {row.step}
            </span>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "0.88rem",
                  fontWeight: row.subtotal || row.result || row.capital ? 600 : 400,
                  color: row.subtotal || row.result || row.capital
                    ? "#e8d8a0"
                    : "var(--foreground)",
                  margin: 0,
                }}
              >
                {row.label}
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  fontFamily: "monospace",
                  margin: "2px 0 0",
                }}
              >
                {row.formula}
              </p>
            </div>
            <p
              className="recent-amount"
              style={{
                color: row.capital
                  ? "#f4d48d"
                  : row.positive
                  ? "#9be2d1"
                  : "#f87171",
                fontSize: row.subtotal || row.result || row.capital ? "1rem" : "0.88rem",
              }}
            >
              {row.amount < 0 ? "−" : row.positive && row.step !== "=" ? "+ " : ""}
              TZS {fmt(Math.abs(row.amount))}
            </p>
          </div>
        ))}
      </div>

      {project.projectNumber < 4 && project.status === "completed" && (
        <div className="banner banner--success" style={{ marginTop: 14 }}>
          ↻ Retained earnings carry forward as running capital for Project{" "}
          {project.projectNumber + 1}.
        </div>
      )}
      {project.projectNumber === 4 && project.status === "completed" && (
        <div className="banner banner--success" style={{ marginTop: 14 }}>
          ✦ Full 4-project sequence complete — final capital: TZS{" "}
          {fmt(report.runningCapitalAfter)}
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  daysLeft,
}: {
  status: string;
  daysLeft: number;
}) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: {
      bg: "rgba(88,199,173,0.12)",
      color: "#9be2d1",
      label: `Active · ${daysLeft}d left`,
    },
    completed: { bg: "rgba(212,162,63,0.12)", color: "#f4d48d", label: "Completed" },
    cancelled: { bg: "rgba(255,123,123,0.12)", color: "#fca5a5", label: "Cancelled" },
  };
  const s = map[status] ?? map.active;
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.76rem",
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: "0.76rem", color: "var(--muted)", display: "block" }}>
        {label}
      </span>
      <strong style={{ fontSize: "0.84rem" }}>{value}</strong>
    </div>
  );
}