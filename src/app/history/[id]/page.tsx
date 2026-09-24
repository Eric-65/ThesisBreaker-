import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isDbConfigured } from "@/db";
import { getResult } from "@/lib/analysis/repo";
import { ResultView } from "@/components/results/ResultView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verdict" };

export default async function VerdictDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured()) notFound();
  const result = await getResult(id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/history" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All verdicts
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        <span className="metal-text">Stress test</span>
      </h1>
      <blockquote className="mt-3 max-w-3xl border-l-2 border-cyan/50 pl-4 text-ink/90">“{result.idea}”</blockquote>
      <p className="num mt-2 text-xs text-muted">
        {new Date(result.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
      </p>
      <div className="mt-8">
        <ResultView result={result} />
      </div>
    </div>
  );
}
