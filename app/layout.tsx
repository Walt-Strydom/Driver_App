import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-surface text-txt">
        <AuthProvider>
          <main className="min-h-screen relative flex flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
