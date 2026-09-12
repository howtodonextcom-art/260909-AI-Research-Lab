import { handleDataRefresh } from "@/lib/data/refresh-handler";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON body không hợp lệ." }, { status: 400 });
  }

  const result = await handleDataRefresh((body ?? {}) as Parameters<typeof handleDataRefresh>[0]);
  return Response.json(result);
}
