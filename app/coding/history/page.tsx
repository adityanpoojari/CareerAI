import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Feedback = { summary?: string; estimatedStatus?: string; timeComplexity?: string };

function readFeedback(value: string | null): Feedback {
  try { return value ? JSON.parse(value) as Feedback : {}; } catch { return {}; }
}

export default async function CodingHistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("careerai_session")?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) redirect("/");

  const submissions = await prisma.codingSubmission.findMany({
    where: { userId: user.userId }, orderBy: { createdAt: "desc" }, take: 50,
  });

  const average = submissions.length
    ? Math.round(submissions.reduce((sum, item) => sum + (item.score ?? 0), 0) / submissions.length)
    : null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">← Back to Dashboard</Link>
        <div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Your coding history</p>
            <h1 className="mt-3 text-4xl font-black">Saved code reviews</h1>
            <p className="mt-3 text-slate-400">Every Gemini-reviewed solution is saved here.</p>
          </div>
          <div className="rounded-2xl bg-cyan-400/10 px-6 py-4 text-center">
            <p className="text-sm text-slate-400">Coding average</p>
            <p className="text-3xl font-black text-cyan-300">{average === null ? "—" : `${average}%`}</p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center">
            <h2 className="text-2xl font-bold">No coding submissions yet</h2>
            <p className="mt-3 text-slate-400">Complete a Coding Round and submit your solution for a Gemini review.</p>
            <Link href="/coding" className="mt-6 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950">Start Coding Round →</Link>
          </section>
        ) : (
          <section className="mt-8 space-y-4">
            {submissions.map((submission) => {
              const feedback = readFeedback(submission.feedback);
              return <article key={submission.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-cyan-300">{submission.language}</p>
                    <h2 className="mt-1 text-xl font-bold">{submission.problemName}</h2>
                    <p className="mt-2 text-sm text-slate-400">{new Date(submission.createdAt).toLocaleDateString("en-IN")} · {feedback.estimatedStatus || submission.status}</p>
                  </div>
                  <span className="rounded-xl bg-cyan-400/15 px-4 py-2 font-bold text-cyan-200">{submission.score ?? "—"}/100</span>
                </div>
                {feedback.summary && <p className="mt-5 leading-7 text-slate-300">{feedback.summary}</p>}
                {feedback.timeComplexity && <p className="mt-4 text-sm text-slate-400">Estimated time complexity: <span className="font-mono text-slate-200">{feedback.timeComplexity}</span></p>}
                <details className="mt-5 rounded-xl bg-slate-950 p-4 text-sm text-slate-300">
                  <summary className="cursor-pointer font-semibold text-cyan-300">View submitted code</summary>
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6">{submission.code}</pre>
                </details>
              </article>;
            })}
          </section>
        )}
      </div>
    </main>
  );
}
