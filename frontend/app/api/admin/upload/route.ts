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

    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET || "travel-c8012.firebasestorage.app";
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=menu-items%2F${filename}`;

    try {
      console.log(`Attempting Firebase upload to: ${uploadUrl}`);
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "image/jpeg",
        },
        body: buffer,
      });

      if (res.ok) {
        const data = await res.json();
        const downloadToken = data.downloadTokens;
        let downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/menu-items%2F${filename}?alt=media`;
        if (downloadToken) {
          downloadUrl += `&token=${downloadToken}`;
        }
        console.log(`Firebase upload success: ${downloadUrl}`);
        return NextResponse.json({ url: downloadUrl });
      } else {
        const errorText = await res.text();
        console.warn(`Firebase returned error: ${res.status} - ${errorText}`);
      }
    } catch (err) {
      console.error("Firebase Storage upload exception:", err);
    }

    // Fallback: Save to public/uploads
    console.log("Falling back to local storage upload");
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error: any) {
    console.error("Error in upload handler: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
