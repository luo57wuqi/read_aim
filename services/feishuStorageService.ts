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

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });

    if (!res.ok) throw new Error(`Feishu pull failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    // Functions may return { ok: false, error: ... }
    if (data && data.ok === false) return null;
    return data as BackupData;
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

    if (!res.ok) throw new Error(`Feishu push failed: ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => ({}));
    return data?.ok !== false;
  },
};

