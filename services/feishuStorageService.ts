import { BackupData } from '../types';

/**
 * Feishu Drive sync is implemented via Cloudflare Pages Functions (same origin).
 * - GET  /api/feishu/state  -> returns BackupData JSON (or {ok:false,...})
 * - POST /api/feishu/state  -> accepts BackupData JSON and persists it
 *
 * Auth strategy (Plan B):
 * - Frontend passes Feishu `user_access_token` via Authorization header to the Function.
 */
export const feishuStorageApi = {
  pullState: async (
    folderToken: string,
    fileName: string,
    userAccessToken?: string
  ): Promise<BackupData | null> => {
    if (!userAccessToken) {
      throw new Error('Feishu pull failed: missing user_access_token');
    }

    const url = `/api/feishu/state?folder_token=${encodeURIComponent(folderToken)}&file_name=${encodeURIComponent(
      fileName
    )}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      if (!res.ok) {
        // 404 FILE_NOT_FOUND is expected when file doesn't exist yet
        if (res.status === 404) {
          return null;
        }
        const errorText = await res.text().catch(() => '');
        let errorMsg = `Feishu pull failed: ${res.status} ${res.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg += ` - ${errorJson.error || errorText}`;
        } catch {
          errorMsg += ` - ${errorText || 'No error details'}`;
        }
        throw new Error(errorMsg);
      }
      
      const data = await res.json();
      // Functions may return { ok: false, error: ... }
      if (data && data.ok === false) return null;
      return data as BackupData;
    } catch (e: any) {
      // Enhanced error message for "Failed to fetch"
      if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
        throw new Error(
          `Network error: Cannot reach /api/feishu/state. ` +
          `Please check: 1) Cloudflare Function is deployed, 2) Route is correct, 3) Network connection. ` +
          `Original: ${e?.message || String(e)}`
        );
      }
      throw e;
    }
  },

  pushState: async (
    folderToken: string,
    fileName: string,
    state: BackupData,
    userAccessToken?: string
  ): Promise<boolean> => {
    if (!userAccessToken) {
      throw new Error('Feishu push failed: missing user_access_token');
    }

    const url = `/api/feishu/state?folder_token=${encodeURIComponent(folderToken)}&file_name=${encodeURIComponent(
      fileName
    )}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(state),
        // Allow the request to continue during page close on supporting browsers
        keepalive: true,
      } as any);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let errorMsg = `Feishu push failed: ${res.status} ${res.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg += ` - ${errorJson.error || errorText}`;
        } catch {
          errorMsg += ` - ${errorText || 'No error details'}`;
        }
        throw new Error(errorMsg);
      }
      
      const data = await res.json().catch(() => ({}));
      if (data?.ok === false) {
        throw new Error(`Feishu push failed: ${data.error || 'Unknown error'}`);
      }
      return true;
    } catch (e: any) {
      // Enhanced error message for "Failed to fetch"
      if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
        throw new Error(
          `Network error: Cannot reach /api/feishu/state. ` +
          `Please check: 1) Cloudflare Function is deployed, 2) Route is correct, 3) Network connection. ` +
          `Original: ${e?.message || String(e)}`
        );
      }
      throw e;
    }
  },
};

