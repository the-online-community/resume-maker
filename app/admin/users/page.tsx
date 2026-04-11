"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  usage: { count: number; daily_limit: number; bonus_credits: number } | null;
  subscription_status: string | null;
  event_counts: Record<string, number>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set("search", search);

    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <span className="text-muted-foreground text-sm">
          {total} users total
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Signed Up</TableHead>
                <TableHead className="text-center">Resumes</TableHead>
                <TableHead className="text-center">Downloads</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead>Subscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {u.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {u.event_counts.resume_generated ?? 0}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {u.event_counts.pdf_downloaded ?? 0}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {u.usage
                      ? `${u.usage.count}/${u.usage.daily_limit + (u.usage.bonus_credits || 0)}`
                      : "0/5"}
                  </TableCell>
                  <TableCell>
                    {u.subscription_status ? (
                      <Badge
                        variant={
                          u.subscription_status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {u.subscription_status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Free
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="cursor-pointer rounded px-3 py-1 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-muted-foreground text-sm">
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="cursor-pointer rounded px-3 py-1 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
