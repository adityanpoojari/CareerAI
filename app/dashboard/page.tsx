import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getReportSummary(reportJson: string) {
  try {
    const report = JSON.parse(reportJson) as {
      summary?: string;
      strengths?: string[];
      weakAreas?: string[];
      missingSkills?: string[];
      recommendations?: string[];
    };

    return {
      summary:
        report.summary ||
        "Your latest resume report is saved and ready for interview preparation.",
      strengths: report.strengths || [],
      focusAreas: [
        ...(report.weakAreas || []),
        ...(report.missingSkills || []),
        ...(report.recommendations || []),
      ],
    };
  } catch {
    return {
      summary: "Your latest resume report is saved and ready for interview preparation.",
      strengths: [],
      focusAreas: [],
    };
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("careerai_session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    redirect("/");
  }

  const [latestResume, completedInterviews, answerCount, averageScoreResult, codingResult, recentInterviews] =
    await Promise.all([
      prisma.resume.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.interview.count({
        where: {
          userId: session.userId,
          completedAt: { not: null },
        },
      }),
      prisma.interviewAnswer.count({
        where: {
          interview: {
            userId: session.userId,
          },
        },
      }),
      prisma.interview.aggregate({
        where: {
          userId: session.userId,
          completedAt: { not: null },
        },
        _avg: {
          overallScore: true,
        },
      }),
      prisma.codingSubmission.aggregate({
        where: { userId: session.userId },
        _avg: { score: true },
        _count: { id: true },
      }),
      prisma.interview.findMany({
        where: { userId: session.userId, completedAt: { not: null } },
        orderBy: { completedAt: "asc" },
        take: 8,
        select: { overallScore: true, interviewType: true },
      }),
    ]);

  const averageScore =
    averageScoreResult._avg.overallScore !== null
      ? Math.round(averageScoreResult._avg.overallScore)
      : null;

  const resumeScore = latestResume?.overallScore ?? null;
  const codingAverage = codingResult._avg.score !== null
    ? Math.round(codingResult._avg.score)
    : null;
  const progressScores = recentInterviews
    .map((item) => item.overallScore)
    .filter((score): score is number => score !== null);
  const report = latestResume
    ? getReportSummary(latestResume.reportJson)
    : null;

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-10 text-white sm:px-8 lg:px-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
              Your workspace
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">
              Welcome back, {session.name || "Career Builder"}!
            </h1>
            <p className="mt-2 text-slate-400">
              Track your progress and continue preparing for your target role.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-600 px-5 py-3 text-center font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            ← CareerAI Home
          </Link>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6">
            <p className="text-slate-400">Latest Resume Score</p>
            <p className="mt-3 text-4xl font-black text-cyan-400">
              {resumeScore !== null ? `${resumeScore}/100` : "—"}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {latestResume
                ? `${latestResume.targetRole} role`
                : "Analyze a resume to begin"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6">
            <p className="text-slate-400">Mock Interviews</p>
            <p className="mt-3 text-4xl font-black text-violet-400">
              {completedInterviews}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Your completed practice sessions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6">
            <p className="text-slate-400">Questions Attempted</p>
            <p className="mt-3 text-4xl font-black text-emerald-400">
              {answerCount}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Your interview-answer history
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6">
            <p className="text-slate-400">Average Score</p>
            <p className="mt-3 text-4xl font-black text-amber-300">
              {averageScore !== null ? `${averageScore}%` : "—"}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {averageScore !== null
                ? "Across completed interviews"
                : "Complete an interview first"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6">
            <p className="text-slate-400">Coding Score</p>
            <p className="mt-3 text-4xl font-black text-fuchsia-300">
              {codingAverage !== null ? `${codingAverage}%` : "—"}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {codingResult._count.id > 0
                ? `${codingResult._count.id} AI-reviewed solution${codingResult._count.id === 1 ? "" : "s"}`
                : "Submit code for review"}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900/90 p-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-300">Performance progress</p>
          <h2 className="mt-3 text-2xl font-black">Interview score trend</h2>
          {progressScores.length > 0 ? (
            <div className="mt-7 flex h-40 items-end gap-3 border-b border-slate-700 pb-2">
              {progressScores.map((score, index) => (
                <div key={`${score}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-cyan-200">{score}%</span>
                  <div className="w-full rounded-t-lg bg-cyan-400/80 transition-all" style={{ height: `${Math.max(score, 4)}%` }} />
                  <span className="text-xs text-slate-500">#{index + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-slate-400">Complete mock interviews to see your score trend here.</p>
          )}
        </section>

        {latestResume ? (
          <section className="mt-8 rounded-3xl border border-cyan-500/50 bg-slate-900/90 p-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-400">
              Latest saved report
            </p>

            <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-2xl font-black">{latestResume.fileName}</h2>
                <p className="mt-2 text-slate-300">
                  Target role: {latestResume.targetRole}
                </p>
                <p className="mt-2 max-w-3xl text-slate-400">{report?.summary}</p>
                <p className="mt-3 text-sm text-slate-500">
                  Saved on{" "}
                  {new Date(latestResume.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>

              <div className="rounded-2xl bg-cyan-500/15 px-7 py-5 text-center">
                <p className="text-sm text-slate-300">Resume score</p>
                <p className="mt-1 text-4xl font-black text-cyan-400">
                  {latestResume.overallScore}/100
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-cyan-500/40 bg-cyan-500/10 p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
              Recommended next step
            </p>
            <h2 className="mt-3 text-2xl font-black">
              Upload your resume for a personalized analysis
            </h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              CareerAI will identify your strengths, missing skills, and
              role-specific interview questions.
            </p>
            <Link
              href="/resume"
              className="mt-6 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Analyze Resume →
            </Link>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900/90 p-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-400">
            Practice with AI
          </p>
          <h2 className="mt-3 text-3xl font-black">Build interview confidence</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Practice AI mock interviews or solve coding challenges based on
            your selected track and difficulty level.
          </p>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/interview"
              className="rounded-xl bg-violet-500 px-6 py-3 text-center font-bold text-white transition hover:bg-violet-400"
            >
              Start AI Mock Interview →
            </Link>

            <Link
              href="/interview/history"
              className="rounded-xl border border-violet-400/60 px-6 py-3 text-center font-bold text-violet-200 transition hover:bg-violet-400/10"
            >
              View Interview History →
            </Link>

            <Link
              href="/coding"
              className="rounded-xl bg-cyan-400 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Start Coding Round →
            </Link>

            <Link
              href="/coding/history"
              className="rounded-xl border border-cyan-400/60 px-6 py-3 text-center font-bold text-cyan-200 transition hover:bg-cyan-400/10"
            >
              View Coding History →
            </Link>

          </div>
        </section>

        {report && (report.strengths.length > 0 || report.focusAreas.length > 0) && (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <h2 className="text-xl font-black text-emerald-300">
                Your strengths
              </h2>
              <ul className="mt-4 space-y-3 text-slate-200">
                {report.strengths.slice(0, 4).map((strength) => (
                  <li key={strength}>✓ {strength}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <h2 className="text-xl font-black text-amber-300">
                Focus areas
              </h2>
              <ul className="mt-4 space-y-3 text-slate-200">
                {report.focusAreas.slice(0, 4).map((focusArea) => (
                  <li key={focusArea}>→ {focusArea}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
