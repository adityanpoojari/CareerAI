import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { gemini } from "@/lib/gemini";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rateLimit";

const validInterviewTypes = [
  "HR Interview",
  "Technical Interview",
  "Resume Interview",
  "Mixed Interview",
];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("careerai_session")?.value;
    const user = token ? await verifySessionToken(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to start an interview." },
        { status: 401 }
      );
    }

    if (isRateLimited(`interview-start:${user.userId}`, 6, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "You can start up to 6 AI interviews per hour. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const interviewType =
      typeof body.interviewType === "string" ? body.interviewType : "";

    if (!validInterviewTypes.includes(interviewType)) {
      return NextResponse.json(
        { error: "Please choose a valid interview type." },
        { status: 400 }
      );
    }

    const latestResume = await prisma.resume.findFirst({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
    });

    const previousAnswers = await prisma.interviewAnswer.findMany({
      where: {
        interview: {
          userId: user.userId,
        },
      },
      select: {
        questionText: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    const targetRole = latestResume?.targetRole || "General Graduate Role";

    const previousQuestions = previousAnswers
      .map((answer) => answer.questionText)
      .join("\n- ");

    const resumeText = latestResume?.extractedText
      ? latestResume.extractedText.slice(0, 12000)
      : "No saved resume is available.";

    const prompt = `
You are CareerAI, a professional interview coach.

Generate exactly 5 fresh interview questions.

Target job role: ${targetRole}
Interview type: ${interviewType}

Resume text:
${resumeText}

Previously asked questions to avoid repeating:
- ${previousQuestions || "No previous questions"}

Rules:
- Do not repeat or closely reword previous questions.
- Make questions suitable for a candidate preparing for ${targetRole}.
- For Resume Interview, use projects, skills, education, or experience from the resume.
- For Technical Interview, focus on technical knowledge for the target role.
- For HR Interview, focus on communication and workplace behavior.
- For Mixed Interview, use a balanced mix.
- Return only valid JSON in this exact format:

{
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5"
  ]
}
`;

    const response = await gemini.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });

    const resultText = response.text?.trim();

    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    const result = JSON.parse(resultText);

    if (
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      throw new Error("Gemini did not return interview questions.");
    }

    const questions = result.questions
      .filter((question: unknown) => typeof question === "string")
      .map((question: string) => question.trim())
      .filter(Boolean)
      .slice(0, 5);

    const interview = await prisma.interview.create({
      data: {
        userId: user.userId,
        targetRole,
        interviewType,
      },
    });

    await prisma.question.createMany({
      data: questions.map((question: string) => ({
        category: interviewType,
        targetRole,
        difficulty: "Medium",
        questionText: question,
      })),
    });

    return NextResponse.json({
      interviewId: interview.id,
      targetRole,
      interviewType,
      questions,
    });
  } catch (error) {
    console.error("Interview start error:", error);

    return NextResponse.json(
      {
        error:
          "CareerAI could not start the interview right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
