// /app/api/sos/send/route.ts
import { NextResponse } from "next/server";

// Keep Netlify on Node runtime; avoid static optimization.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Placeholder endpoint (no server deps).
 * Your client-side "Send Test" already opens SMS/Mail apps,
 * so we just return OK here.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
