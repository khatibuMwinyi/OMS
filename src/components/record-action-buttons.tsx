"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Download, Eye, Loader2, Mail, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RecordActionButtonsProps = {
  shareDocument?: {
    type: "invoice" | "receipt" | "letter";
    id: number;
    title: string;
    summary?: string;
    recipientPhone?: string | null;
  } | null;
  editHref?: string | null;
  previewHref?: string | null;
  downloadHref?: string | null;
};

function actionButtonClassName() {
  return "h-9 w-9 rounded-xl border border-border bg-card/95 text-foreground/75 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/5 hover:text-primary";
}

function resolveDownloadFilename(
  dispositionHeader: string | null,
  fallbackName: string,
) {
  const encodedMatch = dispositionHeader?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const standardMatch = dispositionHeader?.match(/filename="?([^";]+)"?/i);
  if (standardMatch?.[1]) {
    return standardMatch[1];
  }

  return fallbackName;
}

function fallbackDownloadFilename(downloadHref: string) {
  const url = new URL(downloadHref, window.location.origin);
  const segment = url.pathname.split("/").pop() ?? "document";
  return segment.endsWith(".pdf") ? segment : `${segment}.pdf`;
}

function sanitizeWhatsAppRecipientNumber(
  value: string | null | undefined,
) {
  const digitsOnly = (value ?? "").replace(/\D+/g, "");

  if (digitsOnly.length < 6) {
    return null;
  }

  if (digitsOnly.startsWith("00")) {
    return digitsOnly.slice(2);
  }

  // Normalize common local Tanzania format (0XXXXXXXXX) for wa.me.
  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    return `255${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function RecordActionButtons({
  shareDocument,
  editHref,
  previewHref,
  downloadHref,
}: RecordActionButtonsProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [emailValidationError, setEmailValidationError] = useState<
    string | null
  >(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const emailDialogTitleId = useId();
  const emailDialogDescriptionId = useId();
  const emailInputId = useId();
  const canShareViaWhatsApp =
    !!shareDocument && shareDocument.type !== "letter";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isEmailDialogOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusTimeout = window.setTimeout(() => {
      emailInputRef.current?.focus();
      emailInputRef.current?.select();
    }, 60);

    document.body.style.overflow = "hidden";

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isEmailing) {
        setIsEmailDialogOpen(false);
        setEmailValidationError(null);
      }
    };

    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      window.clearTimeout(focusTimeout);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isEmailDialogOpen, isEmailing]);

  function openEmailDialog() {
    if (isEmailing) {
      return;
    }

    setEmailValue("");
    setEmailValidationError(null);
    setIsEmailDialogOpen(true);
  }

  function closeEmailDialog() {
    if (isEmailing) {
      return;
    }

    setIsEmailDialogOpen(false);
    setEmailValidationError(null);
  }

  async function createTemporaryShareLink() {
    if (!shareDocument) {
      throw new Error("Share document data not provided.");
    }

    const response = await fetch(
      `/api/share-link/${shareDocument.type}/${shareDocument.id}`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to generate temporary link.");
    }

    return (await response.json()) as {
      url: string;
      expiresAt: string;
      ttlMinutes: number;
    };
  }

  async function handleWhatsAppShare() {
    if (!shareDocument || isSharing) {
      return;
    }

    if (shareDocument.type === "letter") {
      toast.error("WhatsApp sharing is unavailable for letters.");
      return;
    }

    const recipientNumber = sanitizeWhatsAppRecipientNumber(
      shareDocument.recipientPhone,
    );
    if (!recipientNumber) {
      toast.error("Recipient phone number is missing or invalid.");
      return;
    }

    const toastId = `share-${shareDocument.type}-${shareDocument.id}`;
    setIsSharing(true);
    toast.loading("Preparing WhatsApp share...", { id: toastId });

    // Open the popup immediately from the click event so browsers don't block it.
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.title = "Opening WhatsApp...";
    }

    try {
      const shareLink = await createTemporaryShareLink();
      const lines = [
        shareDocument.title,
        shareDocument.summary,
        `PDF Link: ${shareLink.url}`,
      ].filter(Boolean);

      const whatsappUrl = `https://wa.me/${recipientNumber}?text=${encodeURIComponent(lines.join("\n"))}`;

      if (popup && !popup.closed) {
        popup.location.replace(whatsappUrl);
      } else {
        const fallbackPopup = window.open(whatsappUrl, "_blank");
        if (!fallbackPopup) {
          window.location.assign(whatsappUrl);
        }
      }

      toast.success("WhatsApp opened for recipient chat.", {
        id: toastId,
      });
    } catch (error) {
      popup?.close();
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to prepare WhatsApp share.";
      toast.error(message, { id: toastId });
    } finally {
      setIsSharing(false);
    }
  }

  async function handleSendEmail(recipientEmailValue: string) {
    if (!shareDocument || isEmailing) {
      return;
    }

    const recipientEmail = recipientEmailValue.trim();
    if (!recipientEmail) {
      setEmailValidationError("Please enter a recipient email address.");
      return;
    }

    if (!isValidEmailAddress(recipientEmail)) {
      setEmailValidationError("Please enter a valid email address.");
      return;
    }

    const toastId = `email-${shareDocument.type}-${shareDocument.id}`;
    setIsEmailing(true);
    setEmailValidationError(null);
    toast.loading("Sending email...", { id: toastId });

    try {
      const response = await fetch("/api/send-document-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: shareDocument.type,
          id: shareDocument.id,
          to: recipientEmail.trim(),
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorBody?.error || "Failed to send email.");
      }

      toast.success("Email sent successfully.", { id: toastId });
      setEmailValue("");
      setIsEmailDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to send email.";
      toast.error(message, { id: toastId });
    } finally {
      setIsEmailing(false);
    }
  }

  function handleEmailFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSendEmail(emailValue);
  }

  async function handleDownload() {
    if (!downloadHref || isDownloading) {
      return;
    }

    const toastId = `download-${downloadHref}`;
    setIsDownloading(true);
    toast.loading("Preparing download...", { id: toastId });

    try {
      const response = await fetch(downloadHref, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Download request failed.");
      }

      const blob = await response.blob();
      const filename = resolveDownloadFilename(
        response.headers.get("content-disposition"),
        fallbackDownloadFilename(downloadHref),
      );

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success("Download complete.", { id: toastId });
    } catch {
      toast.error("Unable to download file.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  }

  const emailDialog =
    hasMounted && isEmailDialogOpen
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              onClick={closeEmailDialog}
              aria-label="Close email dialog"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={emailDialogTitleId}
              aria-describedby={emailDialogDescriptionId}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-amber-200/20 bg-[linear-gradient(160deg,rgba(22,32,52,0.97),rgba(8,14,28,0.99))] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.75)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />

              <div className="relative space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">
                    Email Delivery
                  </p>
                  <h2
                    id={emailDialogTitleId}
                    className="text-2xl font-semibold tracking-tight text-slate-50"
                  >
                    Send PDF to Recipient
                  </h2>
                  <p
                    id={emailDialogDescriptionId}
                    className="text-sm text-slate-300/90"
                  >
                    Enter the recipient email address and we will deliver this
                    document instantly.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleEmailFormSubmit}>
                  <div className="space-y-2">
                    <label
                      htmlFor={emailInputId}
                      className="text-sm font-medium text-slate-100"
                    >
                      Recipient email
                    </label>
                    <Input
                      ref={emailInputRef}
                      id={emailInputId}
                      type="email"
                      value={emailValue}
                      onChange={(event) => {
                        setEmailValue(event.target.value);
                        if (emailValidationError) {
                          setEmailValidationError(null);
                        }
                      }}
                      placeholder="name@example.com"
                      autoComplete="email"
                      disabled={isEmailing}
                      className="h-12 border-amber-200/30 bg-slate-900/60 text-slate-100 placeholder:text-muted-foreground focus:border-amber-300 focus:ring-amber-300/20"
                    />
                    {emailValidationError ? (
                      <p className="text-sm text-rose-300" role="alert">
                        {emailValidationError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeEmailDialog}
                      disabled={isEmailing}
                      className="h-10 border-slate-500/40 bg-slate-900/40 px-4 text-slate-100 hover:border-amber-200/40 hover:bg-amber-100/10 hover:text-amber-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isEmailing}
                      className="h-10 min-w-[128px] bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-300 px-4 font-semibold text-foreground shadow-[0_14px_34px_rgba(88,199,173,0.28)] hover:from-amber-200 hover:via-amber-100 hover:to-emerald-200"
                    >
                      {isEmailing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Email"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="inline-flex items-center justify-end gap-2">
      {canShareViaWhatsApp ? (
        <Button
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
          onClick={() => {
            void handleWhatsAppShare();
          }}
          disabled={isSharing || isEmailing || isDownloading}
          aria-label={isSharing ? "Preparing WhatsApp share" : "Share via WhatsApp"}
          title={isSharing ? "Preparing WhatsApp share" : "Share via WhatsApp"}
        >
          {isSharing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Share2 size={14} />
          )}
        </Button>
      ) : null}

      {shareDocument ? (
        <Button
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
          onClick={openEmailDialog}
          disabled={isEmailing || isSharing || isDownloading}
          aria-label={isEmailing ? "Sending email" : "Send via Email"}
          title={isEmailing ? "Sending email" : "Send via Email"}
        >
          {isEmailing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Mail size={14} />
          )}
        </Button>
      ) : null}

      {editHref ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
        >
          <Link href={editHref} aria-label="Edit record" title="Edit record">
            <Pencil size={14} />
          </Link>
        </Button>
      ) : null}

      {previewHref ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
        >
          <a
            href={previewHref}
            aria-label="Preview PDF"
            rel="noreferrer"
            target="_blank"
            title="Preview PDF"
          >
            <Eye size={14} />
          </a>
        </Button>
      ) : null}

      {downloadHref ? (
        <Button
          variant="ghost"
          size="icon"
          className={actionButtonClassName()}
          onClick={() => {
            void handleDownload();
          }}
          disabled={isDownloading}
          aria-label={isDownloading ? "Downloading PDF" : "Download PDF"}
          title={isDownloading ? "Downloading PDF" : "Download PDF"}
        >
          {isDownloading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
        </Button>
      ) : null}
      </div>

      {emailDialog}
    </>
  );
}
