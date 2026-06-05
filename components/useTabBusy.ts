"use client";

import { useEffect } from "react";

const defaultTitle = "3D Web Application";
const defaultIcon = "/icon.svg";

function busyIcon(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#0f172a"/>
      <circle cx="32" cy="32" r="20" fill="none" stroke="#93c5fd" stroke-width="7" opacity=".35"/>
      <path d="M32 12a20 20 0 0 1 20 20" fill="none" stroke="#14b8a6" stroke-linecap="round" stroke-width="7"/>
      <circle cx="32" cy="32" r="7" fill="#f8fafc"/>
      <title>${label}</title>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function setIcon(href: string) {
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (!icon) {
    icon = document.createElement("link");
    icon.rel = "icon";
    document.head.appendChild(icon);
  }

  icon.href = href;
}

export function useTabBusy(isBusy: boolean, label = "Loading") {
  useEffect(() => {
    if (!isBusy) return;

    const previousTitle = document.title;
    const previousIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href;

    document.title = `${label}... - ${defaultTitle}`;
    setIcon(busyIcon(label));

    return () => {
      document.title = previousTitle || defaultTitle;
      setIcon(previousIcon || defaultIcon);
    };
  }, [isBusy, label]);
}
