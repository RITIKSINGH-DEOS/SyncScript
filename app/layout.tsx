import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyncScript - Custom Timestamps for AI Video Creators",
  description: "Convert audio into custom interval and symbol-aligned timestamped transcripts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
