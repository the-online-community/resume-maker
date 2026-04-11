"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QuotaRequest {
  id: string;
  user_id: string;
  user_email: string;
  reason: string;
  status: string;
  granted_credits: number | null;
  created_at: string;
}

export default function AdminQuotaRequestsPage() {
  const [requests, setRequests] = useState<QuotaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [bonusInputs, setBonusInputs] = useState<Record<string, string>>({});

  const fetchRequests = (s: string) => {
    setLoading(true);
    fetch(`/api/admin/quota-requests?status=${s}`)
      .then((r) => r.json())
      .then((data) => setRequests(data.requests ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests(status);
  }, [status]);

  const handleAction = async (
    id: string,
    action: "approve" | "deny",
  ) => {
    setProcessing(id);
    try {
      const bonusCredits = Number(bonusInputs[id] || "5") || 5;
      const res = await fetch("/api/admin/quota-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, bonusCredits }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  {status === "pending" && (
                    <>
                      <TableHead className="text-center">Credits</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </>
                  )}
                  {status !== "pending" && (
                    <>
                      <TableHead>Status</TableHead>
                      {status === "approved" && (
                        <TableHead className="text-center">Credits Given</TableHead>
                      )}
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-40 truncate">
                      {r.user_email}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-60 truncate">
                      {r.reason || "No reason provided"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    {status === "pending" && (
                      <>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={bonusInputs[r.id] ?? "5"}
                            onChange={(e) =>
                              setBonusInputs((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                            className="mx-auto h-7 w-16 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(r.id, "approve")}
                              disabled={processing === r.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(r.id, "deny")}
                              disabled={processing === r.id}
                            >
                              Deny
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                    {status !== "pending" && (
                      <>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "approved" ? "default" : "secondary"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        {status === "approved" && (
                          <TableCell className="text-center tabular-nums font-medium">
                            {r.granted_credits != null ? `+${r.granted_credits}` : "—"}
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={status === "pending" ? 5 : status === "approved" ? 5 : 4}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No {status} requests
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
