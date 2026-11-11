import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal/LegalPage";

// Reads CONTACT_EMAIL at request time so changing it needs no rebuild.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What ThesisBreaker collects, why, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="November 11, 2026"
      intro={
        <>
          ThesisBreaker is a research tool for stress-testing trade ideas. This page explains, in plain language, what we
          store when you use it, why we store it, and how to have it removed. You can use the app without an account.
        </>
      }
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <ul>
              <li>
                <strong>An anonymous cookie ID.</strong> On your first visit we set one cookie containing a random ID. It
                is not derived from your device or identity. We store that ID with the time of your first and latest visit
                and a visit count.
              </li>
              <li>
                <strong>Your trade ideas and their analyses.</strong> The text you submit for a stress test, the
                assumptions and verdict produced for it, and the market data used.
              </li>
              <li>
                <strong>Google account basics, if you sign in with Google.</strong> Your name, email address and profile
                photo. We request only the <span className="num text-[13px]">openid</span>,{" "}
                <span className="num text-[13px]">email</span> and <span className="num text-[13px]">profile</span>{" "}
                scopes. We never see your Google password and cannot read your mail, contacts or files.
              </li>
              <li>
                <strong>Your email address, if you sign in by email link.</strong>
              </li>
              <li>
                <strong>Referral relationships.</strong> If you create an account after opening someone&apos;s invite
                link, we record which account invited you. We also store your own invite code.
              </li>
              <li>
                <strong>An optional display name</strong> and whether you chose to appear on the community wall.
              </li>
              <li>
                <strong>Usage records for the AI model.</strong> Token counts and timing for each analysis, used to
                manage cost.
              </li>
            </ul>
          ),
        },
        {
          id: "why",
          title: "Why we collect it",
          body: (
            <ul>
              <li>To show you your own history of stress tests, on this browser or, once signed in, on any device.</li>
              <li>To sign you in and keep your account secure.</li>
              <li>To run the invite program: showing you who joined through your link and crediting the right person.</li>
              <li>To prevent abuse, such as automated requests that would exhaust the service.</li>
              <li>
                To publish aggregate statistics on the <Link href="/community" className="text-cyan underline-offset-2 hover:underline">Community</Link>{" "}
                page, such as total users and stress tests.
              </li>
            </ul>
          ),
        },
        {
          id: "public",
          title: "What other people can see",
          body: (
            <>
              <p>
                By default, nothing that identifies you. The Community page shows totals and lists new members as
                “Anonymous trader”.
              </p>
              <p>
                If you turn on <strong>Show me on the community wall</strong> in your profile, your chosen display name
                and profile photo appear on the Community page, on the inviters leaderboard, and to the person who
                invited you. You can turn this off at any time. <strong>Your email address is never shown to other
                users.</strong>
              </p>
              <p>
                A stress-test result page can be opened by anyone who has its link. The links are long and random, and we
                do not list them publicly; share one only if you want someone to see that result.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "What we don't do",
          body: (
            <ul>
              <li>We do not sell your data.</li>
              <li>We do not use advertising or third-party tracking cookies.</li>
              <li>We do not store raw IP addresses. A salted, one-way hash is held briefly in memory to limit request rates.</li>
              <li>We do not use your Google data for anything other than signing you in and showing your name and photo to you.</li>
            </ul>
          ),
        },
        {
          id: "processors",
          title: "Services we rely on",
          body: (
            <>
              <p>These providers process data on our behalf so the app can work:</p>
              <ul>
                <li><strong>Vercel</strong> hosts the website.</li>
                <li><strong>Our Postgres database provider</strong> stores the data described above.</li>
                <li><strong>Google</strong> handles sign-in when you choose “Continue with Google”.</li>
                <li><strong>Resend</strong> delivers sign-in emails when you choose the email link.</li>
                <li>
                  <strong>Qwen, via Bitget&apos;s AI endpoint,</strong> receives the text of your trade idea to produce the
                  analysis. Do not include personal information in a trade idea.
                </li>
                <li><strong>Bitget&apos;s public market API</strong> receives only the ticker symbol being analyzed.</li>
              </ul>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <ul>
              <li><span className="num text-[13px]">tb_vid</span>: your anonymous ID. Lasts one year.</li>
              <li><span className="num text-[13px]">tb_seen</span>: marks an ongoing visit so we count visits correctly. Lasts 30 minutes.</li>
              <li><span className="num text-[13px]">tb_ref</span>: remembers an invite code you arrived with. Lasts 30 days, and is removed when you sign in.</li>
              <li>Sign-in session cookies set by our authentication library, only if you sign in.</li>
            </ul>
          ),
        },
        {
          id: "deletion",
          title: "Deleting your data",
          body: (
            <>
              <p>
                To have your account and everything linked to it deleted (your profile, stress tests and referral links),
                contact us at <Contact /> from the email address on your account. We will delete it within 30 days and
                confirm when it is done.
              </p>
              <p>
                If you have never signed in, clearing this site&apos;s cookies in your browser disconnects you from your
                anonymous history. You can also write to us to have that history erased.
              </p>
              <p>You can ask for a copy of your data, or for a correction, the same way.</p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes and contact",
          body: (
            <>
              <p>
                If this policy changes in a meaningful way, we will update the date at the top of this page. Questions
                about privacy: <Contact />.
              </p>
              <p>
                See also the <Link href="/terms" className="text-cyan underline-offset-2 hover:underline">Terms of Use</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
