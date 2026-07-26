"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تسجيل الدخول");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-border-custom p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <img src="/branding/logo-primary.png" alt="شعار المأتم" className="h-16 mx-auto mb-4 object-contain" />
          <h2 className="text-2xl font-bold text-text-primary">لوحة الإدارة والمواقيت</h2>
          <p className="text-sm text-text-secondary mt-1">مأتم أبو صيبع الشرقي</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">اسم المستخدم</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-primary transition text-sm"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">كلمة المرور</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2.5 rounded-lg focus:outline-none focus:border-emerald-primary transition text-sm"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-primary hover:bg-emerald-primary/95 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-50 text-sm"
          >
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
