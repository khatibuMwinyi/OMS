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

        <RouteToast
          status={resolvedSearchParams.status}
          error={resolvedSearchParams.error}
        />

        <section className="module-grid module-grid--single">
          <section className="section-card form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Add user</span>
                <h2 className="section-title">Create login account</h2>
              </div>
            </div>

            <form
              action={createUserAction}
              className="form-grid form-grid--wide"
            >
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
              <div className="button-row lg:col-span-2">
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

            <div className="record-table-wrapper">
              <table className="record-table">
                <thead>
                  <tr className="border-b border-border/70">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Username
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Role
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/60 last:border-b-0 hover:bg-slate-50/80"
                    >
                      <td
                        data-label="Username"
                        className="px-4 py-4 align-top text-sm font-semibold text-slate-950"
                      >
                        {user.username}
                      </td>
                      <td
                        data-label="Role"
                        className="px-4 py-4 align-top text-sm text-slate-700"
                      >
                        {user.role}
                      </td>
                      <td
                        data-label="Created"
                        className="px-4 py-4 align-top text-right text-sm text-slate-700"
                      >
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {!users.length ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-sm text-slate-500"
                        colSpan={3}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
