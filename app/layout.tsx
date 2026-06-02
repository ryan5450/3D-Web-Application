import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Web Application",
  description: "A session-backed 3D scene editor with MongoDB persistence"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
