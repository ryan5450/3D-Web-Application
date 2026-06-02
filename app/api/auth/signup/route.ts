import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/session";
import { User } from "@/models/User";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !String(password || "").trim()) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (String(password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  await connectDB();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const user = await User.create({ email: normalizedEmail, passwordHash });
  const session = await getSession();

  session.userId = user._id.toString();
  session.email = user.email;
  await session.save();

  return NextResponse.json({ user: { email: user.email } });
}
