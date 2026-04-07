import { openDB, type DBSchema } from "idb";

interface SavedResumeEntry {
  id: string;
  name: string;
  placeholders: Record<string, string>;
  savedAt: number;
}

interface ResumeDB extends DBSchema {
  savedResumes: {
    key: string;
    value: SavedResumeEntry;
  };
}

const DB_NAME = "resume-maker";
const DB_VERSION = 3;

function getDB() {
  return openDB<ResumeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Clean up old "resumes" store if it exists (uploaded PDFs — no longer used)
      if ((db.objectStoreNames as DOMStringList).contains("resumes")) {
        (db as unknown as IDBDatabase).deleteObjectStore("resumes");
      }
      if (!db.objectStoreNames.contains("savedResumes")) {
        db.createObjectStore("savedResumes", { keyPath: "id" });
      }
    },
  });
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

export type { SavedResumeEntry };
