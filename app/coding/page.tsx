import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import CodingTrackPicker from "@/components/CodingTrackPicker";

export default async function CodingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("careerai_session")?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-5 text-sm font-medium">
          <a href="/dashboard" className="text-cyan-400 hover:text-cyan-300">← Back to Dashboard</a>
          <a href="/coding/history" className="text-violet-300 hover:text-violet-200">View Coding History →</a>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            CareerAI Coding Round
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Practice coding for real interviews
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
            Choose a track and difficulty. CareerAI will generate a fresh
            non-repeated coding challenge tailored to your practice.
          </p>
        </div>

        <CodingTrackPicker />
      </div>
    </main>
  );
}
