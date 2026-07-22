"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/connect-bank", label: "Connect bank" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/chat", label: "Chat" },
  { href: "/alerts", label: "Alerts" },
  { href: "/digest", label: "Digest" },
  { href: "/goals", label: "Goals" },
  { href: "/subscriptions", label: "Subscriptions" },
];

export function SiteHeader() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) return null;

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-4 text-sm underline">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
