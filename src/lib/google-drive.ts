import { env } from "@/lib/env";

const driveApiBaseUrl = "https://www.googleapis.com/drive/v3";
const driveUploadBaseUrl = "https://www.googleapis.com/upload/drive/v3";
const folderMimeType = "application/vnd.google-apps.folder";

type PutJsonResult = {
  enabled: boolean;
  saved: boolean;
  message: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
};

function getHeaders(contentType?: string) {
  if (!env.googleDriveAccessToken) {
    return null;
  }

  return {
    Authorization: `Bearer ${env.googleDriveAccessToken}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function cleanPath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

async function findChildByName(
  parentId: string,
  name: string,
  mimeType?: string,
): Promise<DriveFile | null> {
  const headers = getHeaders();

  if (!headers) {
    return null;
  }

  const clauses = [
    `'${parentId}' in parents`,
    `name = '${escapeDriveQueryValue(name)}'`,
    "trashed = false",
  ];

  if (mimeType) {
    clauses.push(`mimeType = '${mimeType}'`);
  }

  const params = new URLSearchParams({
    q: clauses.join(" and "),
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const response = await fetch(`${driveApiBaseUrl}/files?${params}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { files?: DriveFile[] };

  return payload.files?.[0] ?? null;
}

async function createFolder(parentId: string, name: string) {
  const headers = getHeaders("application/json");

  if (!headers) {
    return null;
  }

  const response = await fetch(
    `${driveApiBaseUrl}/files?fields=id,name,mimeType,webViewLink`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        mimeType: folderMimeType,
        parents: [parentId],
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DriveFile;
}

async function ensureFolderPath(path: string) {
  const parts = cleanPath(path).split("/").filter(Boolean);
  let parentId = "root";

  for (const part of parts) {
    const existing = await findChildByName(parentId, part, folderMimeType);
    const folder = existing ?? (await createFolder(parentId, part));

    if (!folder) {
      return null;
    }

    parentId = folder.id;
  }

  return parentId;
}

function createMultipartBody(metadata: unknown, content: string, boundary: string) {
  return [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function upsertJsonFile(parentId: string, name: string, data: unknown) {
  const headers = getHeaders();

  if (!headers) {
    return null;
  }

  const existing = await findChildByName(parentId, name, "application/json");
  const boundary = `serio-${crypto.randomUUID()}`;
  const body = createMultipartBody(
    {
      name,
      mimeType: "application/json",
      ...(existing ? {} : { parents: [parentId] }),
    },
    JSON.stringify(data, null, 2),
    boundary,
  );
  const url = existing
    ? `${driveUploadBaseUrl}/files/${existing.id}?uploadType=multipart&fields=id,name,webViewLink`
    : `${driveUploadBaseUrl}/files?uploadType=multipart&fields=id,name,webViewLink`;

  const response = await fetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: {
      ...headers,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${errorText}`);
  }

  return (await response.json()) as DriveFile;
}

export function isGoogleDriveConfigured() {
  return Boolean(env.googleDriveAccessToken);
}

export async function putJsonToGoogleDrive(
  relativePath: string,
  data: unknown,
): Promise<PutJsonResult> {
  if (!isGoogleDriveConfigured()) {
    return {
      enabled: false,
      saved: false,
      message: "Google Drive storage is disabled until Google OAuth is configured.",
    };
  }

  const cleanedRelativePath = cleanPath(relativePath);
  const pathParts = cleanedRelativePath.split("/").filter(Boolean);
  const fileName = pathParts.pop();

  if (!fileName) {
    return {
      enabled: true,
      saved: false,
      message: "Google Drive save failed: missing file name.",
    };
  }

  const folderPath = cleanPath(
    [env.googleDriveRootFolder, ...pathParts].join("/"),
  );
  const parentId = await ensureFolderPath(folderPath);

  if (!parentId) {
    return {
      enabled: true,
      saved: false,
      message: `Google Drive save failed: could not create or find ${folderPath}.`,
    };
  }

  try {
    await upsertJsonFile(parentId, fileName, data);

    return {
      enabled: true,
      saved: true,
      message: `Saved to Google Drive at ${folderPath}/${fileName}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Google Drive error";

    return {
      enabled: true,
      saved: false,
      message: `Google Drive save failed: ${message}`,
    };
  }
}

export async function listKnowledgeFiles() {
  if (!isGoogleDriveConfigured()) {
    return [];
  }

  const knowledgeFolderId = await ensureFolderPath(
    `${env.googleDriveRootFolder}/Knowledge`,
  );

  if (!knowledgeFolderId) {
    return [];
  }

  const headers = getHeaders();

  if (!headers) {
    return [];
  }

  const params = new URLSearchParams({
    q: `'${knowledgeFolderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
    pageSize: "20",
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const response = await fetch(`${driveApiBaseUrl}/files?${params}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { files?: DriveFile[] };

  return payload.files ?? [];
}
