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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('syncscript_theme');
                  const theme = storedTheme || 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-indigo-500/30 selection:text-indigo-200 bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
