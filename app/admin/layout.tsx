"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { useUser } from "@/hooks/use-user";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/quota-requests", label: "Quota Requests" },
  { href: "/admin/errors", label: "Errors" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    // Quick check: hit any admin endpoint to verify access
    fetch("/api/admin/health")
      .then((res) => {
        if (res.status === 403 || res.status === 401) {
          router.replace("/");
        } else {
          setAuthorized(true);
        }
      })
      .catch(() => router.replace("/"))
      .finally(() => setChecking(false));
  }, [user, loading, router]);

  if (loading || checking || !authorized) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <AppHeader />
        <div className="text-muted-foreground py-20 text-center text-sm">
          Checking access...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-12">
      <AppHeader />

      <div className="mb-6">
        <h2 className="text-xl font-semibold">Admin Dashboard</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Analytics, user management, and system health.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-40 shrink-0">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
