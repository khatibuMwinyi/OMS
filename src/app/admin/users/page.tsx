import { redirect } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { RouteToast } from "@/components/route-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createUserAction, updateUserAction, deleteUserAction } from "@/app/actions/auth";
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
    edit?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const users = await listUsers();

  const editId = Number(resolvedSearchParams.edit);
  const isEditing = Number.isFinite(editId) && editId > 0;
  const editUser = isEditing
    ? users.find((u) => u.id === editId) ?? null
    : null;

  if (isEditing && !editUser) {
    redirect("/admin/users?error=User%20not%20found.");
  }

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/admin/users" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Administration</span>
            <h1 className="page-title">User management</h1>
            <p className="subtle-copy">
              Create new system users and assign secretary, director or admin access.
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
                <span className="eyebrow">
                  {isEditing ? "Edit user" : "Add user"}
                </span>
                <h2 className="section-title">
                  {isEditing ? "Update user details" : "Create login account"}
                </h2>
              </div>
            </div>

            {isEditing && editUser ? (
              <form
                action={updateUserAction}
                className="form-grid form-grid--wide"
              >
                <input name="user_id" type="hidden" value={editUser.id} readOnly />
                <label className="space-y-2">
                  <span className="field-label">Username</span>
                  <Input value={editUser.username} readOnly />
                </label>
                <label className="space-y-2">
                  <span className="field-label">Role</span>
                  <Select name="role" defaultValue={editUser.role}>
                    <option value="secretary">Secretary</option>
                    <option value="director">Director</option>
                    <option value="admin">Admin</option>
                  </Select>
                </label>
                <label className="space-y-2 lg:col-span-2">
                  <span className="field-label">Signature image path (optional)</span>
                  <Input
                    name="signature_image_path"
                    defaultValue={editUser.signatureImagePath ?? ""}
                    placeholder="/uploads/signatures/admin-signature.png"
                  />
                </label>
                <div className="button-row lg:col-span-2">
                  <Button type="submit">Update user</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/admin/users";
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
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
                    <option value="director">Director</option>
                    <option value="admin">Admin</option>
                  </Select>
                </label>
                <label className="space-y-2 lg:col-span-2">
                  <span className="field-label">Signature image path (optional)</span>
                  <Input
                    name="signature_image_path"
                    placeholder="/uploads/signatures/admin-signature.png"
                  />
                </label>
                <div className="button-row lg:col-span-2">
                  <Button type="submit">Add user</Button>
                </div>
              </form>
            )}
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
                  <tr className="border-b border-border/85">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Username
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Signature path
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/75 last:border-b-0 hover:bg-white/10"
                    >
                      <td
                        data-label="Username"
                        className="px-4 py-4 align-top text-sm font-semibold text-foreground"
                      >
                        {user.username}
                      </td>
                      <td
                        data-label="Role"
                        className="px-4 py-4 align-top text-sm text-foreground/85"
                      >
                        {user.role}
                      </td>
                      <td
                        data-label="Signature path"
                        className="px-4 py-4 align-top text-sm text-foreground/85"
                      >
                        {user.signatureImagePath || "-"}
                      </td>
                      <td
                        data-label="Created"
                        className="px-4 py-4 align-top text-sm text-foreground/85"
                      >
                        {formatDate(user.createdAt)}
                      </td>
                      <td
                        data-label="Actions"
                        className="px-4 py-4 align-top text-right text-sm"
                      >
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/admin/users?edit=${user.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/95 text-foreground/75 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
                            aria-label="Edit user"
                            title="Edit user"
                          >
                            <Pencil size={14} />
                          </a>
                          <form
                            action={deleteUserAction}
                            style={{ display: "inline" }}
                          >
                            <input name="user_id" type="hidden" value={user.id} readOnly />
                            <ConfirmSubmit
                              message="Delete this user? This action cannot be undone."
                              ariaLabel="Delete user"
                              title="Delete user"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/95 text-destructive shadow-sm transition hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive/10"
                            >
                              <Trash2 size={14} />
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!users.length ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-sm text-muted-foreground"
                        colSpan={5}
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
