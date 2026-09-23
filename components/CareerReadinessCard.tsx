"use client";

import { useEffect, useState } from "react";

type Summary = {
  careerReadiness: number | null;
  latestResumeScore: number | null;
  averageInterviewScore: number | null;
  skillsCount: number;
  completedInterviewCount: number;
  answerCount: number;
};

export default function CareerReadinessCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch("/api/dashboard/summary");

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setSummary(data);
      } catch {
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();
  }, []);

  const isLoggedIn = summary !== null;

  const readinessScore = summary?.careerReadiness ?? 82;
  const interviewScore = summary?.averageInterviewScore ?? 86;
  const skillsCount = summary?.skillsCount ?? 18;

  const recommendation = isLoggedIn
    ? summary?.averageInterviewScore === null
      ? "Complete a mock interview to improve your Career Readiness Score."
      : "Continue practicing weak topics and improve your interview performance."
    : "Upload your resume to receive your personalized CareerAI score.";

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-cyan-400/20 blur-3xl" />

      <div className="relative rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Career readiness score
            </p>

            <p className="mt-1 text-3xl font-bold">
              {isLoading ? "..." : readinessScore}
              <span className="text-lg text-slate-400">/100</span>
            </p>
          </div>

          <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-300">
            {isLoggedIn ? "Your live score" : "CareerAI preview"}
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-700"
            style={{ width: `${isLoading ? 0 : readinessScore}%` }}
          />
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400">Interview score</p>

            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {isLoading ? "..." : `${interviewScore}%`}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400">Skills identified</p>

            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {isLoading ? "..." : skillsCount}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <p className="text-sm font-semibold text-cyan-200">
            AI Recommendation
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}