"use client";

import { useEffect, useState } from "react";
import AuthPanel from "@/components/AuthPanel";
import SceneEditor from "@/components/SceneEditor";

export type User = {
  email: string;
};

export default function AppShell() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const response = await fetch("/api/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <h1>3D Web Application</h1>
          <p>Loading your workspace...</p>
        </section>
        <section className="auth-preview" />
      </main>
    );
  }

  if (!user) {
    return <AuthPanel onAuthenticated={setUser} />;
  }

  return <SceneEditor user={user} onLogout={() => setUser(null)} />;
}
