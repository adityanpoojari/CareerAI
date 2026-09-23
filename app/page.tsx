"use client";

import { useEffect, useState, type FormEvent } from "react";
import GlowingParticles from "@/components/GlowingParticles";
import CareerReadinessCard from "@/components/CareerReadinessCard";

type AuthMode = "login" | "signup";

type SessionUser = {
  userId: string;
  email: string;
  name: string | null;
};

const features = [
  {
    icon: "📄",
    title: "AI Resume Analyzer",
    text: "Upload your resume and receive actionable feedback for your selected role.",
    path: "/resume",
    premium: false,
  },
  {
    icon: "🎤",
    title: "Mock Interviews",
    text: "Practice HR, technical, coding, and resume-based interviews with AI.",
    path: "/interview",
    premium: true,
  },
  {
    icon: "📈",
    title: "Progress Dashboard",
    text: "Track scores, weak areas, interview history, and career growth over time.",
    path: "/dashboard",
    premium: true,
  },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me");

        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } finally {
        setIsSessionLoading(false);
      }
    }

    loadSession();
  }, []);

  function openAuthPopup(mode: AuthMode) {
    setAuthMode(mode);
    setAuthMessage("");
    setShowAuthPopup(true);
  }

  function closeAuthPopup() {
    setShowAuthPopup(false);
    setAuthMessage("");
    setPassword("");
  }

  function openPremiumFeature(path: string) {
    if (currentUser) {
      window.location.href = path;
      return;
    }

    openAuthPopup("login");
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsAuthLoading(true);
      setAuthMessage("");

      const endpoint =
        authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";

      const body =
        authMode === "signup"
          ? { name, email, password }
          : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : "Could not complete your request. Please try again."
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    setCurrentUser(null);
    window.location.href = "/";
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <GlowingParticles />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <a href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-lg font-bold text-slate-950 sm:h-10 sm:w-10 sm:text-xl">
            C
          </div>

          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            Career<span className="text-cyan-400">AI</span>
          </span>
        </a>

        <nav className="hidden gap-7 text-sm text-slate-300 lg:flex">
          <a href="#features" className="hover:text-cyan-400">
            Features
          </a>

          {currentUser && (
            <>
              <a href="/dashboard" className="hover:text-cyan-400">
                Dashboard
              </a>

              <a href="/interview/history" className="hover:text-cyan-400">
                History
              </a>
            </>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {isSessionLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-800" />
          ) : currentUser ? (
            <>
              <a
                href="/dashboard"
                className="hidden rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 sm:block"
              >
                Dashboard
              </a>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-red-400 hover:text-red-300 sm:px-4 sm:text-sm"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuthPopup("login")}
                className="rounded-lg px-2 py-2 text-xs font-medium text-slate-200 hover:text-cyan-400 sm:px-4 sm:text-sm"
              >
                Log in
              </button>

              <button
                onClick={() => openAuthPopup("signup")}
                className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 sm:px-4 sm:text-sm"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            ✨ Your AI-powered career coach
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Prepare smarter.
            <br />
            Get hired <span className="text-cyan-400">faster.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
            Analyze your resume, practice realistic interviews, improve your
            answers, and track your progress—all in one intelligent career
            platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <a
              href="/resume"
              className="rounded-xl bg-cyan-400 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-300 sm:hover:scale-105"
            >
              Upload Resume Free →
            </a>

            {currentUser ? (
              <a
                href="/interview"
                className="rounded-xl border border-slate-600 px-6 py-3 text-center font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
              >
                Start Mock Interview
              </a>
            ) : (
              <a
                href="#features"
                className="rounded-xl border border-slate-600 px-6 py-3 text-center font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
              >
                Explore features
              </a>
            )}
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400">
            <span>✓ Resume analysis</span>
            <span>✓ AI mock interviews</span>
            <span>✓ Progress tracking</span>
          </div>
        </div>

        <CareerReadinessCard />
      </section>

      <section
        id="features"
        className="relative z-10 bg-slate-900/60 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Everything you need
          </p>

          <h2 className="mt-3 text-center text-2xl font-bold sm:text-3xl md:text-4xl">
            Your complete interview-preparation workspace
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) =>
              feature.premium ? (
                <button
                  key={feature.title}
                  onClick={() => openPremiumFeature(feature.path)}
                  className="text-left"
                >
                  <FeatureCard {...feature} />
                </button>
              ) : (
                <a key={feature.title} href={feature.path}>
                  <FeatureCard {...feature} />
                </a>
              )
            )}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800 px-6 py-8 text-center text-sm text-slate-500">
        © 2026 CareerAI. Build confidence. Build your career.
      </footer>

      {showAuthPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:px-6">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                  {authMode === "signup" ? "Create account" : "Welcome back"}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {authMode === "signup"
                    ? "Unlock your CareerAI journey"
                    : "Log in to CareerAI"}
                </h2>
              </div>

              <button
                onClick={closeAuthPopup}
                className="text-2xl text-slate-400 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAuth} className="mt-7 space-y-4">
              {authMode === "signup" && (
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Your name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your name"
                    maxLength={60}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                />
              </div>

              {authMessage && (
                <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-center text-sm text-red-200">
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
              >
                {isAuthLoading
                  ? "Please wait..."
                  : authMode === "signup"
                    ? "Create free account"
                    : "Log in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              {authMode === "signup"
                ? "Already have an account?"
                : "New to CareerAI?"}

              <button
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setAuthMessage("");
                }}
                className="ml-2 font-semibold text-cyan-400 hover:text-cyan-300"
              >
                {authMode === "signup" ? "Log in" : "Create one"}
              </button>
            </p>

            <button
              onClick={closeAuthPopup}
              className="mt-5 w-full text-sm text-slate-400 hover:text-white"
            >
              Continue with free resume analysis
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <article className="h-full rounded-2xl border border-slate-700 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-cyan-400/60">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-3 leading-7 text-slate-400">{text}</p>
    </article>
  );
}
