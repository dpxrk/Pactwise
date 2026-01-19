import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

// Zod schema for validating PATCH request body
// Only allows safe, user-editable fields
const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone_number: z.string().max(20).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
}).strict(); // Reject any extra fields for security

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
    // Use auth_id to match against auth user ID (not the users table id)
    const { data: profile, error: profileError } = await (supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
          };
        };
      };
    })
      .from('users')
      .select('id, auth_id, email, first_name, last_name, phone_number, department, title, role, enterprise_id, created_at')
      .eq('auth_id', user.id)
      .single();

    if (profileError) {
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
  } catch {
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user - security best practice: always use getUser()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: "Unauthorized",
        message: "Please sign in to access this endpoint"
      }, { status: 401 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        error: "Bad Request",
        message: "Invalid JSON in request body"
      }, { status: 400 });
    }

    // Validate with Zod schema - only allows safe fields
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: "Validation Error",
        message: "Invalid request data",
        details: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: "Bad Request",
        message: "No valid fields provided for update"
      }, { status: 400 });
    }

    // Update user profile in the users table
    // Use auth_id filter to ensure we're updating the correct user (security critical)
    const { data: updatedProfile, error: updateError } = await (supabase as unknown as {
      from: (table: string) => {
        update: (data: Record<string, unknown>) => {
          eq: (column: string, value: string) => {
            select: (columns: string) => {
              single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
            };
          };
        };
      };
    })
      .from('users')
      .update(updateData)
      .eq('auth_id', user.id)
      .select('id, auth_id, email, first_name, last_name, phone_number, department, title, role, enterprise_id, created_at')
      .single();

    if (updateError) {
      return NextResponse.json({
        error: "Update failed",
        message: "Failed to update user profile"
      }, { status: 500 });
    }

    if (!updatedProfile) {
      return NextResponse.json({
        error: "Not found",
        message: "User profile not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        ...((updatedProfile as Record<string, unknown>) || {})
      },
      message: "Profile updated successfully"
    });
  } catch {
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}
