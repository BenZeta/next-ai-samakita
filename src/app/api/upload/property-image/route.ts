import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";
import sharp from "sharp";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" }, { status: 400 });
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process image with sharp
    const processedImage = await sharp(buffer)
      .resize(1920, 1080, {
        // Resize to max dimensions while maintaining aspect ratio
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 }) // Convert to WebP for better compression
      .toBuffer();

    // Generate unique filename
    const uniqueFilename = `${crypto.randomUUID()}.webp`;
    const filePath = `property-images/${uniqueFilename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from("properties").upload(filePath, processedImage, {
      contentType: "image/webp",
      cacheControl: "31536000", // Cache for 1 year
      upsert: false,
    });

    if (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("properties").getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error in property image upload API:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
