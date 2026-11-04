import { api } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return api(new URL(request.url), (await params).path);
}
