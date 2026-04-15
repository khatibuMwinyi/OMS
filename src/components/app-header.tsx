"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Receipt,
  X,
  Wallet,
  UsersRound,
  Tags,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SessionActivityMonitor } from "@/components/session-activity-monitor";
import type { SessionUser } from "@/lib/session";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: ClipboardList },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/petty-cash", label: "Petty Cash Voucher", icon: Wallet },
  { href: "/payment-vouchers", label: "Payment Vouchers", icon: ClipboardList },
  { href: "/letters", label: "Letters", icon: FileText },
];

const adminNavigation = [
  { href: "/admin/users", label: "User Management", icon: UsersRound },
  { href: "/admin/categories", label: "Categories", icon: Tags },
];

type AppHeaderProps = {
  session: SessionUser;
  activeHref: string;
};

export function AppHeader({ session, activeHref }: AppHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const navigationItems = [
    ...navigation,
    ...(session.role === "admin" ? adminNavigation : []),
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const { style } = document.body;
    const originalPosition = style.position;
    const originalTop = style.top;
    const originalWidth = style.width;
    const originalOverflow = style.overflow;

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = originalPosition;
      style.top = originalTop;
      style.width = originalWidth;
      style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navigationLinks = navigationItems.map((item) => {
    const Icon = item.icon;
    const active = activeHref === item.href;
    return (
      <Link
        key={item.href}
        className={`sidebar-link${active ? " is-active" : ""}`}
        href={item.href}
        onClick={closeMobileMenu}
      >
        <Icon size={16} />
        {item.label}
      </Link>
    );
  });

  return (
    <>
      <SessionActivityMonitor />

      <header className="mobile-topbar lg:hidden">
        <div className="dashboard-brand">
          <Image
            className="brand-mark"
            src="/oweru.jpeg"
            alt="Oweru International logo"
            width={48}
            height={48}
            priority
          />
          <div className="brand-name">
            <strong>OWERU</strong>
            <span>Management System</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-trigger"
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={20} />
        </button>
      </header>

      <button
        type="button"
        className={`sidebar-backdrop lg:hidden${isMobileMenuOpen ? " is-open" : ""}`}
        aria-label="Close navigation menu"
        aria-hidden={!isMobileMenuOpen}
        tabIndex={-1}
        onClick={closeMobileMenu}
      />

      <aside
        id="mobile-navigation"
        className={`mobile-sidebar lg:hidden${isMobileMenuOpen ? " is-open" : ""}`}
        aria-label="Primary mobile"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-sidebar-header border-b border-border pb-4">
          <div className="sidebar-brand sidebar-brand--mobile">
            <Image
              className="brand-mark"
              src="/oweru.jpeg"
              alt="Oweru International logo"
              width={48}
              height={48}
            />
            <div className="brand-name">
              <strong>OWERU</strong>
              <span>Management System</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">{navigationLinks}</nav>

        <div className="sidebar-footer sidebar-footer--mobile">
          <Badge variant="warning">{session.role.toUpperCase()} ACCESS</Badge>
          <form action={logoutAction}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="w-full text-primary hover:text-primary"
            >
              Logout
            </Button>
          </form>
        </div>
      </aside>

      <aside className="desktop-sidebar hidden lg:flex" aria-label="Primary">
        <div className="sidebar-brand">
          <Image
            className="brand-mark"
            src="/oweru.jpeg"
            alt="Oweru International logo"
            width={56}
            height={56}
            priority
          />
          <div className="brand-name">
            <strong>OWERU</strong>
            <span>Management System</span>
          </div>
        </div>

        <div className="sidebar-section">
          <Badge variant="warning" className="w-fit">
            {session.role.toUpperCase()} ACCESS
          </Badge>
          <nav className="sidebar-nav">{navigationLinks}</nav>
        </div>

        <div className="sidebar-footer">
          <form action={logoutAction}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="w-full text-primary hover:text-primary"
            >
              Logout
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
