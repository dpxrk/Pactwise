import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: "Unauthorized",
        message: "Please sign in to access this endpoint"
      }, { status: 401 });
    }

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await (supabase as any)
      .from('users')
      .select('id, email, first_name, last_name, role, enterprise_id, job_title, created_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({
        error: "Profile not found",
        message: "User profile could not be retrieved"
      }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        ...((profile as Record<string, unknown>) || {})
      }
    });
  } catch (error) {
    console.error('User endpoint error:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}
