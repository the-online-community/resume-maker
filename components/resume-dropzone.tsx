"use client";

import { Cancel01Icon, FileIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";

import {
  Dropzone,
  DropZoneArea,
  DropzoneDescription,
  DropzoneFileList,
  DropzoneFileListItem,
  DropzoneFileMessage,
  DropzoneMessage,
  DropzoneRemoveFile,
  DropzoneTrigger,
  InfiniteProgress,
  useDropzone,
  type FileStatus,
} from "@/components/ui/dropzone";
import {
  deleteResume,
  getAllResumes,
  saveResume,
  type ResumeEntry,
} from "@/lib/resume-store";
import { cn } from "@/lib/utils";

export default function ResumeDropzone() {
  const [savedResumes, setSavedResumes] = useState<ResumeEntry[]>([]);

  // Load persisted resumes on mount
  useEffect(() => {
    getAllResumes().then(setSavedResumes);
  }, []);

  const dropzone = useDropzone<string>({
    onDropFile: async (file) => {
      // Save to IndexedDB
      const entry = await saveResume(file);
      setSavedResumes((prev) => [...prev, entry]);
      return { status: "success", result: entry.id };
    },
    validation: {
      accept: { "application/pdf": [".pdf"] },
      maxFiles: 10,
      maxSize: 10 * 1024 * 1024, // 10MB per file
    },
  });

  const handleRemoveSaved = useCallback(async (id: string) => {
    await deleteResume(id);
    setSavedResumes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Combine: show saved resumes that aren't currently being uploaded
  const uploadingIds = new Set(
    dropzone.fileStatuses
      .filter((f) => f.status === "success")
      .map((f) => f.result),
  );

  const persistedResumes = savedResumes.filter((r) => !uploadingIds.has(r.id));

  const hasFiles =
    dropzone.fileStatuses.length > 0 || persistedResumes.length > 0;

  return (
    <Dropzone {...dropzone}>
      <DropZoneArea className="flex-col gap-3 px-8 py-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center">
            <HugeiconsIcon
              icon={FileIcon}
              className="text-muted-foreground size-6"
            />
          </div>
          <div>
            <p className="text-sm font-medium">Drop your resumes here</p>
            <DropzoneDescription>
              PDF only · Max 10 files · Up to 10MB each
            </DropzoneDescription>
          </div>
          <DropzoneTrigger className="text-primary hover:text-primary/80 mt-1 bg-transparent px-4 py-1.5 text-sm font-medium transition-colors">
            Browse files
          </DropzoneTrigger>
        </div>
      </DropZoneArea>

      <DropzoneMessage className="mt-2" />

      {hasFiles && (
        <>
          <h2 className="mt-10 font-mono">history</h2>

          {/* Currently uploading files */}
          {dropzone.fileStatuses.length > 0 && (
            <DropzoneFileList className="mt-4 gap-2">
              {dropzone.fileStatuses.map((file) => (
                <UploadingFileItem key={file.id} file={file} />
              ))}
            </DropzoneFileList>
          )}

          {/* Previously saved resumes */}
          {persistedResumes.length > 0 && (
            <ul className="mt-2 flex flex-col gap-2">
              {persistedResumes.map((resume) => (
                <SavedResumeItem
                  key={resume.id}
                  resume={resume}
                  onRemove={handleRemoveSaved}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </Dropzone>
  );
}

function UploadingFileItem({ file }: { file: FileStatus<string, string> }) {
  return (
    <DropzoneFileListItem file={file} className="flex-row items-center gap-3">
      <div className="flex flex-1 items-start gap-3 overflow-hidden">
        <div
          className={cn(
            "mt-1.5 flex size-9 shrink-0 items-start justify-center",
          )}
        >
          <HugeiconsIcon
            icon={FileIcon}
            className={cn(
              "size-4",
              file.status === "error" ? "text-destructive" : "text-primary",
            )}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium">{file.fileName}</p>
          {file.status === "pending" && (
            <InfiniteProgress status="pending" className="h-1.5" />
          )}
          {file.status === "success" && (
            <p className="text-muted-foreground text-xs">Saved</p>
          )}
          <DropzoneFileMessage />
        </div>
      </div>

      <DropzoneRemoveFile
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </DropzoneRemoveFile>
    </DropzoneFileListItem>
  );
}

function SavedResumeItem({
  resume,
  onRemove,
}: {
  resume: ResumeEntry;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 border px-2 py-2">
      <div className="flex flex-1 items-start gap-3 overflow-hidden">
        <div className="mt-1.5 flex size-9 shrink-0 items-start justify-center">
          <HugeiconsIcon icon={FileIcon} className="text-primary size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium">{resume.fileName}</p>
          <p className="text-muted-foreground text-xs">Saved</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(resume.id)}
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-1 transition-colors"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </button>
    </li>
  );
}
