import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate a unique filename
    const uniqueFilename = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const filePath = `documents/${uniqueFilename}`;

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload directly to Supabase Storage
    const { data, error } = await supabase.storage.from("documents").upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      console.error("Error uploading file:", error);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("documents").getPublicUrl(filePath);

    return NextResponse.json({
      path: filePath,
      publicUrl,
    });
  } catch (error) {
    console.error("Error processing KTP upload:", error);
    return NextResponse.json({ error: "Failed to process KTP upload" }, { status: 500 });
  }
}
