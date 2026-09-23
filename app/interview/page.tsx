import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import InterviewModePicker from "@/components/InterviewModePicker";

export default async function InterviewPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("careerai_session")?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <a
          href="/dashboard"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Dashboard
        </a>

        <div className="mt-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            AI Mock Interview
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Choose your interview practice mode
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
            CareerAI will generate new role-specific questions, evaluate your
            answers with Gemini, and create a final performance report.
          </p>
        </div>

        <InterviewModePicker />
      </div>
    </main>
  );
}