import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { gemini } from "@/lib/gemini";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("careerai_session")?.value;
    const user = token ? await verifySessionToken(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to evaluate an answer." },
        { status: 401 }
      );
    }

    if (isRateLimited(`interview-evaluation:${user.userId}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "You have reached the hourly answer-evaluation limit. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const interviewId =
      typeof body.interviewId === "string" ? body.interviewId : "";

    const questionText =
      typeof body.questionText === "string" ? body.questionText.trim() : "";

    const userAnswer =
      typeof body.userAnswer === "string" ? body.userAnswer.trim() : "";

    const isFinalQuestion = body.isFinalQuestion === true;

    if (!interviewId || !questionText || !userAnswer) {
      return NextResponse.json(
        { error: "Interview, question, and answer are required." },
        { status: 400 }
      );
    }

    const interview = await prisma.interview.findFirst({
      where: {
        id: interviewId,
        userId: user.userId,
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview session was not found." },
        { status: 404 }
      );
    }

    const prompt = `
You are CareerAI, an expert interview evaluator.

Evaluate the candidate's answer.

Target role: ${interview.targetRole}
Interview type: ${interview.interviewType}

Question:
${questionText}

Candidate answer:
${userAnswer}

Return only valid JSON in this exact format:
{
  "score": 0,
  "technicalCorrectness": "",
  "relevance": "",
  "completeness": "",
  "communication": "",
  "missingConcepts": [],
  "feedback": ""
}

Rules:
- score must be a whole number from 0 to 100.
- Be constructive and specific.
- Do not invent facts about the candidate.
- missingConcepts must contain a maximum of 4 items.
`;

    const response = await gemini.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const resultText = response.text?.trim();

    if (!resultText) {
      throw new Error("Gemini returned an empty evaluation.");
    }

    const evaluation = JSON.parse(resultText);
    const score = Number(evaluation.score);

    const safeScore = Number.isFinite(score)
      ? Math.min(100, Math.max(0, Math.round(score)))
      : 0;

    await prisma.interviewAnswer.create({
      data: {
        interviewId,
        questionText,
        userAnswer,
        score: safeScore,
        feedback: JSON.stringify(evaluation),
      },
    });

    let overallScore: number | null = null;

    if (isFinalQuestion) {
      const scoreResult = await prisma.interviewAnswer.aggregate({
        where: { interviewId },
        _avg: {
          score: true,
        },
      });

      overallScore = scoreResult._avg.score
        ? Math.round(scoreResult._avg.score)
        : 0;

      await prisma.interview.update({
        where: { id: interviewId },
        data: {
          overallScore,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      evaluation: {
        ...evaluation,
        score: safeScore,
      },
      overallScore,
    });
  } catch (error) {
    console.error("Interview evaluation error:", error);

    return NextResponse.json(
      {
        error:
          "CareerAI could not evaluate the answer right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
