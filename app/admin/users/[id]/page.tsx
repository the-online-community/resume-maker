"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

interface UserDetail {
  user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
  };
  profile: {
    full_name: string;
    email: string;
    phone: string;
    location: string;
  } | null;
  usage: {
    count: number;
    daily_limit: number;
    bonus_credits: number;
    updated_at: string;
  } | null;
  subscription: {
    status: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    cancel_at_period_end: boolean;
    cancel_at: string | null;
  } | null;
  recentEvents: {
    id: string;
    event_type: string;
    model: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }[];
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data?.user) {
    return (
      <p className="text-muted-foreground py-8 text-center">User not found</p>
    );
  }

  const { user, profile, usage, subscription, recentEvents } = data;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        &larr; Back to users
      </Link>

      {/* User info */}
      <div>
        <h3 className="text-lg font-semibold">{user.email}</h3>
        <p className="text-muted-foreground text-sm">
          Signed up {new Date(user.created_at).toLocaleDateString()} &middot;
          Last sign-in{" "}
          {user.last_sign_in_at
            ? new Date(user.last_sign_in_at).toLocaleDateString()
            : "never"}
        </p>
      </div>

      {/* Cards row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {profile ? (
              <dl className="space-y-1">
                <div>
                  <dt className="text-muted-foreground text-xs">Name</dt>
                  <dd>{profile.full_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Location</dt>
                  <dd>{profile.location || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">No profile</p>
            )}
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {usage ? (
              <dl className="space-y-1">
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Today&apos;s count
                  </dt>
                  <dd>
                    {usage.count} / {usage.daily_limit}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">
                    Bonus credits
                  </dt>
                  <dd>{usage.bonus_credits ?? 0}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">No usage data</p>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {subscription ? (
              <dl className="space-y-1">
                <div>
                  <dt className="text-muted-foreground text-xs">Status</dt>
                  <dd>
                    <Badge
                      variant={
                        subscription.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {subscription.status}
                    </Badge>
                  </dd>
                </div>
                {subscription.cancel_at_period_end && (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      Cancels at
                    </dt>
                    <dd>
                      {subscription.cancel_at
                        ? new Date(subscription.cancel_at).toLocaleDateString()
                        : "End of period"}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground">Free tier</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Recent Events ({recentEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {e.event_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.model ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No events yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
