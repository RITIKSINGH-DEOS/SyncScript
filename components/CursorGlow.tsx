"use client";

import React, { useEffect, useRef, useState } from "react";

export function CursorGlow() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // References for smooth buttery lerp physics
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const glowRef = useRef<HTMLDivElement>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);

    // Initial position in center of viewport
    const initX = typeof window !== "undefined" ? window.innerWidth / 2 : 400;
    const initY = typeof window !== "undefined" ? window.innerHeight / 3 : 300;
    targetPos.current = { x: initX, y: initY };
    currentPos.current = { x: initX, y: initY };

    const handlePointerMove = (e: PointerEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    // Smooth animation loop using lerp (Linear Interpolation)
    const animate = () => {
      // 0.08 ease factor creates a luxurious, fluid, spreaded aura following the cursor
      const ease = 0.08;
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * ease;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      animFrameId.current = requestAnimationFrame(animate);
    };

    animFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isVisible]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* Primary Wide-Spread Ambient Glow following cursor */}
      <div
        ref={glowRef}
        className={`absolute top-0 left-0 will-change-transform transition-opacity duration-700 ease-out pointer-events-none ${
          isVisible ? "opacity-100" : "opacity-0 sm:opacity-30"
        }`}
        style={{
          width: "720px",
          height: "720px",
        }}
      >
        {/* Dark Mode Ambient Radial Glow: Soft diffused Indigo, Violet & Sky */}
        <div className="hidden dark:block w-full h-full rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22)_0%,rgba(139,92,246,0.12)_30%,rgba(56,189,248,0.06)_55%,transparent_75%)] filter blur-3xl" />

        {/* Light Mode Ambient Radial Glow: Soft diffused Indigo, Purple & Sky */}
        <div className="block dark:hidden w-full h-full rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14)_0%,rgba(168,85,247,0.09)_30%,rgba(59,130,246,0.05)_55%,transparent_75%)] filter blur-3xl" />
      </div>

      {/* Subtle floating background ambient lights for atmospheric depth */}
      <div className="absolute -top-32 right-1/4 w-[480px] h-[480px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 filter blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute top-1/2 -left-32 w-[420px] h-[420px] rounded-full bg-violet-500/5 dark:bg-purple-600/10 filter blur-3xl pointer-events-none animate-pulse duration-[10000ms]" />
    </div>
  );
}
