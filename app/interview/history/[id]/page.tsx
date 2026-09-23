import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AnswerFeedback = {
  score?: number;
  technicalCorrectness?: string;
  relevance?: string;
  completeness?: string;
  communication?: string;
  missingConcepts?: string[];
  feedback?: string;
};

export default async function InterviewDetailPage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("careerai_session")?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect("/");
  }

  const interview = await prisma.interview.findFirst({
    where: {
      id,
      userId: user.userId,
      completedAt: {
        not: null,
      },
    },
    include: {
      answers: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!interview) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <a
          href="/interview/history"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Interview History
        </a>

        <section className="mt-8 rounded-3xl border border-cyan-400/30 bg-slate-900 p-6 md:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                Completed Interview Report
              </p>

              <h1 className="mt-3 text-3xl font-bold">
                {interview.interviewType}
              </h1>

              <p className="mt-2 text-slate-400">
                Target role: {interview.targetRole}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Completed on{" "}
                {interview.completedAt?.toLocaleDateString("en-IN")}
              </p>
            </div>

            <div className="rounded-3xl border-4 border-cyan-400 bg-cyan-400/10 px-8 py-6 text-center">
              <p className="text-sm text-slate-400">Final score</p>

              <p className="mt-1 text-4xl font-bold text-cyan-300">
                {interview.overallScore ?? "—"}
                {interview.overallScore !== null ? "/100" : ""}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              title="Questions answered"
              value={String(interview.answers.length)}
              color="text-emerald-300"
            />

            <SummaryCard
              title="Interview type"
              value={interview.interviewType.replace(" Interview", "")}
              color="text-violet-300"
            />

            <SummaryCard
              title="Target role"
              value={interview.targetRole}
              color="text-cyan-300"
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">Question-by-Question Feedback</h2>

          <div className="mt-6 space-y-6">
            {interview.answers.map((answer, index) => {
              const feedback = parseFeedback(answer.feedback);

              return (
                <article
                  key={answer.id}
                  className="rounded-3xl border border-slate-700 bg-slate-900 p-6 md:p-8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-cyan-400">
                        Question {index + 1}
                      </p>

                      <h3 className="mt-2 text-xl font-bold leading-8">
                        {answer.questionText}
                      </h3>
                    </div>

                    <div className="shrink-0 rounded-xl bg-cyan-400 px-4 py-2 text-center font-bold text-slate-950">
                      {answer.score ?? "—"}/100
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-slate-800 p-5">
                    <p className="text-sm font-semibold text-slate-400">
                      Your answer
                    </p>

                    <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-200">
                      {answer.userAnswer}
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                    <p className="font-semibold text-cyan-200">
                      Gemini Feedback
                    </p>

                    <p className="mt-3 leading-7 text-slate-200">
                      {feedback.feedback || "No written feedback available."}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <FeedbackCard
                      title="Technical Correctness"
                      text={feedback.technicalCorrectness}
                    />

                    <FeedbackCard
                      title="Relevance"
                      text={feedback.relevance}
                    />

                    <FeedbackCard
                      title="Completeness"
                      text={feedback.completeness}
                    />

                    <FeedbackCard
                      title="Communication"
                      text={feedback.communication}
                    />
                  </div>

                  {feedback.missingConcepts &&
                    feedback.missingConcepts.length > 0 && (
                      <div className="mt-6">
                        <p className="font-semibold text-amber-300">
                          Concepts to Improve
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {feedback.missingConcepts.map((concept, conceptIndex) => (
                            <span
                              key={`${concept}-${conceptIndex}`}
                              className="rounded-full bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/interview"
            className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300"
          >
            Start Another Interview →
          </a>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-600 px-6 py-3 font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
          >
            View Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

function parseFeedback(value: string | null): AnswerFeedback {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as AnswerFeedback;
  } catch {
    return {
      feedback: value,
    };
  }
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-800 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`mt-2 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function FeedbackCard({
  title,
  text,
}: {
  title: string;
  text?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-800 p-5">
      <p className="text-sm font-semibold text-cyan-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {text || "No feedback available."}
      </p>
    </div>
  );
}