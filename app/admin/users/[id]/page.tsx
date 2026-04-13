"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    avatar_url: string | null;
    full_name: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  };
  profile: {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
    skills: Record<string, string[]>;
    experience: { title: string; company: string; location?: string; start_date?: string; end_date?: string }[];
    education: { degree: string; institution: string; start_year?: string; year?: string }[];
    projects: { name: string; stack?: string; role?: string }[];
    certifications: { name: string; issuer?: string; date?: string }[];
    languages: { language: string; proficiency: string }[];
    contact_fields: { id: string; label: string; value: string; visible: boolean }[];
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
      <div className="flex items-center gap-3">
        <Avatar data-size="lg">
          <AvatarImage src={user.avatar_url ?? undefined} alt={user.email} />
          <AvatarFallback>
            {(user.full_name || user.email).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold">
            {user.full_name || user.email}
          </h3>
          {user.full_name && (
            <p className="text-muted-foreground text-sm">{user.email}</p>
          )}
          <p className="text-muted-foreground text-sm">
            Signed up {new Date(user.created_at).toLocaleDateString()} &middot;
            Last sign-in{" "}
            {user.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleDateString()
              : "never"}
          </p>
        </div>
      </div>

      {/* Cards row */}
      <div className="grid gap-4 md:grid-cols-2">
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
      {/* Profile data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Profile Data</CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-5 text-sm">
              {/* Contact */}
              <div>
                <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                  Contact
                </h4>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {profile.contact_fields?.filter((f) => f.value).map((f) => (
                    <div key={f.id}>
                      <span className="text-muted-foreground text-xs">{f.label}: </span>
                      <span>{f.value}</span>
                    </div>
                  ))}
                  {(!profile.contact_fields?.length) && (
                    <>
                      {profile.email && <div><span className="text-muted-foreground text-xs">Email: </span>{profile.email}</div>}
                      {profile.phone && <div><span className="text-muted-foreground text-xs">Phone: </span>{profile.phone}</div>}
                      {profile.location && <div><span className="text-muted-foreground text-xs">Location: </span>{profile.location}</div>}
                      {profile.linkedin && <div><span className="text-muted-foreground text-xs">LinkedIn: </span>{profile.linkedin}</div>}
                      {profile.github && <div><span className="text-muted-foreground text-xs">GitHub: </span>{profile.github}</div>}
                    </>
                  )}
                </div>
              </div>

              {/* Skills */}
              {profile.skills && Object.keys(profile.skills).length > 0 && (
                <div>
                  <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                    Skills
                  </h4>
                  <div className="space-y-1">
                    {Object.entries(profile.skills).map(([category, skills]) => (
                      skills.length > 0 && (
                        <div key={category}>
                          <span className="text-muted-foreground text-xs">{category}: </span>
                          <span>{skills.join(", ")}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {profile.experience?.length > 0 && (
                <div>
                  <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                    Experience ({profile.experience.length})
                  </h4>
                  <div className="space-y-2">
                    {profile.experience.map((e, i) => (
                      <div key={i} className="border-l-2 pl-3">
                        <div className="font-medium">{e.title}</div>
                        <div className="text-muted-foreground text-xs">
                          {e.company}
                          {e.location ? ` \u00b7 ${e.location}` : ""}
                          {e.start_date || e.end_date
                            ? ` \u00b7 ${e.start_date ?? ""} \u2013 ${e.end_date ?? "Present"}`
                            : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {profile.education?.length > 0 && (
                <div>
                  <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                    Education ({profile.education.length})
                  </h4>
                  <div className="space-y-1">
                    {profile.education.map((e, i) => (
                      <div key={i}>
                        <span className="font-medium">{e.degree}</span>
                        <span className="text-muted-foreground">
                          {e.institution ? `, ${e.institution}` : ""}
                          {e.start_year || e.year
                            ? ` (${[e.start_year, e.year].filter(Boolean).join(" \u2013 ")})`
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {profile.projects?.length > 0 && (
                <div>
                  <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                    Projects ({profile.projects.length})
                  </h4>
                  <div className="space-y-1">
                    {profile.projects.map((p, i) => (
                      <div key={i}>
                        <span className="font-medium">{p.name}</span>
                        {p.role && <span className="text-muted-foreground"> ({p.role})</span>}
                        {p.stack && <span className="text-muted-foreground text-xs"> \u00b7 {p.stack}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {profile.certifications?.length > 0 && (
                <div>
                  <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                    Certifications ({profile.certifications.length})
                  </h4>
                  <div className="space-y-1">
                    {profile.certifications.map((c, i) => (
                      <div key={i}>
                        <span className="font-medium">{c.name}</span>
                        {c.issuer && <span className="text-muted-foreground"> \u2014 {c.issuer}</span>}
                        {c.date && <span className="text-muted-foreground text-xs"> ({c.date})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {profile.languages?.length > 0 && (
                <div>
                  <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                    Languages
                  </h4>
                  <div>
                    {profile.languages.map((l) => `${l.language} (${l.proficiency})`).join(", ")}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No profile data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
