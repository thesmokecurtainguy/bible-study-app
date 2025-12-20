import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studyId } = body;

    if (!studyId) {
      return NextResponse.json(
        { error: "Study ID is required" },
        { status: 400 }
      );
    }

    // Get study details
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        isPublished: true,
        isPremium: true,
      },
    });

    if (!study) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    if (!study.isPublished) {
      return NextResponse.json(
        { error: "Study is not available for purchase" },
        { status: 400 }
      );
    }

    // Check if user already owns this study
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        userId: session.user.id,
        studyId: study.id,
        status: "completed",
      },
    });

    if (existingPurchase) {
      return NextResponse.json(
        { error: "You already own this study" },
        { status: 400 }
      );
    }

    // Price is already stored in cents (e.g., 1999 = $19.99)
    const priceInCents = study.price
      ? Math.round(Number(study.price))
      : 0;

    if (priceInCents <= 0) {
      return NextResponse.json(
        { error: "Invalid study price" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: study.title,
              description: study.description || undefined,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/purchase/cancel`,
      metadata: {
        userId: session.user.id,
        studyId: study.id,
      },
      customer_email: session.user.email,
    });

    return NextResponse.json(
      {
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

