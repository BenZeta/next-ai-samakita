import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import { createWorker } from "tesseract.js";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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
    const key = `receipts/${uniqueFilename}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: key,
        Body: compressedBuffer,
        ContentType: "image/jpeg",
      })
    );

    const fileUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // Extract potential amount and date from OCR text
    const amountMatch = text.match(/(?:Rp|IDR)\s*[\d,.]+/i);
    const dateMatch = text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/);

    return NextResponse.json({
      url: fileUrl,
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
