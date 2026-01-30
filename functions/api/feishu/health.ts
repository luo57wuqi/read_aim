/**
 * Health check endpoint for Feishu sync function.
 * GET /api/feishu/health
 */
export interface Env {}

export const onRequest: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Feishu sync function is deployed and working',
      timestamp: Date.now(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
};

