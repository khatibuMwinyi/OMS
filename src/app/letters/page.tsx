import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { RecordFieldRow } from "@/components/record-field-row";
import { RecentRecords } from "@/components/recent-records";
import { ReportPeriodTabs } from "@/components/report-period-tabs";
import { RouteToast } from "@/components/route-toast";
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
} from "../actions/records";

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
    period?: string;
    date?: string;
    month?: string;
    week?: string;
  }>;
};

export default async function LettersPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const reportPeriod = normalizeReportPeriod(resolvedSearchParams.period);
  const reportContext = {
    date: resolvedSearchParams.date ?? null,
    month: resolvedSearchParams.month ?? null,
    week: resolvedSearchParams.week ?? null,
  };

  const editId = Number(resolvedSearchParams.edit);
  const isEditing = Number.isFinite(editId) && editId > 0;

  const editDocument = isEditing
    ? await getLetterDocument(session, editId)
    : null;
  if (isEditing && !editDocument) {
    redirect("/letters?error=Letter%20not%20found.");
  }

  const letters = await listLetters(
    session,
    20,
    reportPeriod,
    reportContext,
  );
  const incomingLetters = await listIncomingLetters(
    session,
    20,
    reportPeriod,
    reportContext,
  );
  const incomingLetterDownloadPaths = new Map(
    incomingLetters.map((item) => [item.id, item.pdfPath]),
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
            <h1 className="page-title text-slate-950">Letters</h1>
            <p className="subtle-copy text-slate-600">
              Create and print official letters to send to recipients and keep
              records.
            </p>
          </div>
        </section>

        <RouteToast
          status={resolvedSearchParams.status}
          error={resolvedSearchParams.error}
        />

        <ReportPeriodTabs
          basePath="/letters"
          value={reportPeriod}
          date={resolvedSearchParams.date ?? ""}
          month={resolvedSearchParams.month ?? ""}
          week={resolvedSearchParams.week ?? ""}
          className="flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-white p-4"
        />

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
              <div className="overflow-hidden rounded-3xl border border-border bg-white">
                <div className="border-b border-border/70 px-5 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
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

              <div className="overflow-hidden rounded-3xl border border-border bg-white">
                <div className="border-b border-border/70 px-5 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                  {isEditing ? "Update letter" : "Save letter"}
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

            <RecentRecords
              title="Letters"
              emptyText="No printed letters found yet."
              columns={{
                record: "Recipient",
                details: "Subject",
                value: "Created",
              }}
              getEditHref={(item) => `/letters?edit=${item.id}`}
              getDownloadHref={(item) => `/api/export/letter/${item.id}`}
              items={letters.map((item) => ({
                id: item.id,
                title: item.name,
                subtitle: item.description
                  ? item.description.slice(0, 90)
                  : "No subject stored",
                value: formatDate(item.createdAt),
              }))}
            />
          </section>

          <section className="section-card form-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Incoming correspondence</span>
                <h2 className="section-title">Record incoming letters</h2>
              </div>
            </div>
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-white">
                <form action={createIncomingLetterAction} className="space-y-0">
                  <div className="border-b border-border/70 px-5 py-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Incoming letter details
                    </h3>
                  </div>
                  <div className="space-y-0 p-5">
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

                  <div className="flex justify-end gap-3 border-t border-border/70 px-5 py-4">
                    <Button type="submit" className="button-primary">
                      Record incoming letter
                    </Button>
                  </div>
                </form>
              </div>

              <RecentRecords
                title="Received letters"
                emptyText="No incoming letters recorded yet."
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
                items={incomingLetters.map((item) => ({
                  id: item.id,
                  title: item.senderName,
                  subtitle: item.senderOrganization
                    ? `${item.senderOrganization} · ${item.subject}`
                    : item.subject,
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
