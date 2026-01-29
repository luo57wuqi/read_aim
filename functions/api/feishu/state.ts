/**
 * Cloudflare Pages Function: Feishu Drive JSON state sync.
 *
 * Endpoints (same-origin from frontend):
 * - GET  /api/feishu/state?folder_token=...&file_name=reader-state.json
 * - POST /api/feishu/state?folder_token=...&file_name=reader-state.json   (body: BackupData JSON)
 *
 * Auth strategy (Plan B):
 * - Frontend passes Feishu `user_access_token` via Authorization header:
 *   Authorization: Bearer <user_access_token>
 *
 * NOTE:
 * - This implementation uses Feishu Drive v1 APIs (list/download/upload/delete).
 * - If Feishu updates the Drive API, adjust the endpoint paths below according to docs.
 */
export interface Env {}

type FeishuCommonResp<T> = { code: number; msg: string; data: T };

const FEISHU_BASE = 'https://open.feishu.cn';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function listFolderFiles(accessToken: string, folderToken: string): Promise<any[]> {
  const res = await fetch(
    `${FEISHU_BASE}/open-apis/drive/v1/files?folder_token=${encodeURIComponent(folderToken)}&page_size=200`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Feishu list files failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as FeishuCommonResp<{ files?: any[] }>;
  if (body.code !== 0) {
    throw new Error(`Feishu list files error: ${body.code} ${body.msg}`);
  }

  return body.data?.files || [];
}

async function downloadFileContent(accessToken: string, fileToken: string): Promise<string> {
  const res = await fetch(`${FEISHU_BASE}/open-apis/drive/v1/files/${fileToken}/download`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Feishu download failed: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

async function deleteFile(accessToken: string, fileToken: string): Promise<void> {
  const res = await fetch(`${FEISHU_BASE}/open-apis/drive/v1/files/${fileToken}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Best-effort delete: log but don't throw to avoid blocking writes.
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('Feishu delete failed', res.status, res.statusText, text);
  }
}

async function uploadJsonFile(
  accessToken: string,
  folderToken: string,
  fileName: string,
  content: string,
): Promise<any> {
  const form = new FormData();
  form.set('file_name', fileName);
  form.set('parent_type', 'explorer');
  form.set('parent_token', folderToken);

  const blob = new Blob([content], { type: 'application/json; charset=utf-8' });
  // Field name "file" is commonly used by Feishu Drive upload_all API; adjust if docs differ.
  form.set('file', blob, fileName);

  const res = await fetch(`${FEISHU_BASE}/open-apis/drive/v1/files/upload_all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Feishu upload failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as FeishuCommonResp<{ file?: any }>;
  if (body.code !== 0) {
    throw new Error(`Feishu upload error: ${body.code} ${body.msg}`);
  }

  return body.data?.file;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const folderToken = url.searchParams.get('folder_token') || '';
    const fileName = url.searchParams.get('file_name') || 'reader-state.json';

    if (!folderToken) {
      return json({ ok: false, error: 'Missing folder_token' }, 400);
    }

    const authHeader = context.request.headers.get('Authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return json(
        {
          ok: false,
          error: 'Missing or invalid Authorization header. Expect "Authorization: Bearer <user_access_token>".',
        },
        401,
      );
    }
    const userAccessToken = match[1].trim();

    if (context.request.method === 'GET') {
      const files = await listFolderFiles(userAccessToken, folderToken);
      const existing = files.find((f: any) => f.name === fileName);

      if (!existing) {
        // Frontend will treat { ok:false } as "no remote file yet" and fall back to local.
        return json({ ok: false, error: 'FILE_NOT_FOUND' }, 404);
      }

      const fileToken = (existing.token || existing.file_token) as string | undefined;
      if (!fileToken) {
        return json({ ok: false, error: 'Existing file has no token field' }, 500);
      }

      const raw = await downloadFileContent(userAccessToken, fileToken);
      try {
        const parsed = JSON.parse(raw);
        return json(parsed, 200);
      } catch {
        return json({ ok: false, error: 'FILE_PARSE_ERROR', raw }, 500);
      }
    }

    if (context.request.method === 'POST') {
      const bodyText = await context.request.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        return json({ ok: false, error: 'Body must be valid JSON' }, 400);
      }

      const files = await listFolderFiles(userAccessToken, folderToken);
      const existing = files.find((f: any) => f.name === fileName);

      if (existing) {
        const fileToken = (existing.token || existing.file_token) as string | undefined;
        if (fileToken) {
          await deleteFile(userAccessToken, fileToken);
        }
      }

      await uploadJsonFile(userAccessToken, folderToken, fileName, JSON.stringify(parsed));
      return json({ ok: true }, 200);
    }

    return json({ ok: false, error: 'Method not allowed' }, 405);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
};
