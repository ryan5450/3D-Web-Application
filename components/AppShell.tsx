"use client";

import { useEffect, useState } from "react";
import AuthPanel from "@/components/AuthPanel";
import SceneEditor from "@/components/SceneEditor";

export type User = {
  email: string;
};

export default function AppShell() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }

    loadUser();
  }, []);

  if (!user) {
    return <AuthPanel onAuthenticated={setUser} />;
  }

  return <SceneEditor user={user} onLogout={() => setUser(null)} />;
}
