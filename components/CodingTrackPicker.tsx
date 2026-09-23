"use client";

import { useRef, useState } from "react";

const codingTracks = [
  {
    icon: "🟢",
    title: "DSA Practice",
    description:
      "Arrays, strings, linked lists, stacks, queues, trees, graphs, and dynamic programming.",
    difficulty: "Beginner to Advanced",
  },
  {
    icon: "⚙️",
    title: "Java Coding",
    description:
      "OOP, collections, exception handling, streams, and practical Java problems.",
    difficulty: "Beginner to Intermediate",
  },
  {
    icon: "🐍",
    title: "Python Coding",
    description:
      "Python fundamentals, functions, data structures, algorithms, and problem solving.",
    difficulty: "Beginner to Intermediate",
  },
  {
    icon: "🌐",
    title: "Web Development",
    description:
      "HTML, CSS, JavaScript, React, APIs, and frontend problem-solving tasks.",
    difficulty: "Beginner to Intermediate",
  },
];

const difficulties = ["Easy", "Medium", "Hard"];

export default function CodingTrackPicker() {
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const startSectionRef = useRef<HTMLElement | null>(null);

  function selectTrack(trackTitle: string) {
    setSelectedTrack(trackTitle);
    setMessage("");

    window.setTimeout(() => {
      startSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }

  async function startChallenge() {
    if (!selectedTrack) {
      setMessage("Please choose a coding track first.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      const response = await fetch("/api/coding/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          track: selectedTrack,
          difficulty: selectedDifficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create a coding challenge.");
      }

      sessionStorage.setItem("careerai_coding_problem", JSON.stringify(data));
      window.location.href = "/coding/practice";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create a coding challenge. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {codingTracks.map((track) => (
          <button
            key={track.title}
            onClick={() => selectTrack(track.title)}
            disabled={isLoading}
            className={`rounded-3xl border p-7 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selectedTrack === track.title
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-slate-700 bg-slate-900 hover:-translate-y-1 hover:border-cyan-400 hover:bg-slate-800"
            }`}
          >
            <div className="text-4xl">{track.icon}</div>

            <h2 className="mt-5 text-2xl font-bold">{track.title}</h2>

            <p className="mt-3 leading-7 text-slate-400">
              {track.description}
            </p>

            <span className="mt-5 inline-block rounded-full bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200">
              {track.difficulty}
            </span>

            <p className="mt-6 font-semibold text-cyan-400">
              {selectedTrack === track.title
                ? "Selected ✓"
                : "Choose this track →"}
            </p>
          </button>
        ))}
      </section>

      <section
        ref={startSectionRef}
        className="mt-8 rounded-3xl border border-slate-700 bg-slate-900 p-6"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          {selectedTrack ? `Selected: ${selectedTrack}` : "Step 2"}
        </p>

        <h2 className="mt-2 text-xl font-bold">Choose difficulty</h2>

        <div className="mt-5 flex flex-wrap gap-3">
          {difficulties.map((difficulty) => (
            <button
              key={difficulty}
              onClick={() => setSelectedDifficulty(difficulty)}
              disabled={isLoading}
              className={`rounded-xl px-5 py-3 font-semibold transition ${
                selectedDifficulty === difficulty
                  ? "bg-cyan-400 text-slate-950"
                  : "border border-slate-600 text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
              }`}
            >
              {difficulty}
            </button>
          ))}
        </div>

        <button
          onClick={startChallenge}
          disabled={isLoading || !selectedTrack}
          className="mt-6 w-full rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? "Creating your coding challenge..."
            : "Start Coding Challenge →"}
        </button>

        {message && (
          <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center text-sm text-red-200">
            {message}
          </p>
        )}
      </section>
    </>
  );
}