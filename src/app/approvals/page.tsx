import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ApprovalPanels } from "@/components/approval-panels";
import {
  listLetters,
  listPettyCash,
  listVouchers,
} from "@/lib/records";
import { getCurrentSession } from "@/lib/session-server";

export default async function ApprovalsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  if (session.role !== "admin" && session.role !== "director") {
    redirect("/dashboard");
  }

  const [allPettyCash, allVouchers, allLetters] = await Promise.all([
    listPettyCash(session, 1000),
    listVouchers(session, 1000),
    listLetters(session, 1000),
  ]);

  const pendingPettyCash = allPettyCash.filter((r) => r.status === "pending");
  const pendingVouchers = allVouchers.filter((r) => r.status === "pending");
  const pendingLetters = allLetters.filter((r) => r.status === "pending");

  const hasPending =
    pendingPettyCash.length > 0 ||
    pendingVouchers.length > 0 ||
    pendingLetters.length > 0;

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/approvals" />

      <div className="dashboard-content">
        <section style={{ marginTop: 12 }}>
          <span className="eyebrow">Approvals</span>
          <h1 className="page-title">Pending approvals</h1>
          <p className="subtle-copy">
            Review and approve petty cash vouchers, payment vouchers, and letters
            submitted for your review.
          </p>
        </section>

        {hasPending ? (
          <ApprovalPanels
            pendingPettyCash={pendingPettyCash}
            pendingVouchers={pendingVouchers}
            pendingLetters={pendingLetters}
          />
        ) : (
          <div className="section-card">
            <div className="empty-state">
              No pending records to approve. All caught up!
            </div>
          </div>
        )}
      </div>
    </main>
  );
}