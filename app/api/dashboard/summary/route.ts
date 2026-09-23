import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("careerai_session")?.value;
    const user = token ? await verifySessionToken(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: "Not logged in." },
        { status: 401 }
      );
    }

    const [latestResume, completedInterviewCount, answerCount, scoreResult] =
      await Promise.all([
        prisma.resume.findFirst({
          where: { userId: user.userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.interview.count({
          where: {
            userId: user.userId,
            completedAt: {
              not: null,
            },
          },
        }),
        prisma.interviewAnswer.count({
          where: {
            interview: {
              userId: user.userId,
            },
          },
        }),
        prisma.interview.aggregate({
          where: {
            userId: user.userId,
            completedAt: {
              not: null,
            },
          },
          _avg: {
            overallScore: true,
          },
        }),
      ]);

    const resumeScore = latestResume?.overallScore ?? null;

    const averageInterviewScore =
      scoreResult._avg.overallScore !== null
        ? Math.round(scoreResult._avg.overallScore)
        : null;

    let skillsCount = 0;

    if (latestResume?.reportJson) {
      try {
        const report = JSON.parse(latestResume.reportJson);

        if (Array.isArray(report.detectedSkills)) {
          skillsCount = report.detectedSkills.length;
        }
      } catch {
        skillsCount = 0;
      }
    }

    const activityScore = Math.min(100, Math.round((answerCount / 25) * 100));

    const scoreParts: { score: number; weight: number }[] = [];

    if (resumeScore !== null) {
      scoreParts.push({ score: resumeScore, weight: 0.5 });
    }

    if (averageInterviewScore !== null) {
      scoreParts.push({ score: averageInterviewScore, weight: 0.4 });
    }

    if (answerCount > 0) {
      scoreParts.push({ score: activityScore, weight: 0.1 });
    }

    const totalWeight = scoreParts.reduce(
      (total, item) => total + item.weight,
      0
    );

    const careerReadiness =
      totalWeight > 0
        ? Math.round(
            scoreParts.reduce(
              (total, item) => total + item.score * item.weight,
              0
            ) / totalWeight
          )
        : null;

    return NextResponse.json({
      careerReadiness,
      latestResumeScore: resumeScore,
      averageInterviewScore,
      skillsCount,
      completedInterviewCount,
      answerCount,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return NextResponse.json(
      { error: "Could not load dashboard summary." },
      { status: 500 }
    );
  }
}