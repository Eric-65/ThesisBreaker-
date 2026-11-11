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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
      <path d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
      <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.7 9.4 5.9 12 5.9z" />
    </svg>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; error?: string; next?: string; mode?: string }>;
}) {
  const { check, error, next, mode } = await searchParams;
  const signup = mode === "signup";
  if (await getSession()) redirect("/history");
  const enabled = isAuthEnabled();
  const providers = authProviders();
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/history";

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
      <p className="eyebrow">{signup ? "Create your account" : "Welcome back"}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        <span className="metal-text">{signup ? "Sign up" : "Sign in"}</span>
      </h1>
      <p className="mt-3 text-muted">
        {signup ? "An account keeps" : "Signing in keeps"} the stress tests you already ran in this browser, makes them
        available on any device, and gives you a personal invite link. You can also keep using ThesisBreaker without one.
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
                  <GoogleMark /> Continue with Google
                </button>
              </form>
            )}
            {providers.google && providers.email && (
              <p className="text-center text-xs uppercase tracking-wider text-muted">or</p>
            )}
            {providers.email && (
              <form action={signInWithEmail} className="space-y-3">
                <input type="hidden" name="next" value={nextPath} />
                <label htmlFor="email" className="text-sm font-medium text-muted">
                  Get a sign-in link by email instead
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
        By continuing you agree to the{" "}
        <Link href="/terms" className="underline hover:text-ink">Terms</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-ink">Privacy Policy</Link>. With Google we receive only your
        name, email and profile photo.{" "}
        <Link href="/analyze" className="underline hover:text-ink">
          Continue without an account
        </Link>
      </p>
    </div>
  );
}
