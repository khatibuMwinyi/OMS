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
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(lettersQuery));
    })
    .slice(0, 20);
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
              downloadOptions={
                session.role === "admin"
                  ? [
                      {
                        label: "Download letters report",
                        href: "/api/export/report/letters",
                      },
                    ]
                  : undefined
              }
              className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-white p-4"
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
                details: "Subject",
                value: "Created",
              }}
              getEditHref={(item) => `/letters?edit=${item.id}`}
              getDownloadHref={(item) => `/api/export/letter/${item.id}`}
              items={filteredLetters.map((item) => ({
                id: item.id,
                title: item.referenceNumber ?? item.name,
                subtitle: `${item.name} · ${
                  item.description
                    ? item.description.slice(0, 90)
                    : "No subject stored"
                }`,
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
                downloadOptions={
                  session.role === "admin"
                    ? [
                        {
                          label: "Download incoming letters report",
                          href: "/api/export/report/incoming-letters",
                        },
                      ]
                    : undefined
                }
                className="flex flex-wrap items-end gap-3 rounded-3xl border border-border bg-white p-4"
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
