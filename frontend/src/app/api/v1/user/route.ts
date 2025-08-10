import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Replace with Supabase authentication
  console.log("TODO: Implement Supabase user endpoint");
  
  return NextResponse.json({
    message: "User endpoint under construction - will be implemented with Supabase",
    status: "coming_soon"
  }, { status: 501 });
}