import { google } from "googleapis";

/**
 * Create an auth client using the user's Google OAuth access token.
 */
function getAuth(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

/**
 * Copy a Google Docs template to create a new document in the user's Drive.
 */
export async function copyTemplate(
  accessToken: string,
  templateDocId: string,
  title: string,
): Promise<string> {
  const auth = getAuth(accessToken);
  const drive = google.drive({ version: "v3", auth });

  const copy = await drive.files.copy({
    fileId: templateDocId,
    requestBody: {
      name: title,
    },
  });

  const newDocId = copy.data.id;
  if (!newDocId) {
    throw new Error("Failed to copy template");
  }

  return newDocId;
}

/**
 * Replace all {{PLACEHOLDER}} markers in a Google Doc with actual values.
 */
export async function populateDoc(
  accessToken: string,
  docId: string,
  placeholders: Record<string, string>,
): Promise<void> {
  const auth = getAuth(accessToken);
  const docs = google.docs({ version: "v1", auth });

  const requests = Object.entries(placeholders).map(([key, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${key}}}`,
        matchCase: true,
      },
      replaceText: value,
    },
  }));

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests,
      },
    });
  }
}

/**
 * Get the edit URL for a Google Doc.
 */
export function getDocUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/edit`;
}
