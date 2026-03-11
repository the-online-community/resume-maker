import { openDB, type DBSchema } from "idb";

interface ResumeEntry {
  id: string;
  fileName: string;
  file: Blob;
  uploadedAt: number;
}

interface SavedResumeEntry {
  id: string;
  name: string;
  placeholders: Record<string, string>;
  savedAt: number;
}

interface ResumeDB extends DBSchema {
  resumes: {
    key: string;
    value: ResumeEntry;
  };
  savedResumes: {
    key: string;
    value: SavedResumeEntry;
  };
}

const DB_NAME = "resume-maker";
const DB_VERSION = 2;

function getDB() {
  return openDB<ResumeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("resumes")) {
        db.createObjectStore("resumes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("savedResumes")) {
        db.createObjectStore("savedResumes", { keyPath: "id" });
      }
    },
  });
}

// ── Uploaded resumes (PDF files) ──

export async function saveResume(file: File): Promise<ResumeEntry> {
  const db = await getDB();
  const entry: ResumeEntry = {
    id: crypto.randomUUID(),
    fileName: file.name,
    file: new Blob([file], { type: file.type }),
    uploadedAt: Date.now(),
  };
  await db.put("resumes", entry);
  return entry;
}

export async function getAllResumes(): Promise<ResumeEntry[]> {
  const db = await getDB();
  return db.getAll("resumes");
}

export async function deleteResume(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("resumes", id);
}

export async function clearAllResumes(): Promise<void> {
  const db = await getDB();
  await db.clear("resumes");
}

// ── Saved (generated) resumes ──

export async function saveGeneratedResume(
  name: string,
  placeholders: Record<string, string>,
): Promise<SavedResumeEntry> {
  const db = await getDB();
  const entry: SavedResumeEntry = {
    id: crypto.randomUUID(),
    name,
    placeholders,
    savedAt: Date.now(),
  };
  await db.put("savedResumes", entry);
  return entry;
}

export async function getAllSavedResumes(): Promise<SavedResumeEntry[]> {
  const db = await getDB();
  return db.getAll("savedResumes");
}

export async function deleteSavedResume(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("savedResumes", id);
}

export async function clearAllSavedResumes(): Promise<void> {
  const db = await getDB();
  await db.clear("savedResumes");
}

export type { ResumeEntry, SavedResumeEntry };
