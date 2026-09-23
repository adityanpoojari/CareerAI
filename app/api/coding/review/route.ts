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
        { error: "Please log in to submit code." },
        { status: 401 }
      );
    }

    if (isRateLimited(`coding-review:${user.userId}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "You can submit up to 10 code reviews per hour. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const problemName =
      typeof body.problemName === "string"
        ? body.problemName.trim().slice(0, 150)
        : "";

    const problemDescription =
      typeof body.problemDescription === "string"
        ? body.problemDescription.trim().slice(0, 12000)
        : "";

    const language =
      typeof body.language === "string" ? body.language.trim() : "";

    const code =
      typeof body.code === "string" ? body.code.trim().slice(0, 20000) : "";

    if (!problemName || !problemDescription || !language || !code) {
      return NextResponse.json(
        { error: "Problem details, language, and code are required." },
        { status: 400 }
      );
    }

    const prompt = `
You are CareerAI, an expert technical interviewer and code reviewer.

Review the candidate's solution. Do not claim that you executed the code.
Assess it from static analysis only.

Problem:
${problemName}

Problem description:
${problemDescription}

Programming language:
${language}

Candidate code:
\`\`\`${language}
${code}
\`\`\`

Return only valid JSON in exactly this format:
{
  "score": 0,
  "estimatedStatus": "",
  "summary": "",
  "correctness": "",
  "bugsOrRisks": [],
  "edgeCases": [],
  "timeComplexity": "",
  "spaceComplexity": "",
  "improvements": []
}

Rules:
- score must be a whole number from 0 to 100.
- estimatedStatus must be one of: "Likely Correct", "Needs Improvement", "Likely Incorrect".
- Clearly state this is an estimate when code cannot be proven correct.
- bugsOrRisks, edgeCases, and improvements must have at most 4 items each.
- Be helpful, accurate, and concise.
`;

    const response = await gemini.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const resultText = response.text?.trim();

    if (!resultText) {
      throw new Error("Gemini returned an empty code review.");
    }

    const review = JSON.parse(resultText);
    const score = Number(review.score);

    const safeScore = Number.isFinite(score)
      ? Math.min(100, Math.max(0, Math.round(score)))
      : 0;

    await prisma.codingSubmission.create({
      data: {
        userId: user.userId,
        language,
        problemName,
        code,
        status:
          typeof review.estimatedStatus === "string"
            ? review.estimatedStatus
            : "AI Reviewed",
        score: safeScore,
        feedback: JSON.stringify({
          ...review,
          score: safeScore,
        }),
      },
    });

    return NextResponse.json({
      review: {
        ...review,
        score: safeScore,
      },
    });
  } catch (error) {
    console.error("Coding review error:", error);

    return NextResponse.json(
      {
        error:
          "CareerAI could not review your code right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
