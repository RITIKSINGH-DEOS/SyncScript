"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("syncscript_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("syncscript_theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/60 dark:border-slate-700/60" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative p-2 rounded-xl bg-slate-200/70 hover:bg-slate-300/70 dark:bg-slate-800/70 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-300/70 dark:border-slate-700/70 transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center group"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
}
