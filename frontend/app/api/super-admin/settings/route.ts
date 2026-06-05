import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }
    return NextResponse.json(settingsMap);
  } catch (error: any) {
    console.error("Error retrieving settings: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json(); // Expected format: { [key: string]: any }
    
    // Perform upsert for each setting in a transaction
    await prisma.$transaction(
      Object.entries(body).map(([key, val]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(val) },
          create: { key, value: String(val) },
        })
      )
    );

    return NextResponse.json({ status: "success", message: "Settings saved successfully." });
  } catch (error: any) {
    console.error("Error saving settings: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
