"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApiError {
  id: string;
  route: string;
  error_message: string;
  status_code: number;
  user_id: string | null;
  model: string | null;
  created_at: string;
}

interface ErrorsData {
  errors: ApiError[];
  routeSummary: Record<string, number>;
  days: number;
}

export default function AdminErrorsPage() {
  const [data, setData] = useState<ErrorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [routeFilter, setRouteFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (routeFilter) params.set("route", routeFilter);

    fetch(`/api/admin/errors?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days, routeFilter]);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const routes = Object.entries(data.routeSummary ?? {}).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-2">
        {[1, 7, 14, 30].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`cursor-pointer rounded px-3 py-1 text-sm transition-colors ${
              days === d
                ? "bg-foreground text-background font-medium"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Route summary */}
      {routes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Errors by Route ({days}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRouteFilter(null)}
                className={`cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
                  !routeFilter
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                All ({data.errors.length})
              </button>
              {routes.map(([route, count]) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => setRouteFilter(route)}
                  className={`cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
                    routeFilter === route
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {route} ({count})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Route</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.errors.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap font-mono text-xs">
                {e.route}
              </TableCell>
              <TableCell>
                <Badge variant="destructive">{e.status_code}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-60 truncate">
                {e.error_message ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {e.model ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {new Date(e.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          {data.errors.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground py-8 text-center"
              >
                No errors in the last {days} day{days > 1 ? "s" : ""}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
