// Devuelve el commit desplegado. Nunca se cachea: post-deploy.yml lo consulta para saber si ya salió.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
