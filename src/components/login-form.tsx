"use client";

import { Lock, Loader2 } from "lucide-react";
import { type FormEvent, startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setError("Enter the access password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/session/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Access failed.");
      }

      startTransition(() => {
        router.replace(nextPath);
        router.refresh();
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Access failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="w-full max-w-md rounded-lg border border-[#d6cfbf] bg-white/90 p-6 shadow-[0_18px_40px_rgba(25,24,22,0.08)] backdrop-blur"
      onSubmit={handleSubmit}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#20251f] text-white">
          <Lock size={18} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#1b1a17]">
            Assistant Chat SA-A01
          </h1>
          <p className="text-sm text-[#69645c]">
            Private access for invited users only
          </p>
        </div>
      </div>

      <label
        className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#6d675f]"
        htmlFor="access-password"
      >
        Access Password
      </label>
      <input
        id="access-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="h-12 w-full rounded-md border border-[#d7cfbe] bg-[#fcfbf7] px-4 text-sm outline-none transition focus:border-[#1f3a34] focus:ring-2 focus:ring-[#d5e3da]"
        placeholder="Enter password"
        autoComplete="current-password"
      />

      {error ? (
        <p className="mt-3 text-sm text-[#a2351c]">{error}</p>
      ) : (
        <p className="mt-3 text-sm text-[#716b62]">
          Ask the owner for the shared password.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1f3a34] text-sm font-medium text-white transition hover:bg-[#172c27] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <Lock size={16} />
        )}
        Unlock Workspace
      </button>
    </form>
  );
}
