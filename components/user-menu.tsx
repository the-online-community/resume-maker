"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({
  user,
  usageCount,
  maxAttempts,
  isSubscribed,
  cancelAt,
  resetsAt,
}: {
  user: User;
  usageCount: number;
  maxAttempts: number;
  isSubscribed: boolean;
  cancelAt: string | null;
  resetsAt?: string;
}) {
  const email = user.email || "";
  const fullName =
    user.user_metadata?.full_name || user.user_metadata?.name || "";
  const avatarUrl =
    user.user_metadata?.picture || user.user_metadata?.avatar_url || "";
  const initials = (fullName || email).charAt(0).toUpperCase();
  const progress = (usageCount / maxAttempts) * 100;

  // Request More state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestPending, setRequestPending] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Invite a Friend state
  const [showReferral, setShowReferral] = useState(false);
  const [referralData, setReferralData] = useState<{
    code: string;
    referralUrl: string;
    completedCount: number;
    bonusEarned: number;
  } | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check for pending quota request on mount
  useEffect(() => {
    if (isSubscribed) return;
    fetch("/api/quota-request")
      .then((res) => res.json())
      .then((data: { hasPending?: boolean }) => {
        setRequestPending(!!data.hasPending);
      })
      .catch(() => {});
  }, [isSubscribed]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleManagePlan = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  };

  const handleSubmitRequest = useCallback(async () => {
    setRequestSubmitting(true);
    try {
      const res = await fetch("/api/quota-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: requestReason }),
      });
      if (res.ok) {
        setRequestPending(true);
        setShowRequestForm(false);
        setRequestReason("");
      }
    } catch {
      // silently fail
    } finally {
      setRequestSubmitting(false);
    }
  }, [requestReason]);

  const handleShowReferral = useCallback(async () => {
    if (referralData) {
      setShowReferral(!showReferral);
      return;
    }
    setReferralLoading(true);
    setShowReferral(true);
    try {
      const res = await fetch("/api/referral");
      const data = await res.json();
      setReferralData(data);
    } catch {
      // silently fail
    } finally {
      setReferralLoading(false);
    }
  }, [referralData, showReferral]);

  const handleCopyReferral = useCallback(async () => {
    if (!referralData) return;
    await navigator.clipboard.writeText(referralData.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralData]);

  // Format reset time
  const resetTimeLabel = resetsAt
    ? new Date(resetsAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "midnight UTC";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted flex cursor-pointer items-center gap-2 p-2 transition-colors"
        >
          <Avatar key={avatarUrl} className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt={email} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {/* Subscription badge or usage progress */}
          <div className="hidden sm:block">
            {isSubscribed ? (
              <p className="text-[10px] font-semibold leading-none text-violet-500">
                Pro
              </p>
            ) : (
              <>
                <p className="text-muted-foreground/80 text-[10px] leading-none">
                  {usageCount}/{maxAttempts} today
                </p>
                <div className="bg-muted mt-1 h-1.5 w-16 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 pt-4" align="end">
        <div className="mb-3 space-y-0.5 px-2">
          {fullName && (
            <p className="text-sm leading-none font-medium">{fullName}</p>
          )}
          <p className="text-muted-foreground text-xs">{email}</p>
        </div>
        {/* Plan details */}
        <div className="border-t px-2 py-3">
          {isSubscribed ? (
            <div className="space-y-1">
              <p className="text-xs font-medium">
                Pro Plan{" "}
                <span className="text-violet-500">· $5/mo</span>
              </p>
              {cancelAt ? (
                <p className="text-[11px] text-amber-500">
                  Cancels on{" "}
                  {new Date(cancelAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  Unlimited resume tailoring
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Free Plan</p>
              <p className="text-muted-foreground text-[11px]">
                {usageCount}/{maxAttempts} resumes used today
              </p>
              <p className="text-muted-foreground/70 text-[10px]">
                Resets at {resetTimeLabel}
              </p>

              {/* Request More */}
              {!showRequestForm && (
                <button
                  type="button"
                  className="text-primary cursor-pointer text-[11px] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => !requestPending && setShowRequestForm(true)}
                  disabled={requestPending}
                >
                  {requestPending ? "Request pending ✓" : "Request more"}
                </button>
              )}

              {showRequestForm && (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="border-input bg-background w-full border px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Why do you need more? (optional)"
                    rows={2}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={handleSubmitRequest}
                      disabled={requestSubmitting}
                    >
                      {requestSubmitting ? "Sending..." : "Send Request"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px]"
                      onClick={() => {
                        setShowRequestForm(false);
                        setRequestReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Invite a Friend */}
              <div className="pt-1">
                <button
                  type="button"
                  className="text-primary cursor-pointer text-[11px] hover:underline"
                  onClick={handleShowReferral}
                >
                  {showReferral ? "Hide referral link" : "Invite a friend (+5/day)"}
                </button>

                {showReferral && (
                  <div className="mt-2 space-y-2">
                    {referralLoading ? (
                      <div className="flex items-center gap-1.5">
                        <div className="border-primary size-3 animate-spin rounded-full border-2 border-t-transparent" />
                        <span className="text-muted-foreground text-[10px]">Loading...</span>
                      </div>
                    ) : referralData ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={referralData.referralUrl}
                            className="border-input bg-muted flex-1 border px-2 py-1 text-[10px]"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 shrink-0 text-[10px]"
                            onClick={handleCopyReferral}
                          >
                            {copied ? "Copied!" : "Copy"}
                          </Button>
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          Share this link. When someone signs up, you get +5 resumes/day.
                        </p>
                        {referralData.completedCount > 0 && (
                          <p className="text-[10px] font-medium text-green-600">
                            {referralData.completedCount} referral{referralData.completedCount !== 1 ? "s" : ""} · +{referralData.bonusEarned}/day earned
                          </p>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {isSubscribed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleManagePlan}
          >
            Manage plan
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          asChild
        >
          <Link href="/profile">Profile</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          asChild
        >
          <Link href="/applications">My Applications</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-500"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}
