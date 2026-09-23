import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InterviewHistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("careerai_session")?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect("/");
  }

  const interviews = await prisma.interview.findMany({
    where: {
      userId: user.userId,
      completedAt: {
        not: null,
      },
    },
    orderBy: {
      completedAt: "desc",
    },
    include: {
      _count: {
        select: {
          answers: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <a
          href="/dashboard"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Dashboard
        </a>

        <div className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Your progress
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Mock Interview History
          </h1>

          <p className="mt-4 text-slate-400">
            Review your completed interview sessions, answers, and AI feedback.
          </p>
        </div>

        {interviews.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center">
            <h2 className="text-2xl font-bold">No completed interviews yet</h2>

            <p className="mt-3 text-slate-400">
              Complete a mock interview to see your saved performance here.
            </p>

            <a
              href="/interview"
              className="mt-6 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300"
            >
              Start a Mock Interview →
            </a>
          </section>
        ) : (
          <section className="mt-10 space-y-5">
            {interviews.map((interview) => (
              <a
                key={interview.id}
                href={`/interview/history/${interview.id}`}
                className="block rounded-3xl border border-slate-700 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-400 hover:bg-slate-800"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-cyan-400">
                      {interview.interviewType}
                    </p>

                    <h2 className="mt-2 text-xl font-bold">
                      {interview.targetRole}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {interview._count.answers} questions answered
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Completed on{" "}
                      {interview.completedAt?.toLocaleDateString("en-IN")}
                    </p>

                    <p className="mt-4 text-sm font-semibold text-cyan-400">
                      View detailed report →
                    </p>
                  </div>

                  <div className="rounded-2xl bg-cyan-400/10 px-7 py-5 text-center">
                    <p className="text-sm text-slate-400">Final score</p>

                    <p className="mt-1 text-3xl font-bold text-cyan-300">
                      {interview.overallScore ?? "—"}
                      {interview.overallScore !== null ? "/100" : ""}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}