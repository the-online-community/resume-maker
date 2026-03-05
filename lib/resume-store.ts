import { openDB, type DBSchema } from "idb";

interface ResumeEntry {
  id: string;
  fileName: string;
  file: Blob;
  uploadedAt: number;
}

interface ResumeDB extends DBSchema {
  resumes: {
    key: string;
    value: ResumeEntry;
  };
}

const DB_NAME = "resume-maker";
const DB_VERSION = 1;

function getDB() {
  return openDB<ResumeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("resumes")) {
        db.createObjectStore("resumes", { keyPath: "id" });
      }
    },
  });
}

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

export type { ResumeEntry };
