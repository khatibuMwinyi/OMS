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
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/session";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: ClipboardList },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/petty-cash", label: "Petty Cash Voucher", icon: Wallet },
  { href: "/payment-vouchers", label: "Payment Vouchers", icon: ClipboardList },
  { href: "/letters", label: "Letters", icon: FileText },
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
    ...(session.role === "admin"
      ? [{ href: "/admin/users", label: "User Management", icon: UsersRound }]
      : []),
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      <header className="mobile-topbar md:hidden">
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
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <button
        type="button"
        className={`sidebar-backdrop md:hidden${isMobileMenuOpen ? " is-open" : ""}`}
        aria-label="Close navigation menu"
        aria-hidden={!isMobileMenuOpen}
        tabIndex={-1}
        onClick={closeMobileMenu}
      />

      <aside
        id="mobile-navigation"
        className={`mobile-sidebar md:hidden${isMobileMenuOpen ? " is-open" : ""}`}
        aria-label="Primary mobile"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="sidebar-brand sidebar-brand--mobile border-b border-border pb-4">
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

        <nav className="sidebar-nav">{navigationLinks}</nav>

        <div className="sidebar-footer sidebar-footer--mobile">
          <Badge variant="warning">{session.role.toUpperCase()} ACCESS</Badge>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit" className="w-full">
              Logout
            </Button>
          </form>
        </div>
      </aside>

      <aside className="desktop-sidebar hidden md:flex" aria-label="Primary">
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
            <Button variant="outline" size="sm" type="submit" className="w-full">
              Logout
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
