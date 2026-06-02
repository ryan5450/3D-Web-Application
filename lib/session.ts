import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AppSession = {
  userId?: string;
  email?: string;
};

export const sessionOptions: SessionOptions = {
  cookieName: "three_scene_session",
  password:
    process.env.SESSION_PASSWORD ||
    "development-secret-change-me-32-characters",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }
};

export async function getSession() {
  return getIronSession<AppSession>(await cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();

  if (!session.userId) {
    return { session, userId: null };
  }

  return { session, userId: session.userId };
}
