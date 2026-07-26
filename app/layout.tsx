import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "مواقيت الصلاة | مأتم أبو صيبع الشرقي",
  description: "التقويم الهجري ومواقيت الصلاة الرسمية لمأتم أبو صيبع الشرقي - مملكة البحرين",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if admin is logged in
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  let isLoggedIn = false;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || "fallback-secret-key-12345");
      isLoggedIn = true;
    } catch {}
  }

  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="bg-emerald-light/5 text-text-primary min-h-screen flex flex-col font-sans antialiased">
        {/* Header */}
        <header className="bg-emerald-primary text-white sticky top-0 z-50 shadow-md no-print">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            {/* Right: Branding */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <div className="w-10 h-10 bg-white/10 rounded-full flex justify-center items-center">
                <img src="/branding/logo-primary.png" alt="شعار المأتم" className="h-7 filter brightness-0 invert object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">مأتم أبو صيبع الشرقي</h1>
                <span className="text-xs text-gold-light font-medium">مملكة البحرين - أبو صيبع</span>
              </div>
            </Link>

            {/* Center: Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <a href="/index.html" className="hover:text-gold-light transition">الرئيسية</a>
              <a href="/awqaf.html" className="hover:text-gold-light transition">التقويم الهجري</a>
              <a href="/occasions.html" className="hover:text-gold-light transition">المناسبات</a>
            </nav>

            {/* Left: Admin Action */}
            <div>
              {isLoggedIn ? (
                <a href="/dashboard.html" className="bg-gold-primary hover:bg-gold-primary/90 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition">
                  لوحة التحكم
                </a>
              ) : (
                <a href="/login.html" className="bg-emerald-dark hover:bg-emerald-dark/80 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition">
                  دخول الإدارة
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-emerald-dark text-white py-8 border-t border-white/5 no-print">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-4">
              <img src="/branding/logo-primary.png" alt="مأتم أبو صيبع" className="h-12 mx-auto filter brightness-0 invert object-contain" />
            </div>
            
            <div className="flex justify-center gap-6 mb-6">
              <a href="https://instagram.com/matam_abusaiba" target="_blank" rel="noreferrer" className="text-white hover:text-gold-light transition text-xl">
                📸 instagram
              </a>
              <a href="https://wa.me/97334195510" target="_blank" rel="noreferrer" className="text-white hover:text-gold-light transition text-xl">
                💬 whatsapp
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-white hover:text-gold-light transition text-xl">
                📘 facebook
              </a>
            </div>
            
            <p className="text-xs text-white/50">جميع الحقوق محفوظة © مأتم أبو صيبع الشرقي 1448 هـ - 2026 م</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
