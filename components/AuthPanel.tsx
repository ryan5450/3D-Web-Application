"use client";

import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
      toast.error(data.error || "Authentication failed.");
      return;
    }

    toast.success(mode === "login" ? "Welcome back" : "Account created");
    onAuthenticated(data.user);
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="auth-copy"
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <span className="eyebrow">Scene Workspace</span>
          <h1>Design rooms in 3D</h1>
          <p>Sign in to continue your saved layout, place objects naturally, and refine each room without losing your progress.</p>
        </motion.div>

        <motion.form
          animate={{ opacity: 1, y: 0 }}
          className="auth-form"
          initial={{ opacity: 0, y: 18 }}
          onSubmit={submit}
          transition={{ duration: 0.38, delay: 0.08, ease: "easeOut" }}
        >
          <div className="mode-switch" aria-label="Authentication mode">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
              Login
            </button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
              Signup
            </button>
          </div>

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
              {busy ? "Working..." : mode === "login" ? "Enter workspace" : "Create workspace"}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "New here?" : "Already have access?"}
            </button>
          </div>
        </motion.form>
      </section>

      <section className="auth-preview" aria-hidden="true">
        <div className="preview-grid" />
        <motion.div
          animate={{ rotate: 18, y: [0, -10, 0] }}
          className="preview-shape shape-a"
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          animate={{ y: [0, 14, 0], scale: [1, 1.05, 1] }}
          className="preview-shape shape-b"
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="preview-card">
          <strong>Room 02</strong>
          <span>12 objects saved</span>
        </div>
      </section>
    </main>
  );
}
