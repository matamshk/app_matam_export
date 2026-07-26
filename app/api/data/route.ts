import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get("year");
  const monthStr = searchParams.get("month");

  if (!yearStr) {
    return NextResponse.json({ error: "السنة الهجرية مطلوبة" }, { status: 400 });
  }

  const hijriYear = parseInt(yearStr, 10);
  
  try {
    const yearObj = await prisma.year.findUnique({
      where: { hijriYear },
      include: {
        months: {
          orderBy: { monthNumber: "asc" },
          include: {
            days: {
              orderBy: { gregorianDate: "asc" }
            }
          }
        }
      }
    });

    if (!yearObj) {
      return NextResponse.json({ error: "السنة المطلوبة غير موجودة في قاعدة البيانات" }, { status: 404 });
    }

    // Fetch central events (occasions) to dynamically overlay them
    const occasions = await prisma.event.findMany({
      where: { isPublished: true, displayInCalendar: true }
    });

    // Handle month-specific filtering if requested
    if (monthStr) {
      const monthNum = parseInt(monthStr, 10);
      const month = yearObj.months.find((m: any) => m.monthNumber === monthNum);
      if (!month) {
        return NextResponse.json({ error: "الشهر المطلوب غير موجود" }, { status: 404 });
      }
      return NextResponse.json({ month, occasions });
    }

    return NextResponse.json({ year: yearObj, occasions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
