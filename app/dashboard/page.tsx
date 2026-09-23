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
            <ScoreTrendGraph scores={progressScores} />
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

function ScoreTrendGraph({ scores }: { scores: number[] }) {
  const width = 720;
  const height = 250;
  const padding = { top: 24, right: 30, bottom: 42, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const pointX = (index: number) =>
    scores.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (index / (scores.length - 1)) * chartWidth;
  const pointY = (score: number) =>
    padding.top + ((100 - score) / 100) * chartHeight;
  const points = scores.map((score, index) => ({ score, x: pointX(index), y: pointY(score) }));
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${padding.left},${padding.top + chartHeight} ${linePoints} ${points[points.length - 1].x},${padding.top + chartHeight}`;

  return (
    <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img" aria-label="Interview score trend graph">
        <defs>
          <linearGradient id="scoreArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((score) => {
          const y = pointY(score);
          return <g key={score}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#334155" strokeDasharray="5 5" />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="12">{score}</text>
          </g>;
        })}
        <polygon points={areaPoints} fill="url(#scoreArea)" />
        {points.length > 1 && <polyline points={linePoints} fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point, index) => (
          <g key={`${point.score}-${index}`}>
            <circle cx={point.x} cy={point.y} r="7" fill="#020817" stroke="#67e8f9" strokeWidth="4" />
            <text x={point.x} y={point.y - 14} textAnchor="middle" fill="#67e8f9" fontSize="13" fontWeight="700">{point.score}%</text>
            <text x={point.x} y={height - 14} textAnchor="middle" fill="#94a3b8" fontSize="12">Attempt {index + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
