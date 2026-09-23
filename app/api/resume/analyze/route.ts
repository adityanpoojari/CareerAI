import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { gemini } from "@/lib/gemini";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_RESUME_TEXT_LENGTH = 30000;

export async function POST(request: NextRequest) {
  try {
    const visitorKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-visitor";

    if (isRateLimited(`resume-analysis:${visitorKey}`, 8, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "You can analyze up to 8 resumes per hour. Please try again later." },
        { status: 429 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("resume");
    const targetRole = formData.get("targetRole");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a resume file." },
        { status: 400 }
      );
    }

    if (typeof targetRole !== "string" || !targetRole.trim()) {
      return NextResponse.json(
        { error: "Please select your target job role." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Your resume must be smaller than 5 MB." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let resumeText = "";

    if (fileName.endsWith(".pdf")) {
      const pdfParser = new PDFParse({ data: buffer });

      try {
        const pdfResult = await pdfParser.getText();
        resumeText = pdfResult.text;
      } finally {
        await pdfParser.destroy();
      }
    } else if (fileName.endsWith(".docx")) {
      const docxResult = await mammoth.extractRawText({ buffer });
      resumeText = docxResult.value;
    } else {
      return NextResponse.json(
        { error: "Only PDF and DOCX resumes are supported." },
        { status: 400 }
      );
    }

    resumeText = resumeText.trim();

    if (!resumeText) {
      return NextResponse.json(
        {
          error:
            "We could not read text from this file. Please upload a text-based PDF or DOCX resume.",
        },
        { status: 400 }
      );
    }

    const safeResumeText = resumeText.slice(0, MAX_RESUME_TEXT_LENGTH);

    const prompt = `
You are CareerAI, an expert resume reviewer.

Analyze this resume for the target job role below.

Target role: ${targetRole}

Resume text:
${safeResumeText}

Return only valid JSON in exactly this format:
{
  "overallScore": 0,
  "summary": "",
  "detectedSkills": [],
  "strengths": [],
  "weakAreas": [],
  "missingSkills": [],
  "recommendations": [],
  "suggestedInterviewQuestions": []
}

Rules:
- overallScore must be a whole number from 0 to 100.
- Give useful, specific suggestions.
- Do not invent skills, education, projects, or experience.
- Keep every array to a maximum of 6 items.
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
      throw new Error("Gemini returned an empty response.");
    }

    const analysis = JSON.parse(resultText);

    const cookieStore = await cookies();
    const token = cookieStore.get("careerai_session")?.value;
    const user = token ? await verifySessionToken(token) : null;

    let savedToAccount = false;

    if (user) {
      const score = Number(analysis.overallScore);

      await prisma.resume.create({
        data: {
          userId: user.userId,
          fileName: file.name,
          fileType: fileName.endsWith(".pdf") ? "PDF" : "DOCX",
          targetRole,
          extractedText: safeResumeText,
          reportJson: JSON.stringify(analysis),
          overallScore: Number.isFinite(score)
            ? Math.min(100, Math.max(0, Math.round(score)))
            : null,
        },
      });

      savedToAccount = true;
    }

    return NextResponse.json({
      ...analysis,
      savedToAccount,
    });
  } catch (error) {
    console.error("Resume analysis error:", error);

    return NextResponse.json(
      {
        error:
          "CareerAI could not analyze the resume right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
