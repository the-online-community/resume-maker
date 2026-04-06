"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { FRAME_WIDTH } from "@/components/resume/constants";
import { ResumeContent } from "@/components/resume/resume-content";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/hooks/use-user";
import { RESUME_CSS } from "@/lib/resume/resume-styles";

interface Application {
  id: string;
  applied_at: string;
  position: string;
  company: string | null;
  platform: string | null;
  job_url: string | null;
  status: string;
  resume_data: Record<string, string> | null;
  resume_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUSES = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
] as const;

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  interviewing: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  offer: "bg-green-500/15 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  ghosted: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

// ── Editable Cell ──

function EditableCell({
  value,
  onSave,
  type = "text",
  placeholder,
  className,
}: {
  value: string;
  onSave: (val: string) => void;
  type?: "text" | "date" | "url";
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (!editing) {
    return (
      <span
        className={`block cursor-text truncate ${!value ? "text-muted-foreground italic" : ""} ${className ?? ""}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title={value || placeholder}
      >
        {type === "url" && value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline decoration-blue-600/30 hover:decoration-blue-600 dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              try {
                return new URL(value).hostname.replace("www.", "");
              } catch {
                return value;
              }
            })()}
          </a>
        ) : (
          value || placeholder || "—"
        )}
      </span>
    );
  }

  return (
    <Input
      autoFocus
      type={type === "date" ? "date" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-7 rounded-none border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
      placeholder={placeholder}
    />
  );
}

// ── Resume Preview Dialog ──

function ResumePreviewDialog({
  app,
  open,
  onOpenChange,
  onUpload,
}: {
  app: Application;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (id: string, file: File) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hasData = !!app.resume_data;
  const hasUrl = !!app.resume_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Resume — {app.position}
            {app.company ? ` at ${app.company}` : ""}
          </DialogTitle>
          <DialogDescription>
            {hasData && hasUrl
              ? "This application has both a generated resume and an uploaded PDF."
              : hasData
                ? "Generated resume preview. You can also upload a PDF."
                : hasUrl
                  ? "Uploaded PDF resume."
                  : "No resume attached. Upload a PDF below."}
          </DialogDescription>
        </DialogHeader>

        {/* Resume JSON preview */}
        {hasData && (
          <div className="overflow-hidden rounded border">
            <div className="bg-muted/50 text-muted-foreground border-b px-3 py-1.5 text-[11px] font-medium">
              Generated Resume
            </div>
            <div className="overflow-auto bg-white" style={{ maxHeight: 500 }}>
              <div
                className="resume-page origin-top-left"
                style={{
                  width: FRAME_WIDTH,
                  padding: 32,
                  transform: `scale(${Math.min(1, 680 / FRAME_WIDTH)})`,
                  transformOrigin: "top left",
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: RESUME_CSS }} />
                <ResumeContent placeholders={app.resume_data!} />
              </div>
            </div>
          </div>
        )}

        {/* PDF preview */}
        {hasUrl && (
          <div className="overflow-hidden rounded border">
            <div className="bg-muted/50 text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[11px] font-medium">
              <span>Uploaded PDF</span>
              <a
                href={app.resume_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 underline dark:text-blue-400"
              >
                Open in new tab
              </a>
            </div>
            <iframe
              src={app.resume_url!}
              className="w-full border-0"
              style={{ height: 500 }}
              title="Resume PDF"
            />
          </div>
        )}

        {/* Upload section */}
        <div className="flex items-center gap-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setUploading(true);
                try {
                  await onUpload(app.id, file);
                } finally {
                  setUploading(false);
                }
                e.target.value = "";
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : hasUrl ? "Replace PDF" : "Upload PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Row Form ──

function AddRowForm({
  onAdd,
  onCancel,
  adding,
}: {
  onAdd: (app: Partial<Application>) => void;
  onCancel: () => void;
  adding?: boolean;
}) {
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");
  const [platform, setPlatform] = useState("");
  const [jobUrl, setJobUrl] = useState("");

  const handleSubmit = () => {
    if (!position.trim()) return;
    onAdd({
      position: position.trim(),
      company: company.trim() || null,
      platform: platform.trim() || null,
      job_url: jobUrl.trim() || null,
    });
    setPosition("");
    setCompany("");
    setPlatform("");
    setJobUrl("");
  };

  return (
    <tr className="bg-muted/30 border-b">
      <td className="text-muted-foreground px-3 py-2">—</td>
      <td className="px-3 py-2">
        <span className="text-muted-foreground text-xs">Today</span>
      </td>
      <td className="px-3 py-2">
        <Input
          autoFocus
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Position"
          className="h-7 rounded-none border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          className="h-7 rounded-none border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="LinkedIn, Indeed..."
          className="h-7 rounded-none border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          placeholder="https://..."
          className="h-7 rounded-none border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
      </td>
      <td className="px-3 py-2">
        <Badge variant="outline" className="text-[10px]">
          applied
        </Badge>
      </td>
      <td className="px-3 py-2">
        <span className="text-muted-foreground text-xs italic">—</span>
      </td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={handleSubmit}
            disabled={adding}
          >
            {adding ? "Adding..." : "Add"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-6 px-2 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ──

export default function ApplicationsPage() {
  const { user, loading: authLoading } = useUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRow, setShowAddRow] = useState(false);
  const [previewApp, setPreviewApp] = useState<Application | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = (await res.json()) as Application[];
        setApplications(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchApplications();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, fetchApplications]);

  const handleAdd = async (app: Partial<Application>) => {
    setAdding(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      });
      if (res.ok) {
        const created = (await res.json()) as Application;
        setApplications((prev) => [created, ...prev]);
        setShowAddRow(false);
      }
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: string, field: string, value: string) => {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Application;
        setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
      }
    } catch {
      // silently fail
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDelete = async (id: string) => {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // silently fail
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleUpload = async (id: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/applications/${id}/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const updated = (await res.json()) as Application;
        setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
        // Update the preview dialog if it's open
        if (previewApp?.id === id) setPreviewApp(updated);
      }
    } catch {
      // silently fail
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto flex flex-1 flex-col px-4 pt-6 pb-12">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-lg font-bold">My Applications</h1>
          <ThemeToggle />
        </div>
        <div className="mt-6 overflow-x-auto rounded border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                {["#", "Date", "Position", "Company", "Platform", "Link", "Status", "Resume", "Notes", ""].map((h) => (
                  <th key={h} className="text-muted-foreground px-3 py-2.5 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12">
        <p className="text-muted-foreground text-sm">
          Please sign in to track your applications.
        </p>
        <Link href="/" className="mt-4 text-sm underline">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 pt-6 pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            ← Back
          </Link>
          <h1 className="font-mono text-lg font-bold">My Applications</h1>
          <Badge variant="outline" className="font-mono text-[10px]">
            {applications.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAddRow(true)}
            disabled={showAddRow}
          >
            + Add Application
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-muted-foreground w-[40px] px-3 py-2.5 text-left font-medium">
                #
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Date
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Position
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Company
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Platform
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Link
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Status
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Resume
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium">
                Notes
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-left font-medium" />
            </tr>
          </thead>
          <tbody>
            {showAddRow && (
              <AddRowForm
                onAdd={handleAdd}
                onCancel={() => setShowAddRow(false)}
                adding={adding}
              />
            )}
            {applications.map((app, index) => (
              <tr
                key={app.id}
                className={`group border-b transition-colors hover:bg-muted/30 ${busyIds.has(app.id) ? "pointer-events-none opacity-50" : ""}`}
              >
                <td className="text-muted-foreground w-[40px] px-3 py-2 tabular-nums">
                  {applications.length - index}
                </td>
                <td className="w-[100px] px-3 py-2">
                  <EditableCell
                    value={app.applied_at}
                    type="date"
                    onSave={(v) => handleUpdate(app.id, "applied_at", v)}
                  />
                </td>
                <td className="min-w-[150px] px-3 py-2">
                  <EditableCell
                    value={app.position}
                    placeholder="Position"
                    onSave={(v) => handleUpdate(app.id, "position", v)}
                    className="font-medium"
                  />
                </td>
                <td className="min-w-[120px] px-3 py-2">
                  <EditableCell
                    value={app.company || ""}
                    placeholder="Company"
                    onSave={(v) => handleUpdate(app.id, "company", v)}
                  />
                </td>
                <td className="min-w-[100px] px-3 py-2">
                  <EditableCell
                    value={app.platform || ""}
                    placeholder="Platform"
                    onSave={(v) => handleUpdate(app.id, "platform", v)}
                  />
                </td>
                <td className="min-w-[100px] px-3 py-2">
                  <EditableCell
                    value={app.job_url || ""}
                    type="url"
                    placeholder="URL"
                    onSave={(v) => handleUpdate(app.id, "job_url", v)}
                  />
                </td>
                <td className="w-[130px] px-3 py-2">
                  <Select
                    value={app.status}
                    onValueChange={(v) => handleUpdate(app.id, "status", v)}
                  >
                    <SelectTrigger className="h-6 w-fit border-none bg-transparent px-0 text-[11px] shadow-none">
                      <SelectValue>
                        <Badge
                          variant="outline"
                          className={`border-none text-[10px] capitalize ${STATUS_COLORS[app.status] || ""}`}
                        >
                          {app.status}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="w-[80px] px-3 py-2">
                  <button
                    type="button"
                    className="hover:text-foreground cursor-pointer text-xs transition-colors"
                    onClick={() => setPreviewApp(app)}
                  >
                    {app.resume_data || app.resume_url ? (
                      <span className="text-blue-600 underline decoration-blue-600/30 hover:decoration-blue-600 dark:text-blue-400">
                        View
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </button>
                </td>
                <td className="min-w-[150px] px-3 py-2">
                  <EditableCell
                    value={app.notes || ""}
                    placeholder="Notes"
                    onSave={(v) => handleUpdate(app.id, "notes", v)}
                  />
                </td>
                <td className="w-[50px] px-3 py-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                    disabled={busyIds.has(app.id)}
                    onClick={() => handleDelete(app.id)}
                  >
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {applications.length === 0 && !showAddRow && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">
              No applications tracked yet.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowAddRow(true)}
            >
              Add your first application
            </Button>
          </div>
        )}
      </div>

      {/* Resume preview dialog */}
      {previewApp && (
        <ResumePreviewDialog
          app={previewApp}
          open={!!previewApp}
          onOpenChange={(open) => !open && setPreviewApp(null)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}
