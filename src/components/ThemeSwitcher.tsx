"use client";

import React, { useSyncExternalStore } from "react";

export type FLSTheme = "night" | "day";

interface ThemeSwitcherProps {
  className?: string;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleCustom = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "fls_theme" && (e.newValue === "day" || e.newValue === "night")) {
      document.documentElement.setAttribute("data-theme", e.newValue);
      callback();
    }
  };

  window.addEventListener("fls_theme_change", handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("fls_theme_change", handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): FLSTheme {
  if (typeof document === "undefined") return "night";
  const docTheme = document.documentElement.getAttribute("data-theme") as FLSTheme | null;
  if (docTheme === "day" || docTheme === "night") return docTheme;

  try {
    const stored = localStorage.getItem("fls_theme") as FLSTheme | null;
    if (stored === "day" || stored === "night") return stored;
  } catch {
    // ignore
  }

  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "day";
  }

  return "night";
}

function getServerSnapshot(): FLSTheme {
  return "night";
}

export function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextTheme: FLSTheme = theme === "night" ? "day" : "night";
    document.documentElement.setAttribute("data-theme", nextTheme);

    try {
      localStorage.setItem("fls_theme", nextTheme);
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fls_theme_change", { detail: { theme: nextTheme } })
      );
    }
  };

  const isDay = theme === "day";
  const actionLabel = isDay ? "Switch to Night theme" : "Switch to Day theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`fls-theme-toggle ${className}`}
      title={actionLabel}
      aria-label={actionLabel}
      aria-pressed={isDay}
      data-active-theme={theme}
    >
      {isDay ? (
        // When in Day mode, show Moon icon to switch to Night
        <svg
          className="w-4 h-4 text-[var(--foreground)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // When in Night mode, show Sun icon to switch to Day
        <svg
          className="w-4 h-4 text-[var(--foreground)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}
