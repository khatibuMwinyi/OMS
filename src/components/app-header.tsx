"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  ChevronDown,
  ClipboardList,
  FileText,
  FileEdit,
  Folder,
  LayoutDashboard,
  Menu,
  Receipt,
  Tags,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SessionActivityMonitor } from "@/components/session-activity-monitor";
import type { SessionUser } from "@/lib/session";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const reportNavigation = [
  { href: "/reports", label: "Reports", icon: BarChart2 },
];

const staffNavigation = [
  { href: "/payment-vouchers", label: "Payment Vouchers", icon: FileEdit },
  { href: "/invoices", label: "Invoices", icon: ClipboardList },
  { href: "/letters", label: "Letters", icon: FileText },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/petty-cash", label: "Petty Cash Voucher", icon: Wallet },
];

const adminNavigation = [
  { href: "/admin/users", label: "User Management", icon: UsersRound },
  { href: "/admin/categories", label: "Categories", icon: Tags },
];

const projectCategories = [
  { href: "/projects/land", label: "Land Project" },
  { href: "/projects/mjengo", label: "Mjengo Challenge" },
  { href: "/projects/rental", label: "Rental Project" },
  { href: "/projects/property-management", label: "Property Management" },
];

type AppHeaderProps = {
  session: SessionUser;
  activeHref: string;
};

export function AppHeader({ session, activeHref }: AppHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const pathname = usePathname();

  const navigationItems = [
    ...navigation,
    ...(session.role === "admin" || session.role === "director" ? reportNavigation : []),
    ...(session.role === "admin" || session.role === "secretary" ? staffNavigation : []),
    ...(session.role === "admin" ? adminNavigation : []),
  ];

  // Auto-expand projects dropdown when navigating to any /projects/* page
  useEffect(() => {
    if (pathname.startsWith("/projects")) {
      setProjectsOpen(true);
    }
  }, [pathname]);

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
    const active = activeHref === item.href || activeHref.startsWith(item.href + "/");
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

  // Projects dropdown — visible to director and admin only
  const onProjectsPage = pathname.startsWith("/projects");
  const showProjects = session.role === "director" || session.role === "admin";

  const projectsDropdown = showProjects ? (
    <div>
      <button
        type="button"
        onClick={() => setProjectsOpen((o) => !o)}
        className={`sidebar-link w-full text-left${onProjectsPage ? " is-active" : ""}`}
      >
        <Folder size={16} />
        <span className="flex-1">Projects</span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform duration-200"
          style={{ transform: projectsOpen ? "rotate(-180deg)" : "rotate(0deg)" }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: projectsOpen ? "14rem" : "0px" }}
      >
        <nav className="mt-1 grid gap-1 pl-4">
          {projectCategories.map((cat) => {
            const active =
              pathname === cat.href || pathname.startsWith(cat.href + "/");
            return (
              <Link
                key={cat.href}
                href={cat.href}
                onClick={closeMobileMenu}
                className={`sidebar-link py-2 text-sm${active ? " is-active" : ""}`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
                  aria-hidden
                />
                {cat.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  ) : null;

  const allNavContent = (
    <>
      {navigationLinks}
      {projectsDropdown}
    </>
  );

  return (
    <>
      <SessionActivityMonitor />

      {/* Mobile top bar */}
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

      {/* Mobile backdrop */}
      <button
        type="button"
        className={`sidebar-backdrop lg:hidden${isMobileMenuOpen ? " is-open" : ""}`}
        aria-label="Close navigation menu"
        aria-hidden={!isMobileMenuOpen}
        tabIndex={-1}
        onClick={closeMobileMenu}
      />

      {/* Mobile sidebar */}
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

        <nav className="sidebar-nav">{allNavContent}</nav>

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

      {/* Desktop sidebar */}
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
          <nav className="sidebar-nav">{allNavContent}</nav>
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