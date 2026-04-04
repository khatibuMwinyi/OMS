import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RouteToast } from "@/components/route-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createUserAction } from "@/app/actions/auth";
import { listUsers } from "@/lib/users";
import { getCurrentSession } from "@/lib/session-server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const users = await listUsers();

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/admin/users" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Administration</span>
            <h1 className="page-title">User management</h1>
            <p className="subtle-copy">
              Create new system users and assign secretary or admin access.
            </p>
          </div>
        </section>

        <RouteToast status={resolvedSearchParams.status} error={resolvedSearchParams.error} />

        <section className="module-grid module-grid--single">
          <section className="section-card form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Add user</span>
                <h2 className="section-title">Create login account</h2>
              </div>
            </div>

            <form action={createUserAction} className="form-grid form-grid--wide">
              <label className="space-y-2">
                <span className="field-label">Username</span>
                <Input name="username" autoComplete="off" required />
              </label>
              <label className="space-y-2">
                <span className="field-label">Password</span>
                <Input name="password" type="password" required />
              </label>
              <label className="space-y-2">
                <span className="field-label">Role</span>
                <Select name="role" defaultValue="secretary">
                  <option value="secretary">Secretary</option>
                  <option value="admin">Admin</option>
                </Select>
              </label>
              <div className="button-row md:col-span-2">
                <Button type="submit">Add user</Button>
              </div>
            </form>
          </section>

          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Current users</span>
                <h2 className="section-title">Registered accounts</h2>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border bg-white">
              <div className="grid grid-cols-[1.3fr_0.8fr_0.9fr] gap-4 border-b border-border/70 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>Username</span>
                <span>Role</span>
                <span>Created</span>
              </div>
              <div className="divide-y divide-border/70">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.3fr_0.8fr_0.9fr] gap-4 px-5 py-4 text-sm text-slate-700"
                  >
                    <span className="font-medium text-slate-950">{user.username}</span>
                    <span>{user.role}</span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                ))}
                {!users.length ? (
                  <div className="px-5 py-8 text-sm text-slate-500">No users found.</div>
                ) : null}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}