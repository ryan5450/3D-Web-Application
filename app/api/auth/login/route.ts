import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/session";
import { User } from "@/models/User";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  await connectDB();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const matches = await bcrypt.compare(String(password || ""), user.passwordHash);
  if (!matches) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user._id.toString();
  session.email = user.email;
  await session.save();

  return NextResponse.json({ user: { email: user.email } });
}
