import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import sharp from "sharp";
import crypto from "crypto";
import { createWorker } from "tesseract.js";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read the file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Compress and optimize the image
    const compressedBuffer = await sharp(buffer).resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();

    // Perform OCR on the image
    const worker = await createWorker();
    const {
      data: { text },
    } = await worker.recognize(compressedBuffer);
    await worker.terminate();

    // Generate a unique filename
    const uniqueFilename = `${crypto.randomUUID()}.jpg`;
    const filePath = `receipts/${uniqueFilename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from("receipts").upload(filePath, compressedBuffer, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
    });

    if (error) {
      console.error("Supabase storage error:", error);
      return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(filePath);

    // Extract potential amount and date from OCR text
    const amountMatch = text.match(/(?:Rp|IDR)\s*[\d,.]+/i);
    const dateMatch = text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/);

    return NextResponse.json({
      url: publicUrl,
      extractedText: text,
      extractedData: {
        amount: amountMatch ? amountMatch[0].replace(/[^\d.]/g, "") : null,
        date: dateMatch ? dateMatch[0] : null,
      },
    });
  } catch (error) {
    console.error("Error processing receipt:", error);
    return NextResponse.json({ error: "Failed to process receipt" }, { status: 500 });
  }
}
