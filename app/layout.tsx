import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-surface text-txt">
        <main className="min-h-screen relative flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
