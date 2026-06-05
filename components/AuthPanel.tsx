"use client";

import { FormEvent, useState } from "react";
import { Box, CheckCircle2, Layers3, LoaderCircle, LogIn, Moon, ShieldCheck, Sun, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { User } from "@/components/AppShell";
import { useTabBusy } from "@/components/useTabBusy";

type Props = {
  onAuthenticated: (user: User) => void;
};

export default function AuthPanel({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  useTabBusy(busy, mode === "login" ? "Signing in" : "Creating account");

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
    <main className={nightMode ? "auth-page auth-night" : "auth-page"}>
      <section className="auth-panel">
        <button className={nightMode ? "auth-night-toggle active" : "auth-night-toggle"} type="button" onClick={() => setNightMode((current) => !current)}>
          {nightMode ? <Sun size={17} /> : <Moon size={17} />}
          {nightMode ? "Day mode" : "Night mode"}
        </button>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="auth-copy"
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <span className="eyebrow">3D Scene Workspace</span>
          <h1>Build and save playful rooms</h1>
          <p>Sign in to open your private editor, arrange 3D objects, switch room moods, and keep every scene synced to your account.</p>
          <div className="auth-highlights">
            <span><CheckCircle2 size={16} /> Saved layouts</span>
            <span><Layers3 size={16} /> Three room styles</span>
            <span><ShieldCheck size={16} /> Session protected</span>
          </div>
        </motion.div>

        <motion.form
          animate={{ opacity: 1, y: 0 }}
          className="auth-form"
          initial={{ opacity: 0, y: 18 }}
          onSubmit={submit}
          transition={{ duration: 0.38, delay: 0.08, ease: "easeOut" }}
        >
          <div className="form-heading">
            <div className="form-icon">
              <Box size={20} />
            </div>
            <div>
              <strong>{mode === "login" ? "Welcome back" : "Create your workspace"}</strong>
              <span>{mode === "login" ? "Continue designing from your saved room." : "Start saving your own 3D layouts."}</span>
            </div>
          </div>

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
              {busy ? <LoaderCircle className="spin-icon" size={18} /> : mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
              {busy ? "Working..." : mode === "login" ? "Open editor" : "Create account"}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Create account instead" : "Login instead"}
            </button>
          </div>
        </motion.form>
      </section>

      <section className="auth-preview" aria-hidden="true">
        <div className="preview-stage">
          <div className="preview-grid" />
          <motion.div animate={{ opacity: 1, y: 0 }} className="preview-window" initial={{ opacity: 0, y: 24 }} transition={{ duration: 0.55, ease: "easeOut" }}>
            <div className="preview-topbar">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-room">
              <div className="room-wall" />
              <div className="room-floor" />
              <div className="room-sofa" />
              <div className="room-table" />
              <div className="room-plant" />
              <div className="room-cube" />
              <div className="room-sphere" />
            </div>
            <motion.div animate={{ y: [0, -6, 0] }} className="preview-card" transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}>
              <strong>Room saved</strong>
              <span>Objects, lights, and mood restored after login</span>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
