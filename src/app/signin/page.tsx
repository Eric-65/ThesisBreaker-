import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authProviders, getSession, isAuthEnabled } from "@/auth";
import { signInWithEmail, signInWithGoogle } from "@/app/actions/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", description: "Save your ThesisBreaker history across devices." };

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "That email is already linked to another sign-in method. Use the one you used before.",
  Verification: "That sign-in link has expired or was already used. Request a new one.",
  Configuration: "Sign-in is misconfigured on this server.",
  AccessDenied: "Sign-in was cancelled.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; error?: string; next?: string }>;
}) {
  const { check, error, next } = await searchParams;
  if (await getSession()) redirect("/history");
  const enabled = isAuthEnabled();
  const providers = authProviders();
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/history";

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
      <p className="eyebrow">Optional</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        <span className="metal-text">Save your history</span>
      </h1>
      <p className="mt-3 text-muted">
        You can use ThesisBreaker without an account. Signing in keeps the stress tests you already ran in this browser and
        makes them available on any device.
      </p>

      <div className="glass mt-8 space-y-5 p-5 sm:p-6">
        {!enabled ? (
          <p className="text-sm text-muted">Sign-in is not configured on this server yet. Your history stays in this browser.</p>
        ) : check ? (
          <div role="status" className="text-sm">
            <p className="font-semibold text-ink">Check your inbox</p>
            <p className="mt-1 text-muted">We sent you a sign-in link. Open it in this browser to keep this browser&apos;s history.</p>
          </div>
        ) : (
          <>
            {error && (
              <p role="alert" className="rounded-lg border border-block/40 bg-block/10 p-3 text-sm text-ink">
                {ERRORS[error] ?? "Sign-in failed. Please try again."}
              </p>
            )}
            {providers.google && (
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value={nextPath} />
                <button type="submit" className="btn btn-primary w-full justify-center">
                  Continue with Google
                </button>
              </form>
            )}
            {providers.google && providers.email && (
              <p className="text-center text-xs uppercase tracking-wider text-muted">or</p>
            )}
            {providers.email && (
              <form action={signInWithEmail} className="space-y-3">
                <input type="hidden" name="next" value={nextPath} />
                <label htmlFor="email" className="text-sm font-semibold">
                  Email me a sign-in link
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-line bg-bg/70 px-4 py-3 text-[15px] text-ink placeholder:text-muted/60 focus:border-cyan/50 focus:outline-none focus:ring-2 focus:ring-cyan/20"
                />
                <button type="submit" className="btn btn-ghost w-full justify-center">
                  <Mail className="h-4 w-4" aria-hidden /> Send magic link
                </button>
              </form>
            )}
          </>
        )}
      </div>
      <p className="mt-6 text-xs text-muted">
        We store your email (and name, if Google provides it) only to sign you in and attach your saved analyses.{" "}
        <Link href="/analyze" className="underline hover:text-ink">
          Continue without signing in
        </Link>
      </p>
    </div>
  );
}
