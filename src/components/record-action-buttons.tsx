"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Eye, Loader2, Mail, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type RecordActionButtonsProps = {
  shareDocument?: {
    type: "invoice" | "receipt";
    id: number;
    title: string;
    summary?: string;
  } | null;
  editHref?: string | null;
  previewHref?: string | null;
  downloadHref?: string | null;
};

function actionButtonClassName() {
  return "h-9 w-9 rounded-xl border border-border bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/5 hover:text-primary";
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

export function RecordActionButtons({
  shareDocument,
  editHref,
  previewHref,
  downloadHref,
}: RecordActionButtonsProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

    const toastId = `share-${shareDocument.type}-${shareDocument.id}`;
    setIsSharing(true);
    toast.loading("Preparing WhatsApp share...", { id: toastId });

    try {
      const shareLink = await createTemporaryShareLink();
      const lines = [
        shareDocument.title,
        shareDocument.summary,
        `PDF Link: ${shareLink.url}`,
      ].filter(Boolean);

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      toast.success("WhatsApp opened with temporary PDF link.", {
        id: toastId,
      });
    } catch {
      toast.error("Unable to prepare WhatsApp share.", { id: toastId });
    } finally {
      setIsSharing(false);
    }
  }

  async function handleSendEmail() {
    if (!shareDocument || isEmailing) {
      return;
    }

    const recipientEmail = window.prompt("Recipient email address");
    if (!recipientEmail?.trim()) {
      return;
    }

    const toastId = `email-${shareDocument.type}-${shareDocument.id}`;
    setIsEmailing(true);
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

  return (
    <div className="inline-flex items-center justify-end gap-2">
      {shareDocument ? (
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
          onClick={() => {
            void handleSendEmail();
          }}
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
  );
}
