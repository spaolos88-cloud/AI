import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME, getAccessPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    password?: string;
  };

  const configuredPassword = getAccessPassword();

  if (!configuredPassword) {
    return Response.json(
      { error: "ACCESS_PASSWORD is not configured." },
      { status: 500 },
    );
  }

  if (body.password !== configuredPassword) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE_NAME, configuredPassword, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      !request.url.startsWith("http://127.0.0.1") &&
      !request.url.startsWith("http://localhost"),
  });

  return Response.json({ ok: true });
}
