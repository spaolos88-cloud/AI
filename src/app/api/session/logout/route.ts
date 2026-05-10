import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);

  return Response.json({ ok: true });
}
