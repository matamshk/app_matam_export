import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // Fetch Site Settings
  let settings = await prisma.siteSettings.findUnique({
    where: { id: "global" }
  });

  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: { id: "global" }
    });
  }

  // Form action handler inside Server Component
  async function updateSettings(formData: FormData) {
    "use server";
    const whatsappPhone = formData.get("whatsappPhone") as string;
    const socialUsername = formData.get("socialUsername") as string;
    const instagramUrl = formData.get("instagramUrl") as string;
    const facebookUrl = formData.get("facebookUrl") as string;
    const xUrl = formData.get("xUrl") as string;
    const youtubeUrl = formData.get("youtubeUrl") as string;

    await prisma.siteSettings.update({
      where: { id: "global" },
      data: {
        whatsappPhone,
        socialUsername,
        instagramUrl,
        facebookUrl,
        xUrl,
        youtubeUrl
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        username: session?.username || "admin",
        action: "تحديث الإعدادات العامة",
        newValue: `الواتس أب: ${whatsappPhone} | المعرف: ${socialUsername}`
      }
    });

    redirect("/admin");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">إعدادات الموقع والتواصل</h2>
          <p className="text-sm text-text-secondary mt-1">تحديث قنوات الاتصال والروابط الرسمية للمأتم</p>
        </div>
        <Link href="/admin" className="bg-white border border-border-custom px-4 py-2 rounded-lg text-sm hover:bg-emerald-light/5 transition">
          عودة للوحة
        </Link>
      </div>

      <div className="bg-white border border-border-custom rounded-2xl p-6 shadow-sm">
        <form action={updateSettings} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">رقم خدمة الواتس أب (WhatsApp)</label>
            <input 
              type="text" 
              name="whatsappPhone"
              defaultValue={settings.whatsappPhone}
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2 rounded-lg text-sm"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">اسم مستخدم التواصل الاجتماعي (Handle)</label>
            <input 
              type="text" 
              name="socialUsername"
              defaultValue={settings.socialUsername}
              placeholder="مثال: matam_abusaiba"
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2 rounded-lg text-sm"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">رابط الانستغرام (Instagram URL)</label>
            <input 
              type="url" 
              name="instagramUrl"
              defaultValue={settings.instagramUrl || ""}
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">رابط الفيسبوك (Facebook URL)</label>
            <input 
              type="url" 
              name="facebookUrl"
              defaultValue={settings.facebookUrl || ""}
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">رابط إكس (X / Twitter URL)</label>
            <input 
              type="url" 
              name="xUrl"
              defaultValue={settings.xUrl || ""}
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">رابط اليوتيوب (YouTube URL)</label>
            <input 
              type="url" 
              name="youtubeUrl"
              defaultValue={settings.youtubeUrl || ""}
              className="w-full bg-emerald-light/5 border border-border-custom px-4 py-2 rounded-lg text-sm"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-primary hover:bg-emerald-primary/95 text-white font-bold py-2.5 rounded-lg text-sm transition"
          >
            حفظ التغييرات
          </button>
        </form>
      </div>
    </div>
  );
}

// Simple Link component import workaround
import Link from "next/link";
