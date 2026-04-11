"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  eventCounts: Record<string, number>;
  modelCounts: Record<string, number>;
  funnel: { signups: number; generated: number; downloaded: number };
  days: number;
}

interface Health {
  errorsByRoute: Record<string, number>;
  totalErrors24h: number;
  eventsToday: number;
  eventsYesterday: number;
  trend: number;
  modelUsage: Record<string, number>;
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && (
          <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function BarChart({
  data,
  maxValue,
}: {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-muted-foreground w-28 shrink-0 truncate text-xs">
            {d.label}
          </span>
          <div className="bg-muted h-5 flex-1 overflow-hidden rounded">
            <div
              className={`h-full rounded transition-all ${d.color ?? "bg-blue-500"}`}
              style={{ width: `${Math.max(1, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 text-right text-xs font-medium tabular-nums">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function FunnelBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="bg-muted h-3 overflow-hidden rounded">
        <div
          className="h-full rounded bg-green-500 transition-all"
          style={{ width: `${Math.max(1, pct)}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetch(`/api/admin/stats?days=${days}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);

    fetch("/api/admin/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(console.error);
  }, [days]);

  if (!stats || !health) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const modelColors: Record<string, string> = {
    "gpt-5-mini": "bg-emerald-500",
    "gpt-4o": "bg-emerald-600",
    "claude-haiku-4-5": "bg-orange-400",
    "claude-sonnet-4-6": "bg-orange-500",
    "claude-opus-4-6": "bg-orange-600",
  };

  const modelData = Object.entries(stats.modelCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({
      label,
      value,
      color: modelColors[label] ?? "bg-blue-500",
    }));

  const errorRouteData = Object.entries(health.errorsByRoute)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value, color: "bg-red-500" }));

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map((d) => (
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard
          title="Resumes Generated"
          value={stats.eventCounts.resume_generated ?? 0}
          sub={`Last ${days} days`}
        />
        <StatCard
          title="PDFs Downloaded"
          value={stats.eventCounts.pdf_downloaded ?? 0}
          sub={`Last ${days} days`}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
        />
      </div>

      {/* Health row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          title="Events Today"
          value={health.eventsToday}
          sub={`${health.trend >= 0 ? "+" : ""}${health.trend}% vs yesterday`}
        />
        <StatCard
          title="API Errors (24h)"
          value={health.totalErrors24h}
          sub={health.totalErrors24h > 0 ? "Check error log" : "All clear"}
        />
        <StatCard
          title="Jobs Analyzed"
          value={stats.eventCounts.job_analyzed ?? 0}
          sub={`Last ${days} days`}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              User Funnel ({days}d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FunnelBar
              label="Signups"
              value={stats.funnel.signups}
              max={stats.funnel.signups}
            />
            <FunnelBar
              label="Generated Resume"
              value={stats.funnel.generated}
              max={stats.funnel.signups}
            />
            <FunnelBar
              label="Downloaded PDF"
              value={stats.funnel.downloaded}
              max={stats.funnel.signups}
            />
          </CardContent>
        </Card>

        {/* Model usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Model Usage ({days}d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {modelData.length > 0 ? (
              <BarChart data={modelData} />
            ) : (
              <p className="text-muted-foreground text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error breakdown */}
      {errorRouteData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Errors by Route (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={errorRouteData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
