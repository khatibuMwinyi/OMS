import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import { AppToaster } from "@/components/app-toaster";
import "./tailwind.css";

const bodyFont = Poppins({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oweru Management System",
  description:
    "Web app for invoices, receipts, petty cash vouchers, payment vouchers, and letters.",
  icons: {
    icon: "/oweru.jpeg",
    shortcut: "/oweru.jpeg",
    apple: "/oweru.jpeg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} min-h-screen`}
        suppressHydrationWarning
      >
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
