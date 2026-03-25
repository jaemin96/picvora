import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.display_name ?? "",
    username: user.user_metadata?.username ?? "",
    avatar_url: user.user_metadata?.avatar_url ?? "",
  });
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Update user metadata (display_name, username)
  if (body.display_name !== undefined || body.username !== undefined || body.avatar_url !== undefined) {
    updates.data = {
      ...user.user_metadata,
      ...(body.display_name !== undefined && { display_name: body.display_name }),
      ...(body.username !== undefined && { username: body.username }),
      ...(body.avatar_url !== undefined && { avatar_url: body.avatar_url }),
    };
  }

  // Update email
  if (body.email && body.email !== user.email) {
    updates.email = body.email;
  }

  // Update password
  if (body.password) {
    updates.password = body.password;
  }

  const { error } = await supabase.auth.updateUser(updates);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Re-fetch updated user
  const { data: { user: updated } } = await supabase.auth.getUser();

  return NextResponse.json({
    id: updated!.id,
    email: updated!.email,
    display_name: updated!.user_metadata?.display_name ?? "",
    username: updated!.user_metadata?.username ?? "",
    avatar_url: updated!.user_metadata?.avatar_url ?? "",
  });
}
