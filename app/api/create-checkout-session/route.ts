// app/api/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";

// This API route is not needed when using Stripe Payment Links
// Your donations page uses direct Stripe Payment Links which is simpler and better!
// Keeping this file to prevent 404 errors if anything references it

export async function POST(request: NextRequest) {
  // Since you're using Stripe Payment Links, this endpoint isn't needed
  // Payment Links handle everything on Stripe's side
  
  return NextResponse.json(
    { 
      message: "This endpoint is not needed. Donations use Stripe Payment Links directly.",
      info: "Your donation page redirects users to Stripe's hosted checkout."
    },
    { status: 200 }
  );
}

// Optional: Redirect to donations page if someone hits this endpoint
export async function GET() {
  return NextResponse.redirect(new URL('/donate', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}
