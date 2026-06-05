import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { detail: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique name
    const uniqueId = crypto.randomUUID();
    let ext = ".jpg";
    if (file.name && file.name.includes(".")) {
      ext = file.name.substring(file.name.lastIndexOf("."));
    }
    const filename = `${uniqueId}${ext}`;

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://weaneytlhxiexrsiqepy.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable_D5qMQbj352cqbP5Ys9gu-w_w2lT0uUo";
    const bucketName = "menu-images";
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filename}`;

    let supabaseError = null;
    try {
      console.log(`Attempting Supabase upload to: ${uploadUrl}`);
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
          "Content-Type": file.type || "image/jpeg",
        },
        body: buffer,
      });

      if (res.ok) {
        const downloadUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filename}`;
        console.log(`Supabase upload success: ${downloadUrl}`);
        return NextResponse.json({ url: downloadUrl });
      } else {
        const errorText = await res.text();
        supabaseError = `Status ${res.status} - ${errorText}`;
        console.warn(`Supabase returned error: ${supabaseError}`);
      }
    } catch (err: any) {
      supabaseError = `Exception: ${err.message || err}`;
      console.error(`Supabase Storage upload exception: ${supabaseError}`);
    }

    // Fallback: Save to public/uploads only if not on Vercel
    const isVercel = process.env.VERCEL === "1";
    if (isVercel) {
      return NextResponse.json(
        { detail: `Supabase upload failed: ${supabaseError}. Local fallback is disabled on Vercel.` },
        { status: 500 }
      );
    }

    console.log("Falling back to local storage upload");
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (fsError: any) {
      console.error("Failed to write to local storage fallback:", fsError);
      return NextResponse.json(
        { detail: `Upload failed: ${supabaseError}. Local fallback also failed: ${fsError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in upload handler: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

