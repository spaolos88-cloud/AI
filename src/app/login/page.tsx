import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams?.next?.startsWith("/")
    ? resolvedSearchParams.next
    : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f1ead9,transparent_45%),linear-gradient(180deg,#f7f3eb_0%,#efe8db_100%)] px-6 py-10">
      <div className="w-full max-w-5xl rounded-[28px] border border-[#ded5c4] bg-[#f8f4ec]/70 p-4 shadow-[0_30px_80px_rgba(36,32,24,0.08)] md:p-8">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <section className="rounded-[24px] bg-[#23342f] px-7 py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b6c8bc]">
              Protected Workspace
            </p>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight">
              Shared AI chat for internal use.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#d8e2dc]">
              This workspace is live-ready and protected by a server-side access
              password. Only authenticated visitors can open the app or call the
              chat endpoint.
            </p>
          </section>

          <div className="flex justify-center">
            <LoginForm nextPath={nextPath} />
          </div>
        </div>
      </div>
    </main>
  );
}
