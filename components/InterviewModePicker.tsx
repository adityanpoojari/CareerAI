"use client";

import { useState } from "react";

const interviewTypes = [
  {
    icon: "💼",
    title: "HR Interview",
    description:
      "Practice communication, confidence, teamwork, and career questions.",
  },
  {
    icon: "💻",
    title: "Technical Interview",
    description:
      "Practice role-specific technical questions based on your target career.",
  },
  {
    icon: "📄",
    title: "Resume Interview",
    description:
      "Answer questions generated from your saved resume and projects.",
  },
  {
    icon: "🎯",
    title: "Mixed Interview",
    description:
      "Experience a realistic combination of HR, technical, and resume questions.",
  },
];

export default function InterviewModePicker() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInterviewType, setSelectedInterviewType] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function startInterview(interviewType: string) {
    try {
      setIsLoading(true);
      setSelectedInterviewType(interviewType);
      setMessage("");

      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interviewType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not start the interview.");
      }

      sessionStorage.setItem(
        "careerai_interview",
        JSON.stringify(data)
      );

      window.location.href = "/interview/practice";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start the interview. Please try again."
      );
    } finally {
      setIsLoading(false);
      setSelectedInterviewType(null);
    }
  }

  return (
    <>
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {interviewTypes.map((interview) => (
          <button
            key={interview.title}
            onClick={() => startInterview(interview.title)}
            disabled={isLoading}
            className="rounded-3xl border border-slate-700 bg-slate-900 p-7 text-left transition hover:-translate-y-1 hover:border-cyan-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="text-4xl">{interview.icon}</div>

            <h2 className="mt-5 text-2xl font-bold">{interview.title}</h2>

            <p className="mt-3 leading-7 text-slate-400">
              {interview.description}
            </p>

            <span className="mt-6 inline-block font-semibold text-cyan-400">
              {isLoading && selectedInterviewType === interview.title
                ? "Preparing questions..."
                : "Start practice →"}
            </span>
          </button>
        ))}
      </section>

      {message && (
        <p className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center text-sm text-red-200">
          {message}
        </p>
      )}
    </>
  );
}
