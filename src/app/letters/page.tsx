import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RecordFieldRow } from "@/components/record-field-row";
import { RecentRecords } from "@/components/recent-records";
import { ReportPeriodTabs } from "@/components/report-period-tabs";
import { RouteToast } from "@/components/route-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getLetterDocument,
  listLetters,
  splitLetterBody,
  listIncomingLetters,
} from "@/lib/records";
import { normalizeReportPeriod } from "@/lib/report-period";
import { getCurrentSession } from "@/lib/session-server";

import {
  createLetterAction,
  updateLetterAction,
  createIncomingLetterAction,
  approveLetterAction,
} from "../actions/records";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function renderLetterStatus(status: "pending" | "approved") {
  if (status === "approved") {
    return (
      <Badge variant="success" className="px-2 py-0.5 text-[10px]">
        Approved
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
      Pending Approval
    </Badge>
  );
}

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
    edit?: string;
    period?: string;
    date?: string;
    month?: string;
    week?: string;
    letters_period?: string;
    letters_date?: string;
    letters_month?: string;
    letters_week?: string;
    letters_q?: string;
    incoming_period?: string;
    incoming_date?: string;
    incoming_month?: string;
    incoming_week?: string;
    incoming_q?: string;
  }>;
};

export default async function LettersPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const lettersPeriod = normalizeReportPeriod(
    resolvedSearchParams.letters_period ?? resolvedSearchParams.period,
  );
  const lettersContext = {
    date: resolvedSearchParams.letters_date ?? resolvedSearchParams.date ?? null,
    month:
      resolvedSearchParams.letters_month ?? resolvedSearchParams.month ?? null,
    week: resolvedSearchParams.letters_week ?? resolvedSearchParams.week ?? null,
  };
  const incomingPeriod = normalizeReportPeriod(
    resolvedSearchParams.incoming_period ?? resolvedSearchParams.period,
  );
  const incomingContext = {
    date:
      resolvedSearchParams.incoming_date ?? resolvedSearchParams.date ?? null,
    month:
      resolvedSearchParams.incoming_month ?? resolvedSearchParams.month ?? null,
    week:
      resolvedSearchParams.incoming_week ?? resolvedSearchParams.week ?? null,
  };
  const lettersQuery = (resolvedSearchParams.letters_q ?? "")
    .trim()
    .toLowerCase();
  const incomingQuery = (resolvedSearchParams.incoming_q ?? "")
    .trim()
    .toLowerCase();

  const editId = Number(resolvedSearchParams.edit);
  const isEditing = Number.isFinite(editId) && editId > 0;

  const editDocument = isEditing
    ? await getLetterDocument(session, editId)
    : null;
  if (isEditing && !editDocument) {
    redirect("/letters?error=Letter%20not%20found.");
  }

  if (
    isEditing &&
    editDocument &&
    session.role !== "admin" &&
    editDocument.status !== "pending"
  ) {
    redirect(
      "/letters?error=Approved%20letters%20can%20only%20be%20edited%20by%20admin.",
    );
  }

  const letters = await listLetters(
    session,
    1000,
    lettersPeriod,
    lettersContext,
  );
  const incomingLetters = await listIncomingLetters(
    session,
    1000,
    incomingPeriod,
    incomingContext,
  );
  const filteredLetters = letters
    .filter((item) => {
      if (!lettersQuery) {
        return true;
      }

      return [
        item.referenceNumber,
        item.name,
        item.description,
        item.heading,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(lettersQuery));
    })
    .slice(0, 20);
  const pendingLetters = letters.filter((item) => item.status === "pending");
  const selectedPendingLetterId = pendingLetters[0]?.id ?? "";
  const pendingAlertText =
    pendingLetters.length === 0
      ? ""
      : session.role === "admin"
        ? `${pendingLetters.length} letter${pendingLetters.length === 1 ? " is" : "s are"} waiting for your approval.`
        : `${pendingLetters.length} letter${pendingLetters.length === 1 ? " is" : "s are"} waiting for admin approval.`;
  const filteredIncomingLetters = incomingLetters
    .filter((item) => {
      if (!incomingQuery) {
        return true;
      }

      return [
        item.referenceNumber,
        item.senderName,
        item.senderOrganization,
        item.subject,
        item.category,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(incomingQuery));
    })
    .slice(0, 20);
  const incomingLetterDownloadPaths = new Map(
    filteredIncomingLetters.map((item) => [item.id, item.pdfPath]),
  );
  const letterBodyParts = splitLetterBody(editDocument?.body);

  return (
    <main className="dashboard-shell">
      <AppHeader session={session} activeHref="/letters" />

      <div className="dashboard-content">
        <section className="page-hero">
          <div>
            <span className="eyebrow text-primary font-semibold">
              Documents
            </span>
            <h1 className="page-title text-foreground">Letters</h1>
            <p className="subtle-copy text-foreground/75">
              Create and print official letters to send to recipients and keep
              records.
            </p>
          </div>
        </section>

        <RouteToast
          status={resolvedSearchParams.status}
          error={resolvedSearchParams.error}
        />

        {pendingAlertText ? (
          <div className="mb-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-primary">
            {pendingAlertText}
          </div>
        ) : null}

        <section className="module-grid module-grid--single">
          <section className="section-card form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">
                  {isEditing ? "Edit letter" : "Create letter"}
                </span>
                <h2 className="section-title">Letter details</h2>
              </div>
            </div>
            <form
              action={isEditing ? updateLetterAction : createLetterAction}
              className="space-y-6"
            >
              {isEditing && editDocument ? (
                <input
                  name="letter_id"
                  type="hidden"
                  value={editDocument.id}
                  readOnly
                />
              ) : null}
              <div className="overflow-hidden rounded-3xl border border-border bg-card/95">
                <div className="border-b border-border/85 px-5 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Recipient details
                  </h3>
                </div>

                <RecordFieldRow label="Recipient name">
                  <Input
                    name="recipient_name"
                    defaultValue={editDocument?.name ?? ""}
                    required
                  />
                </RecordFieldRow>
                <RecordFieldRow
                  label="Recipient address"
                  helper="Use the full mailing address that appears on the letter."
                >
                  <Textarea
                    name="recipient_address"
                    rows={4}
                    defaultValue={editDocument?.receiverAddress ?? ""}
                    required
                  />
                </RecordFieldRow>
                <RecordFieldRow label="Subject">
                  <Input
                    name="subject"
                    defaultValue={
                      editDocument?.heading ?? editDocument?.description ?? ""
                    }
                    required
                  />
                </RecordFieldRow>
                <RecordFieldRow label="Date">
                  <Input
                    name="letter_date"
                    type="date"
                    defaultValue={editDocument?.letterDate ?? ""}
                    required
                  />
                </RecordFieldRow>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border bg-card/95">
                <div className="border-b border-border/85 px-5 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Letter content
                  </h3>
                </div>

                <RecordFieldRow
                  label="Custom message"
                  helper="This text becomes the body of the generated PDF."
                >
                  <Textarea
                    name="custom_message"
                    rows={10}
                    defaultValue={letterBodyParts.customMessage}
                    required
                    placeholder="Enter your custom message here..."
                  />
                </RecordFieldRow>
              </div>

              <div className="button-row">
                <Button type="submit">
                  {isEditing ? "Update letter" : "Create letter"}
                </Button>
              </div>
            </form>
          </section>

          <section className="section-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Recent letters</span>
                <h2 className="section-title">Latest printed documents</h2>
              </div>
            </div>

            <ReportPeriodTabs
              basePath="/letters"
              queryKeyPrefix="letters"
              value={lettersPeriod}
              date={resolvedSearchParams.letters_date ?? ""}
              month={resolvedSearchParams.letters_month ?? ""}
              week={resolvedSearchParams.letters_week ?? ""}
              searchParamKey="letters_q"
              defaultSearchQuery={resolvedSearchParams.letters_q ?? ""}
              searchPlaceholder="Search recipient, subject, or reference"
              downloadOptions={[
                {
                  label: "Download letters report",
                  href: "/api/export/report/letters",
                },
              ]}
              className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card/95 p-4"
            />

            <RecentRecords
              title="Letters"
              emptyText={
                lettersQuery
                  ? "No printed letters match your search/filter."
                  : "No printed letters found yet."
              }
              columns={{
                record: "Recipient",
                details: "Subject / Created",
                value: "Status",
              }}
              getShareDocument={(item) => {
                const source = filteredLetters.find((record) => record.id === item.id);
                if (!source || source.status !== "approved") {
                  return null;
                }

                return {
                  type: "letter",
                  title: `Letter ${source.referenceNumber ?? source.id}`,
                  summary: [
                    `Recipient: ${source.name}`,
                    `Subject: ${source.heading ?? source.description ?? "Official letter"}`,
                    `Status: ${source.status}`,
                  ].join("\n"),
                };
              }}
              getEditHref={(item) => {
                const source = filteredLetters.find((record) => record.id === item.id);
                if (!source) {
                  return null;
                }

                if (session.role === "admin") {
                  return `/letters?edit=${item.id}`;
                }

                return source.status === "pending"
                  ? `/letters?edit=${item.id}`
                  : null;
              }}
              getDownloadHref={(item) => `/api/export/letter/${item.id}`}
              items={filteredLetters.map((item) => ({
                id: item.id,
                title: item.referenceNumber ?? item.name,
                subtitle: `${item.name} · ${
                  item.description
                    ? item.description.slice(0, 90)
                    : "No subject stored"
                } · ${formatDate(item.createdAt)}`,
                value: renderLetterStatus(item.status),
              }))}
            />

            {session.role === "admin" ? (
              <form action={approveLetterAction} className="approval-row">
                <label>
                  <span className="field-label">Pending letter</span>
                  <select
                    className="input"
                    name="letter_id"
                    defaultValue={String(selectedPendingLetterId)}
                    required
                  >
                    <option value="" disabled>
                      Select a pending letter
                    </option>
                    {pendingLetters.map((item) => (
                      <option key={item.id} value={item.id}>
                        {(item.referenceNumber ?? item.id) +
                          " - " +
                          item.name +
                          " - " +
                          formatDate(item.createdAt)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="button-row">
                  <Button type="submit" variant="secondary">
                    Approve letter
                  </Button>
                </div>
              </form>
            ) : null}
          </section>

          <section className="section-card form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Incoming letters</span>
                <h2 className="section-title">Record incoming letters</h2>
              </div>
            </div>
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-card/95">
                <form action={createIncomingLetterAction} className="space-y-0">
                  <div className="border-b border-border/85 px-5 py-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Incoming letter details
                    </h3>
                  </div>
                  <div className="space-y-0 p-5">
                    <RecordFieldRow
                      label="Reference number"
                      helper="Enter the sender's incoming letter reference number."
                    >
                      <Input
                        name="reference_number"
                        placeholder="e.g. REF/2026/014"
                        required
                      />
                    </RecordFieldRow>
                    <RecordFieldRow label="Sender name">
                      <Input
                        name="sender_name"
                        placeholder="Full name of the sender"
                        required
                      />
                    </RecordFieldRow>
                    <RecordFieldRow label="Sender organization">
                      <Input
                        name="sender_organization"
                        placeholder="Organization or institution name"
                      />
                    </RecordFieldRow>
                    <RecordFieldRow label="Subject">
                      <Input
                        name="subject"
                        placeholder="Subject of the letter"
                        required
                      />
                    </RecordFieldRow>
                    <RecordFieldRow label="Category">
                      <select name="category" className="input" required>
                        <option value="">Select a category...</option>
                        <option value="complaint">Complaint</option>
                        <option value="inquiry">Inquiry</option>
                        <option value="approval">Approval Request</option>
                        <option value="notice">Notice</option>
                        <option value="payment">Payment</option>
                        <option value="report">Report</option>
                        <option value="other">Other</option>
                      </select>
                    </RecordFieldRow>
                    <RecordFieldRow label="Date received">
                      <Input name="received_date" type="date" required />
                    </RecordFieldRow>
                    <RecordFieldRow
                      label="Letter PDF"
                      helper="Attach the actual incoming letter as a PDF file."
                    >
                      <Input
                        name="letter_file"
                        type="file"
                        accept="application/pdf"
                        required
                      />
                    </RecordFieldRow>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-border/85 px-5 py-4">
                    <Button type="submit" className="button-primary">
                      Record incoming letter
                    </Button>
                  </div>
                </form>
              </div>

              <ReportPeriodTabs
                basePath="/letters"
                queryKeyPrefix="incoming"
                value={incomingPeriod}
                date={resolvedSearchParams.incoming_date ?? ""}
                month={resolvedSearchParams.incoming_month ?? ""}
                week={resolvedSearchParams.incoming_week ?? ""}
                searchParamKey="incoming_q"
                defaultSearchQuery={resolvedSearchParams.incoming_q ?? ""}
                searchPlaceholder="Search sender, subject, or reference"
                downloadOptions={[
                  {
                    label: "Download incoming letters report",
                    href: "/api/export/report/incoming-letters",
                  },
                ]}
                className="flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-card/95 p-4"
              />

              <RecentRecords
                title="Received letters"
                emptyText={
                  incomingQuery
                    ? "No incoming letters match your search/filter."
                    : "No incoming letters recorded yet."
                }
                columns={{
                  record: "Sender",
                  details: "Subject",
                  value: "Received",
                }}
                getDownloadHref={(item) =>
                  incomingLetterDownloadPaths.get(item.id)
                    ? `/api/export/incoming-letter/${item.id}`
                    : null
                }
                items={filteredIncomingLetters.map((item) => ({
                  id: item.id,
                  title: item.referenceNumber ?? item.senderName,
                  subtitle: item.senderOrganization
                    ? `${item.senderName} · ${item.senderOrganization} · ${item.subject}`
                    : `${item.senderName} · ${item.subject}`,
                  value: formatDate(item.receivedDate),
                }))}
              />
            </div>
          </section>
        </section>

        <div className="helper-panel">
          Use the action icons to manage letters.
        </div>
      </div>
    </main>
  );
}
