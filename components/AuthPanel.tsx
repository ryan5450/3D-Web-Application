"use client";

import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import type { User } from "@/components/AppShell";

type Props = {
  onAuthenticated: (user: User) => void;
};

export default function AuthPanel({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Authentication failed.");
      return;
    }

    onAuthenticated(data.user);
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <h1>3D Web Application</h1>
          <p>
            Sign in to load your saved scene, add 3D objects, drag them around,
            and save the layout to MongoDB.
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />
          </label>

          <div className="error">{error}</div>

          <div className="auth-actions">
            <button className="primary" disabled={busy} type="submit">
              {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
              {busy ? "Working..." : mode === "login" ? "Login" : "Signup"}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Create account" : "Use login"}
            </button>
          </div>
        </form>
      </section>

      <section className="auth-preview" aria-hidden="true">
        <div className="preview-grid" />
        <div className="preview-shape shape-a" />
        <div className="preview-shape shape-b" />
      </section>
    </main>
  );
}
