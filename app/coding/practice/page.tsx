"use client";

import { useEffect, useState } from "react";

type Example = {
  input: string;
  output: string;
  explanation: string;
};

type CodingProblem = {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: Example[];
  starterCode: {
    python: string;
    java: string;
    javascript: string;
  };
  hints: string[];
};

type CodingData = {
  track: string;
  difficulty: string;
  problem: CodingProblem;
};

type Language = "python" | "java" | "javascript";

function getDefaultLanguage(track: string): Language {
  const normalizedTrack = track.toLowerCase();

  if (normalizedTrack.includes("java")) return "java";
  if (normalizedTrack.includes("python")) return "python";
  if (normalizedTrack.includes("web")) return "javascript";

  // DSA problems can be solved in any language. Python is the initial default.
  return "python";
}

type CodeReview = {
  score: number;
  estimatedStatus: string;
  summary: string;
  correctness: string;
  bugsOrRisks: string[];
  edgeCases: string[];
  timeComplexity: string;
  spaceComplexity: string;
  improvements: string[];
};

export default function CodingPracticePage() {
  const [codingData, setCodingData] = useState<CodingData | null>(null);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState("");
  const [showHints, setShowHints] = useState(false);
  const [review, setReview] = useState<CodeReview | null>(null);
  const [message, setMessage] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    const savedProblem = sessionStorage.getItem("careerai_coding_problem");

    if (!savedProblem) {
      window.location.href = "/coding";
      return;
    }

    try {
      const parsedData = JSON.parse(savedProblem) as CodingData;
      const defaultLanguage = getDefaultLanguage(parsedData.track);

      setCodingData(parsedData);
      setLanguage(defaultLanguage);
      setCode(parsedData.problem.starterCode[defaultLanguage] || "");
    } catch {
      window.location.href = "/coding";
    }
  }, []);

  function changeLanguage(newLanguage: Language) {
    setLanguage(newLanguage);
    setReview(null);
    setMessage("");

    if (codingData) {
      setCode(codingData.problem.starterCode[newLanguage] || "");
    }
  }

  async function submitSolution() {
    if (!codingData) return;

    if (!code.trim()) {
      setMessage("Please write your solution before submitting.");
      return;
    }

    try {
      setIsReviewing(true);
      setMessage("");
      setReview(null);

      const response = await fetch("/api/coding/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemName: codingData.problem.title,
          problemDescription: codingData.problem.description,
          language,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not review your code.");
      }

      setReview(data.review);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not review your code. Please try again."
      );
    } finally {
      setIsReviewing(false);
    }
  }

  if (!codingData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading your coding challenge...
      </main>
    );
  }

  const { track, difficulty, problem } = codingData;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <a
          href="/coding"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          ← Exit Coding Round
        </a>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-400">
              {track} · {difficulty}
            </p>

            <h1 className="mt-2 text-2xl font-bold">{problem.title}</h1>
          </div>

          <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
            AI-generated challenge
          </span>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Problem Description</h2>

            <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">
              {problem.description}
            </p>

            <h3 className="mt-7 font-bold text-cyan-300">Input Format</h3>
            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-300">
              {problem.inputFormat}
            </p>

            <h3 className="mt-7 font-bold text-cyan-300">Output Format</h3>
            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-300">
              {problem.outputFormat}
            </p>

            {problem.constraints?.length > 0 && (
              <>
                <h3 className="mt-7 font-bold text-cyan-300">Constraints</h3>

                <ul className="mt-3 space-y-2 text-slate-300">
                  {problem.constraints.map((constraint, index) => (
                    <li key={`${constraint}-${index}`}>• {constraint}</li>
                  ))}
                </ul>
              </>
            )}

            {problem.examples?.map((example, index) => (
              <div
                key={`${example.input}-${index}`}
                className="mt-7 rounded-2xl bg-slate-800 p-5"
              >
                <h3 className="font-bold text-cyan-300">
                  Example {index + 1}
                </h3>

                <p className="mt-4 text-sm font-semibold text-slate-400">
                  Input
                </p>

                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-slate-200">
                  {example.input}
                </pre>

                <p className="mt-4 text-sm font-semibold text-slate-400">
                  Output
                </p>

                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-slate-200">
                  {example.output}
                </pre>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {example.explanation}
                </p>
              </div>
            ))}

            {problem.hints?.length > 0 && (
              <div className="mt-7">
                <button
                  onClick={() => setShowHints((current) => !current)}
                  className="rounded-xl border border-amber-400/50 px-4 py-3 font-semibold text-amber-200 hover:bg-amber-400/10"
                >
                  {showHints ? "Hide Hints" : "Show Hints"}
                </button>

                {showHints && (
                  <ul className="mt-4 space-y-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
                    {problem.hints.map((hint, index) => (
                      <li key={`${hint}-${index}`}>
                        <span className="font-bold">Hint {index + 1}: </span>
                        {hint}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Your Solution</h2>

              <select
                value={language}
                onChange={(event) =>
                  changeLanguage(event.target.value as Language)
                }
                disabled={isReviewing}
                className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-400 disabled:opacity-60"
              >
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>

            <textarea
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setReview(null);
                setMessage("");
              }}
              spellCheck={false}
              disabled={isReviewing}
              className="mt-6 min-h-[600px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-5 font-mono text-sm leading-7 text-cyan-100 outline-none focus:border-cyan-400 disabled:opacity-70"
            />

            {message && (
              <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center text-sm text-red-200">
                {message}
              </p>
            )}

            <button
              onClick={submitSolution}
              disabled={isReviewing}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReviewing
                ? "Gemini is reviewing your code..."
                : "Submit for AI Review →"}
            </button>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Gemini reviews this code without executing it. Its score is an
              estimate based on correctness, edge cases, complexity, and code
              quality.
            </p>

            {review && (
              <section className="mt-8 rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
                      Gemini Code Review
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {review.estimatedStatus}
                    </h2>
                  </div>

                  <div className="rounded-2xl bg-cyan-400 px-5 py-3 text-center text-slate-950">
                    <p className="text-xs font-semibold">ESTIMATED SCORE</p>
                    <p className="text-3xl font-bold">{review.score}/100</p>
                  </div>
                </div>

                <p className="mt-6 leading-7 text-slate-200">
                  {review.summary}
                </p>

                <div className="mt-6 rounded-2xl bg-slate-900 p-5">
                  <p className="font-semibold text-cyan-300">Correctness</p>
                  <p className="mt-2 leading-7 text-slate-300">
                    {review.correctness}
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <ReviewList
                    title="Potential Bugs or Risks"
                    items={review.bugsOrRisks}
                    color="text-red-300"
                  />

                  <ReviewList
                    title="Edge Cases to Consider"
                    items={review.edgeCases}
                    color="text-amber-300"
                  />

                  <ReviewList
                    title="Suggested Improvements"
                    items={review.improvements}
                    color="text-emerald-300"
                  />

                  <div className="rounded-2xl bg-slate-900 p-5">
                    <p className="font-semibold text-cyan-300">
                      Complexity Estimate
                    </p>

                    <p className="mt-4 text-sm text-slate-400">Time</p>
                    <p className="mt-1 font-mono text-slate-200">
                      {review.timeComplexity || "Not specified"}
                    </p>

                    <p className="mt-4 text-sm text-slate-400">Space</p>
                    <p className="mt-1 font-mono text-slate-200">
                      {review.spaceComplexity || "Not specified"}
                    </p>
                  </div>
                </div>

                <a
                  href="/coding"
                  className="mt-7 inline-block rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300"
                >
                  Try Another Challenge →
                </a>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ReviewList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900 p-5">
      <p className={`font-semibold ${color}`}>{title}</p>

      {items?.length > 0 ? (
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2">
              <span className={color}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No major issues found.</p>
      )}
    </div>
  );
}
