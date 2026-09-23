"use client";

import { useEffect, useRef, useState } from "react";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type InterviewData = {
  interviewId: string;
  targetRole: string;
  interviewType: string;
  questions: string[];
};

type Evaluation = {
  score: number;
  technicalCorrectness: string;
  relevance: string;
  completeness: string;
  communication: string;
  missingConcepts: string[];
  feedback: string;
};

export default function PracticePage() {
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [message, setMessage] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    setVoiceAvailable(
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );

    const savedInterview = sessionStorage.getItem("careerai_interview");

    if (!savedInterview) {
      window.location.href = "/interview";
      return;
    }

    try {
      setInterview(JSON.parse(savedInterview));
    } catch {
      window.location.href = "/interview";
    }
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!interview || evaluation || isComplete) return;

    setSecondsLeft(90);

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQuestionIndex, interview, evaluation, isComplete]);

  async function evaluateAnswer() {
    if (!answer.trim()) {
      setMessage("Please write an answer before submitting.");
      return;
    }

    if (!interview) return;

    try {
      setIsEvaluating(true);
      setMessage("");

      const isFinalQuestion =
        currentQuestionIndex === interview.questions.length - 1;

      const response = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interviewId: interview.interviewId,
          questionText: interview.questions[currentQuestionIndex],
          userAnswer: answer.trim(),
          isFinalQuestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not evaluate your answer.");
      }

      setEvaluation(data.evaluation);

      if (isFinalQuestion) {
        setFinalScore(data.overallScore);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not evaluate your answer. Please try again."
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  function nextQuestion() {
    if (!interview) return;

    const isLastQuestion =
      currentQuestionIndex === interview.questions.length - 1;

    if (isLastQuestion) {
      setIsComplete(true);
      return;
    }

    setCurrentQuestionIndex((current) => current + 1);
    setAnswer("");
    setEvaluation(null);
    setMessage("");
  }

  function readQuestionAloud() {
    if (!interview || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(
      interview.questions[currentQuestionIndex]
    );

    speech.rate = 0.95;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
    setVoiceMessage("CareerAI is reading the question aloud.");
  }

  function startVoiceAnswer() {
    if (!voiceAvailable || evaluation || isEvaluating) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceMessage(
        "Voice input is not available in this browser. Please use Chrome or Edge."
      );
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new Recognition();
    const answerBeforeSpeech = answer.trim();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0].transcript} `;
      }

      setAnswer(
        [answerBeforeSpeech, transcript.trim()].filter(Boolean).join(" ")
      );
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceMessage(
        event.error === "not-allowed"
          ? "Microphone permission was blocked. Allow microphone access in your browser and try again."
          : "Voice input stopped. You can try the microphone again or type your answer."
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setVoiceMessage("Listening… Speak your answer. Your words will appear in the answer box.");
    setIsListening(true);
    recognition.start();
  }

  function stopVoiceAnswer() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceMessage("Voice input stopped. Review your answer before submitting.");
  }

  if (!interview) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading your interview...
      </main>
    );
  }

  const currentQuestion = interview.questions[currentQuestionIndex];
  const isLastQuestion =
    currentQuestionIndex === interview.questions.length - 1;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  if (isComplete) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-cyan-400/30 bg-slate-900 p-8 text-center shadow-2xl md:p-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Interview complete
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Great practice session!
            </h1>

            <div className="mx-auto mt-8 flex h-40 w-40 flex-col items-center justify-center rounded-full border-8 border-cyan-400 bg-cyan-400/10">
              <span className="text-5xl font-bold text-cyan-300">
                {finalScore ?? "—"}
              </span>
              <span className="mt-1 text-sm text-slate-400">overall score</span>
            </div>

            <p className="mt-8 leading-7 text-slate-400">
              Your answers, Gemini feedback, and final score have been saved
              to your CareerAI account.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="/dashboard"
                className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300"
              >
                View Dashboard →
              </a>

              <a
                href="/interview"
                className="rounded-xl border border-slate-600 px-6 py-3 font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
              >
                Start Another Interview
              </a>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <a
          href="/interview"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          ← Exit interview
        </a>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-400">
              {interview.interviewType}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Target role: {interview.targetRole}
            </p>
          </div>

          <div
            className={`rounded-xl px-5 py-3 text-center ${
              secondsLeft <= 15
                ? "bg-red-400/15 text-red-300"
                : "bg-cyan-400/10 text-cyan-200"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider">
              Question timer
            </p>
            <p className="mt-1 text-2xl font-bold">
              {minutes}:{seconds}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Question {currentQuestionIndex + 1} of{" "}
              {interview.questions.length}
            </span>
            <span>
              {Math.round(
                ((currentQuestionIndex + 1) / interview.questions.length) * 100
              )}
              % complete
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{
                width: `${
                  ((currentQuestionIndex + 1) / interview.questions.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-900 p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            CareerAI asks
          </p>

          <h1 className="mt-4 text-2xl font-bold leading-9 md:text-3xl">
            {currentQuestion}
          </h1>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              onClick={readQuestionAloud}
              type="button"
              className="rounded-xl border border-cyan-400/50 px-4 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
            >
              🔊 Read Question Aloud
            </button>

            {voiceAvailable ? (
              <button
                onClick={isListening ? stopVoiceAnswer : startVoiceAnswer}
                type="button"
                disabled={Boolean(evaluation) || isEvaluating}
                className={`rounded-xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isListening
                    ? "bg-red-400/20 text-red-200 hover:bg-red-400/30"
                    : "border border-violet-400/50 text-violet-200 hover:bg-violet-400/10"
                }`}
              >
                {isListening ? "■ Stop Listening" : "🎙️ Answer by Voice"}
              </button>
            ) : (
              <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                Voice input works in Chrome or Edge.
              </p>
            )}
          </div>

          {voiceMessage && (
            <p className="mt-4 text-sm text-slate-400">{voiceMessage}</p>
          )}

          <label className="mt-8 block text-sm font-semibold text-slate-200">
            Your answer
          </label>

          <textarea
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setMessage("");
            }}
            disabled={Boolean(evaluation)}
            placeholder="Write your answer here. Explain your thinking clearly."
            className="mt-3 min-h-48 w-full resize-y rounded-2xl border border-slate-700 bg-slate-800 p-5 leading-7 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 disabled:opacity-70"
          />

          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>Try to give a clear, structured answer.</span>
            <span>{answer.length} characters</span>
          </div>

          {message && (
            <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center text-sm text-red-200">
              {message}
            </p>
          )}

          {evaluation && (
            <section className="mt-8 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-cyan-100">
                  AI Answer Evaluation
                </h2>

                <span className="rounded-xl bg-cyan-400 px-4 py-2 text-lg font-bold text-slate-950">
                  {evaluation.score}/100
                </span>
              </div>

              <p className="mt-5 leading-7 text-slate-200">
                {evaluation.feedback}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <FeedbackCard
                  title="Technical correctness"
                  text={evaluation.technicalCorrectness}
                />
                <FeedbackCard
                  title="Relevance"
                  text={evaluation.relevance}
                />
                <FeedbackCard
                  title="Completeness"
                  text={evaluation.completeness}
                />
                <FeedbackCard
                  title="Communication"
                  text={evaluation.communication}
                />
              </div>

              {evaluation.missingConcepts?.length > 0 && (
                <div className="mt-6">
                  <p className="font-semibold text-amber-300">
                    Concepts to improve
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {evaluation.missingConcepts.map((concept) => (
                      <span
                        key={concept}
                        className="rounded-full bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {evaluation ? (
            <button
              onClick={nextQuestion}
              className="mt-8 w-full rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              {isLastQuestion
                ? "View Final Interview Score →"
                : "Next Question →"}
            </button>
          ) : (
            <button
              onClick={evaluateAnswer}
              disabled={isEvaluating}
              className="mt-8 w-full rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEvaluating ? "Gemini is evaluating..." : "Submit Answer →"}
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

function FeedbackCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-4">
      <p className="text-sm font-semibold text-cyan-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}
