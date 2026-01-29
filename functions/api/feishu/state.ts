/**
 * Cloudflare Pages Function: Feishu Drive JSON state sync.
 *
 * Endpoints:
 * - GET  /api/feishu/state?folder_token=...&file_name=reader-state.json
 * - POST /api/feishu/state?folder_token=...&file_name=reader-state.json   (body: BackupData JSON)
 *
 * Auth strategy (MVP):
 * - Uses tenant_access_token (internal app) from FEISHU_APP_ID / FEISHU_APP_SECRET.
 *
 * IMPORTANT:
 * - If your target folder is in a user's personal drive, tenant token may NOT have access.
 *   In that case, upgrade this function to OAuth user_access_token.
 */
export interface Env {
  FEISHU_APP_ID: string;
  FEISHU_APP_SECRET: string;
}

type FeishuTokenResp = { code: number; msg: string; tenant_access_token?: string; expire?: number };

async function getTenantAccessToken(env: Env): Promise<string> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
  });
  if (!res.ok) throw new Error(`Failed to get tenant_access_token: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as FeishuTokenResp;
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`Failed to get tenant_access_token: ${data.code} ${data.msg}`);
  }
  return data.tenant_access_token;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const folderToken = url.searchParams.get('folder_token') || '';
    const fileName = url.searchParams.get('file_name') || 'reader-state.json';

    if (!folderToken) {
      return json({ ok: false, error: 'Missing folder_token' }, 400);
    }

    const tenantToken = await getTenantAccessToken(context.env);

    // NOTE:
    // The exact Drive v1 endpoints for:
    // - listing a folder's children
    // - downloading a file's content
    // - uploading a new file into a folder
    // - deleting a file
    // depend on Feishu OpenAPI "drive/v1" specs.
    //
    // This MVP returns a clear error if the integration isn't fully configured yet.
    // Once you confirm the exact API endpoints your tenant has access to, replace the TODOs.

    if (context.request.method === 'GET') {
      return json({
        ok: false,
        error:
          'Feishu Drive API endpoints not finalized in code yet. Please confirm Drive v1 list/download/upload/delete endpoints OR switch to user_access_token OAuth if this is personal drive.',
        hint: {
          folder_token: folderToken,
          file_name: fileName,
          auth: 'tenant_access_token',
          token_present: Boolean(tenantToken),
        },
      });
    }

    if (context.request.method === 'POST') {
      // Validate JSON body early (so client gets useful error)
      const bodyText = await context.request.text();
      try {
        JSON.parse(bodyText);
      } catch {
        return json({ ok: false, error: 'Body must be valid JSON' }, 400);
      }

      return json({
        ok: false,
        error:
          'Feishu Drive API endpoints not finalized in code yet. This endpoint is a stub. Next step: implement upload + delete-old strategy using Drive v1.',
        hint: {
          folder_token: folderToken,
          file_name: fileName,
          auth: 'tenant_access_token',
          token_present: Boolean(tenantToken),
        },
      });
    }

    return json({ ok: false, error: 'Method not allowed' }, 405);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
};


