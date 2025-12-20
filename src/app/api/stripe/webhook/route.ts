import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const userId = session.metadata?.userId;
      const studyId = session.metadata?.studyId;

      if (!userId || !studyId) {
        console.error("Missing metadata in checkout session:", session.id);
        return NextResponse.json(
          { error: "Missing required metadata" },
          { status: 400 }
        );
      }

      // Get study price
      const study = await prisma.study.findUnique({
        where: { id: studyId },
        select: { price: true },
      });

      if (!study) {
        console.error("Study not found:", studyId);
        return NextResponse.json(
          { error: "Study not found" },
          { status: 404 }
        );
      }

      // Calculate access expiration (1 year from now)
      const accessExpiresAt = new Date();
      accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + 1);

      // Create purchase record
      await prisma.purchase.create({
        data: {
          userId,
          studyId,
          amount: study.price || 0,
          status: "completed",
          paymentId: session.id,
          accessExpiresAt,
        },
      });

      console.log(`Purchase created for user ${userId}, study ${studyId}`);
    } catch (error) {
      console.error("Error processing webhook:", error);
      return NextResponse.json(
        { error: "Error processing webhook" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}

