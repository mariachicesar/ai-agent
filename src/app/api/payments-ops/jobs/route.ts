import { NextResponse } from "next/server";
import { listJobs } from "@/lib/payments-agent/store";

/**
 * Lists all async jobs for operational dashboard views.
 * Step 1: Read job store.
 * Step 2: Return jobs in latest-first order.
 */
export async function GET() {
  return NextResponse.json({ jobs: listJobs() });
}
