import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { ProfileForm } from "@/components/invites/ProfileForm";
import { Avatar } from "@/components/ui/Avatar";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/signin?next=/profile");
  const [me] = await getDb().select().from(users).where(eq(users.id, session.user.id));
  if (!me) redirect("/signin?next=/profile");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">Profile</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        <span className="metal-text">Your account</span>
      </h1>

      <section className="glass mt-8 flex items-center gap-4 p-5 sm:p-6">
        <Avatar name={me.name ?? me.email} image={me.image} size={56} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{me.name ?? "Signed in"}</p>
          <p className="truncate text-sm text-muted">{me.email}</p>
          <p className="mt-1 text-xs text-muted">Only you can see your email and Google name.</p>
        </div>
      </section>

      <section aria-labelledby="public-title" className="glass mt-6 p-5 sm:p-6">
        <h2 id="public-title" className="text-lg font-semibold">
          Community profile
        </h2>
        <div className="mt-4">
          <ProfileForm displayName={me.displayName} showOnWall={me.showOnWall} suggestedName={me.name?.split(" ")[0]} />
        </div>
      </section>

      <p className="mt-6 text-sm text-muted">
        <Link href="/invites" className="text-cyan underline-offset-2 hover:underline">
          My invites
        </Link>{" "}
        ·{" "}
        <Link href="/history" className="text-cyan underline-offset-2 hover:underline">
          History
        </Link>{" "}
        · To delete your account and data, see the{" "}
        <Link href="/privacy#deletion" className="text-cyan underline-offset-2 hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
