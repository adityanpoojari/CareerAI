import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { gemini } from "@/lib/gemini";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const validTracks = [
  "DSA Practice",
  "Java Coding",
  "Python Coding",
  "Web Development",
];

const validDifficulties = ["Easy", "Medium", "Hard"];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("careerai_session")?.value;
    const user = token ? await verifySessionToken(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to start a coding challenge." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const track = typeof body.track === "string" ? body.track : "";
    const difficulty =
      typeof body.difficulty === "string" ? body.difficulty : "";

    if (!validTracks.includes(track)) {
      return NextResponse.json(
        { error: "Please choose a valid coding track." },
        { status: 400 }
      );
    }

    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: "Please choose Easy, Medium, or Hard difficulty." },
        { status: 400 }
      );
    }

    const recentSubmissions = await prisma.codingSubmission.findMany({
      where: {
        userId: user.userId,
      },
      select: {
        problemName: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 15,
    });

    const oldProblemNames = recentSubmissions
      .map((submission) => submission.problemName)
      .join("\n- ");

    const prompt = `
You are CareerAI, an interview coding-challenge creator.

Create exactly one fresh coding problem.

Track: ${track}
Difficulty: ${difficulty}

Previously assigned problem names to avoid:
- ${oldProblemNames || "No previous problems"}

Return only valid JSON in exactly this format:
{
  "title": "",
  "description": "",
  "inputFormat": "",
  "outputFormat": "",
  "constraints": [],
  "examples": [
    {
      "input": "",
      "output": "",
      "explanation": ""
    }
  ],
  "starterCode": {
    "python": "",
    "java": "",
    "javascript": ""
  },
  "hints": []
}

Rules:
- Make it suitable for a technical job interview.
- Do not repeat or closely reword old problems.
- Include one clear example.
- Provide short starter code for Python, Java, and JavaScript.
- Do not include the full solution.
- Keep hints to at most 3.
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
      throw new Error("Gemini returned an empty coding problem.");
    }

    const problem = JSON.parse(resultText);

    if (
      typeof problem.title !== "string" ||
      typeof problem.description !== "string"
    ) {
      throw new Error("Gemini returned an invalid coding problem.");
    }

    return NextResponse.json({
      track,
      difficulty,
      problem,
    });
  } catch (error) {
    console.error("Coding problem generation error:", error);

    return NextResponse.json(
      {
        error:
          "CareerAI could not create a coding problem right now. Please try again.",
      },
      { status: 500 }
    );
  }
}