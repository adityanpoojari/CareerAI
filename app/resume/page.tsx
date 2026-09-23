"use client";

import {
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

const roleGroups = {
  CSE: [
    "Software Developer",
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Java Developer",
    "Python Developer",
    "AI / ML Engineer",
    "Data Analyst",
    "DevOps Engineer",
    "Cybersecurity Analyst",
    "QA / Test Engineer",
  ],
  EEE: [
    "Electrical Design Engineer",
    "Power Systems Engineer",
    "Control Systems Engineer",
    "PLC / Automation Engineer",
    "Embedded Systems Engineer",
    "Renewable Energy Engineer",
    "Electric Vehicle Engineer",
    "Maintenance Engineer",
  ],
  ECE: [
    "Embedded Systems Engineer",
    "VLSI Design Engineer",
    "FPGA Engineer",
    "IoT Engineer",
    "Telecom Engineer",
    "PCB Design Engineer",
    "Robotics Engineer",
    "Signal Processing Engineer",
    "Automotive Electronics Engineer",
  ],
};

type Category = keyof typeof roleGroups;

type ResumeAnalysis = {
  overallScore: number;
  summary: string;
  detectedSkills: string[];
  strengths: string[];
  weakAreas: string[];
  missingSkills: string[];
  recommendations: string[];
  suggestedInterviewQuestions: string[];
  savedToAccount?: boolean;
};

const categories: Category[] = ["CSE", "EEE", "ECE"];

export default function ResumePage() {
  const [category, setCategory] = useState<Category>("CSE");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  function processFile(file: File | undefined) {
    if (!file) return;

    const isSupported = /\.(pdf|docx)$/i.test(file.name);

    if (!isSupported) {
      setMessage("Please upload only a PDF or DOCX resume.");
      setSelectedFile(null);
      setFileName("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Your resume must be smaller than 5 MB.");
      setSelectedFile(null);
      setFileName("");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setMessage("");
    setAnalysis(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    processFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    processFile(event.dataTransfer.files?.[0]);
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setMessage("Please upload your resume first.");
      return;
    }

    if (!selectedRole) {
      setMessage("Please select your target job role.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");
      setAnalysis(null);

      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("targetRole", selectedRole);

      const response = await fetch("/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not analyze the resume.");
      }

      setAnalysis(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not analyze the resume. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function changeCategory(newCategory: Category) {
    setCategory(newCategory);
    setSelectedRole("");
    setMessage("");
    setAnalysis(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <a
          href="/"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          ← Back to CareerAI
        </a>

        <div className="mt-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Free Resume Analysis
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Discover what your resume is missing
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
            Choose your branch and target role, then upload your resume for a
            personalized CareerAI analysis.
          </p>
        </div>

        <section className="mt-12 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl md:p-10">
          <p className="text-sm font-semibold text-slate-200">
            1. Select your branch
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => changeCategory(item)}
                className={`rounded-xl border p-4 text-left transition ${
                  category === item
                    ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                }`}
              >
                <p className="font-bold">{item}</p>
                <p className="mt-1 text-xs opacity-80">
                  {item === "CSE" && "Computer Science roles"}
                  {item === "EEE" && "Electrical Engineering roles"}
                  {item === "ECE" && "Electronics & Communication roles"}
                </p>
              </button>
            ))}
          </div>

          <p className="mt-8 text-sm font-semibold text-slate-200">
            2. Select your target job role
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roleGroups[category].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setMessage("");
                  setAnalysis(null);
                }}
                className={`rounded-xl border p-4 text-left text-sm font-medium transition ${
                  selectedRole === role
                    ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <p className="mt-8 text-sm font-semibold text-slate-200">
            3. Upload your resume
          </p>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mt-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
              isDragging
                ? "border-cyan-400 bg-cyan-400/15"
                : "border-slate-600 bg-slate-800/60"
            }`}
          >
            <div className="text-4xl">📄</div>

            <p className="mt-3 font-semibold text-slate-200">
              {fileName || "Drag and drop your resume here"}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              or click below to choose a file
            </p>

            <label className="mt-5 inline-block cursor-pointer rounded-lg bg-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-600">
              Choose Resume
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <p className="mt-4 text-xs text-slate-500">
              PDF or DOCX — maximum file size: 5 MB
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="mt-8 w-full rounded-xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Analyzing your resume..." : "Analyze My Resume →"}
          </button>

          {message && (
            <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center text-sm text-red-200">
              {message}
            </p>
          )}

          <p className="mt-6 text-center text-xs text-slate-500">
            Guest users receive a resume report. Log in to automatically save
            reports and track career progress.
          </p>
        </section>

        {analysis && (
          <section className="mt-10 rounded-3xl border border-cyan-400/30 bg-slate-900 p-6 shadow-2xl md:p-10">
            <div className="flex flex-col gap-5 border-b border-slate-700 pb-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                  Your CareerAI report
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Resume Analysis Complete
                </h2>

                <p className="mt-2 text-slate-400">
                  Target role: {selectedRole}
                </p>
              </div>

              <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-8 border-cyan-400 bg-cyan-400/10">
                <span className="text-3xl font-bold text-cyan-300">
                  {analysis.overallScore}
                </span>
                <span className="text-xs text-slate-400">out of 100</span>
              </div>
            </div>

            <div className="mt-7">
              <h3 className="text-lg font-bold">Resume Summary</h3>
              <p className="mt-3 leading-7 text-slate-300">
                {analysis.summary}
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold">Detected Skills</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {analysis.detectedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <ReportList
                title="Your Strengths"
                items={analysis.strengths}
                color="text-emerald-300"
              />

              <ReportList
                title="Areas to Improve"
                items={analysis.weakAreas}
                color="text-amber-300"
              />

              <ReportList
                title="Missing Skills for This Role"
                items={analysis.missingSkills}
                color="text-red-300"
              />

              <ReportList
                title="Recommended Next Steps"
                items={analysis.recommendations}
                color="text-cyan-300"
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="text-lg font-bold">
                Resume-Based Interview Questions
              </h3>

              <ol className="mt-4 space-y-3">
                {analysis.suggestedInterviewQuestions.map(
                  (question, index) => (
                    <li
                      key={`${question}-${index}`}
                      className="rounded-xl bg-slate-900 p-4 leading-7 text-slate-300"
                    >
                      <span className="mr-2 font-bold text-cyan-400">
                        {index + 1}.
                      </span>
                      {question}
                    </li>
                  )
                )}
              </ol>
            </div>

            {analysis.savedToAccount ? (
              <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-center">
                <p className="font-semibold text-emerald-200">
                  ✓ This report has been saved to your CareerAI account.
                </p>

                <a
                  href="/dashboard"
                  className="mt-4 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300"
                >
                  View Dashboard →
                </a>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-center">
                <p className="font-semibold text-cyan-200">
                  Create an account to save this report and start mock
                  interviews.
                </p>

                <a
                  href="/"
                  className="mt-4 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300"
                >
                  Create a free account
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ReportList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
      <h3 className={`font-bold ${color}`}>{title}</h3>

      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className={color}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}