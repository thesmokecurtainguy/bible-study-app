import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPassage, normalizeReference, type Translation } from "@/lib/bible";

const MAX_REQUESTS_PER_DAY = 500; // ESV API free tier limit

// Simple in-memory rate limiting (resets on server restart)
// In production, consider using Redis or a database table
const requestCounts = new Map<string, number>();
const resetTime = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(): boolean {
  const now = Date.now();
  const today = Math.floor(now / resetTime);
  const key = `day-${today}`;
  const count = requestCounts.get(key) || 0;
  
  if (count >= MAX_REQUESTS_PER_DAY) {
    return false;
  }
  
  requestCounts.set(key, count + 1);
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get("reference");
    const translation = (searchParams.get("translation") || "ESV") as Translation;

    if (!reference) {
      return NextResponse.json(
        { error: "Reference parameter is required" },
        { status: 400 }
      );
    }

    const normalizedRef = normalizeReference(reference);

    // Check cache first
    const cached = await prisma.biblePassageCache.findUnique({
      where: {
        reference_translation: {
          reference: normalizedRef,
          translation,
        },
      },
    });

    if (cached) {
      return NextResponse.json({
        reference: cached.reference,
        passage: cached.passage,
        translation: cached.translation as Translation,
        source: "cache",
        bibleGatewayUrl: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=${translation}`,
      });
    }

    // Check rate limit
    if (!checkRateLimit()) {
      return NextResponse.json(
        {
          reference,
          passage: null,
          translation,
          source: "fallback",
          bibleGatewayUrl: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=${translation}`,
          error: "Rate limit exceeded. Please use BibleGateway link.",
        },
        { status: 429 }
      );
    }

    // Fetch from API
    const result = await getPassage(reference, translation);

    // Cache successful API results
    if (result.passage && result.source === "api") {
      try {
        await prisma.biblePassageCache.create({
          data: {
            reference: normalizedRef,
            translation,
            passage: result.passage,
          },
        });
      } catch (error) {
        // Ignore cache errors (e.g., duplicate key)
        console.warn("Failed to cache passage:", error);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Bible passage:", error);
    
    const reference = request.nextUrl.searchParams.get("reference") || "";
    const translation = (request.nextUrl.searchParams.get("translation") || "ESV") as Translation;

    return NextResponse.json(
      {
        reference,
        passage: null,
        translation,
        source: "fallback",
        bibleGatewayUrl: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=${translation}`,
        error: "Failed to fetch passage. Please use BibleGateway link.",
      },
      { status: 500 }
    );
  }
}

