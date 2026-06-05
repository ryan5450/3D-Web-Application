"use client";

import { useEffect } from "react";

const defaultTitle = "3D Web Application";
const defaultIcon = "/icon.svg";

function busyIcon(label: string, frame: number) {
  const rotation = frame * 45;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#202124"/>
      <g transform="rotate(${rotation} 32 32)">
        <circle cx="32" cy="32" r="17" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-dasharray="28 78"/>
      </g>
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
    let frame = 0;

    document.title = `${label}... - ${defaultTitle}`;
    setIcon(busyIcon(label, frame));

    const interval = window.setInterval(() => {
      frame = (frame + 1) % 8;
      setIcon(busyIcon(label, frame));
    }, 110);

    return () => {
      window.clearInterval(interval);
      document.title = previousTitle || defaultTitle;
      setIcon(previousIcon || defaultIcon);
    };
  }, [isBusy, label]);
}
