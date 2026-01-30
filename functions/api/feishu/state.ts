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
  // Method: Use upload_all directly with minimal required parameters
  // According to Feishu API docs, upload_all requires:
  // - file_name (or name): the file name
  // - parent_type: "explorer" for folder
  // - parent_token: the folder token
  // - file: the file content as binary
  
  const blob = new Blob([content], { type: 'application/json' });
  
  // According to Feishu API documentation, upload_all requires:
  // - file_name: the file name
  // - parent_type: "explorer" for folder
  // - parent_node: the folder token (NOT parent_token!)
  // - size: file size in bytes
  // - file: the file content as binary
  
  const fileSize = blob.size;
  
  const form = new FormData();
  form.append('file_name', fileName);
  form.append('parent_type', 'explorer');
  form.append('parent_node', folderToken); // Correct parameter name from Feishu API docs!
  form.append('size', fileSize.toString());
  form.append('file', blob, fileName);

  const res = await fetch(`${FEISHU_BASE}/open-apis/drive/v1/files/upload_all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  const responseText = await res.text();
  let body: FeishuCommonResp<{ file_token?: string; file?: any }>;
  
  try {
    body = JSON.parse(responseText) as FeishuCommonResp<{ file_token?: string; file?: any }>;
  } catch (parseError) {
    throw new Error(
      `Feishu upload failed: ${res.status} ${res.statusText}. ` +
      `Response (first 500 chars): ${responseText.substring(0, 500)}`
    );
  }

  if (body.code !== 0) {
    throw new Error(
      `Feishu upload API error: code=${body.code}, msg=${body.msg}. ` +
      `Full response: ${responseText}`
    );
  }

  if (!res.ok) {
    throw new Error(`Feishu upload HTTP error: ${res.status} ${res.statusText}`);
  }

  // Return file_token or file object
  return body.data?.file_token ? { token: body.data.file_token } : body.data?.file;
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

      try {
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
      } catch (uploadError: any) {
        // Return detailed error for debugging
        return json(
          {
            ok: false,
            error: uploadError?.message || String(uploadError),
            details: 'Check Cloudflare Function logs for Feishu API response details',
          },
          500,
        );
      }
    }

    return json({ ok: false, error: 'Method not allowed' }, 405);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
};
