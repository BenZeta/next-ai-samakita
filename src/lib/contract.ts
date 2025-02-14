import { format } from "date-fns";
import { id } from "date-fns/locale";
import { supabase } from "./supabase";
import jsPDF from "jspdf";

interface ContractData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    ktpNumber: string | null;
  };
  property: {
    name: string;
    description: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    facilities: string[];
  };
  transaction: {
    id: string;
    amount: number;
    createdAt: Date;
  };
}

export async function generateContract(data: ContractData): Promise<string> {
  try {
    // Create a new jsPDF instance
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Generate contract content
    generateContractContent(doc, data);
    
    // Get the PDF as a Buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Generate a unique key for the contract
    const contractKey = `${data.user.id}-${Date.now()}.pdf`;

    // Upload to Supabase Storage with explicit content type
    const { error: uploadError } = await supabase.storage
      .from("contracts")
      .upload(contractKey, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      console.error("Error uploading contract:", uploadError);
      throw new Error(`Failed to upload contract: ${uploadError.message}`);
    }

    // Get a signed URL that expires in 7 days (604800 seconds)
    const { data: signedUrlData } = await supabase.storage
      .from("contracts")
      .createSignedUrl(contractKey, 604800);

    if (!signedUrlData?.signedUrl) {
      throw new Error("Failed to generate signed URL for contract");
    }

    return signedUrlData.signedUrl;
  } catch (error) {
    console.error("Error in generateContract:", error);
    throw error;
  }
}

function generateContractContent(doc: jsPDF, data: ContractData): void {
  const { user, property, transaction } = data;
  const startDate = format(transaction.createdAt, "dd MMMM yyyy", { locale: id });
  const endDate = format(new Date(transaction.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000), "dd MMMM yyyy", { locale: id });
  const today = format(new Date(), "dd MMMM yyyy", { locale: id });

  let y = 30; // Increased starting position
  const lineHeight = 10; // Increased line height
  const margin = 25; // Increased margin
  const pageWidth = 210; // A4 width in mm
  const textWidth = pageWidth - (2 * margin); // Available text width

  // Helper function to add text and return the new y position
  const addText = (text: string, fontSize = 12, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(text, margin, y, { maxWidth: textWidth });
    y += lineHeight;
    return y;
  };

  // Helper function to add centered text
  const addCenteredText = (text: string, fontSize = 12, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
    y += lineHeight;
  };

  // Title
  addCenteredText('PERJANJIAN SEWA KAMAR KOS', 16, true);
  y += lineHeight; // Add extra space after title

  // Date
  addText(`Pada hari ini, ${today}, yang bertanda tangan di bawah ini:`);
  y += lineHeight; // Add extra space after introduction

  // PIHAK PERTAMA
  addText('1. PIHAK PERTAMA (PEMILIK KOS):', 12, true);
  y += lineHeight / 2; // Add some space before details
  addText(`Nama Properti: ${property.name}`);
  addText(`Alamat: ${property.address}`);
  addText(`${property.city}, ${property.province} ${property.postalCode}`);
  addText('Selanjutnya disebut sebagai "PIHAK PERTAMA"');
  y += lineHeight; // Add extra space between parties

  // PIHAK KEDUA
  addText('2. PIHAK KEDUA (PENYEWA):', 12, true);
  y += lineHeight / 2; // Add some space before details
  addText(`Nama: ${user.name}`);
  addText(`No. KTP: ${user.ktpNumber || "N/A"}`);
  addText(`No. Telepon: ${user.phone || "N/A"}`);
  addText(`Email: ${user.email}`);
  addText('Selanjutnya disebut sebagai "PIHAK KEDUA"');
  y += lineHeight * 1.5; // Add extra space before agreement

  // Agreement intro
  addText('Dengan ini kedua belah pihak sepakat untuk mengadakan Perjanjian Sewa Kamar Kos dengan ketentuan sebagai berikut:');
  y += lineHeight * 1.5; // Add extra space before first article

  // PASAL 1
  addText('PASAL 1 - OBJEK SEWA', 12, true);
  y += lineHeight / 2;
  addText('PIHAK PERTAMA menyewakan kepada PIHAK KEDUA sebuah kamar kos dengan spesifikasi:');
  addText(`- Nama Properti: ${property.name}`);
  addText(`- Deskripsi: ${property.description}`);
  addText(`- Alamat: ${property.address}, ${property.city}, ${property.province} ${property.postalCode}`);
  y += lineHeight; // Add extra space between articles

  // PASAL 2
  addText('PASAL 2 - JANGKA WAKTU', 12, true);
  y += lineHeight / 2;
  addText(`1. Masa sewa terhitung mulai tanggal ${startDate} sampai dengan ${endDate}`);
  addText('2. Perpanjangan sewa dapat dilakukan atas persetujuan kedua belah pihak');
  y += lineHeight; // Add extra space between articles

  // PASAL 3
  addText('PASAL 3 - BIAYA SEWA', 12, true);
  y += lineHeight / 2;
  addText(`1. Biaya sewa per bulan: Rp ${transaction.amount.toLocaleString()}`);
  addText(`2. Uang jaminan: Rp ${(transaction.amount * 2).toLocaleString()}`);
  addText('3. Pembayaran dilakukan setiap tanggal 5 setiap bulannya');
  y += lineHeight; // Add extra space between articles

  // PASAL 4
  addText('PASAL 4 - FASILITAS', 12, true);
  y += lineHeight / 2;
  addText('Fasilitas yang tersedia:');
  property.facilities.forEach(facility => {
    addText(`- ${facility}`);
  });
  y += lineHeight; // Add extra space between articles

  // Check if we need a new page
  if (y > 250) {
    doc.addPage();
    y = 30; // Reset to top of new page with margin
  }

  // PASAL 5
  addText('PASAL 5 - TATA TERTIB', 12, true);
  y += lineHeight / 2;
  addText('1. PIHAK KEDUA wajib menjaga ketertiban dan keamanan');
  addText('2. PIHAK KEDUA wajib menjaga kebersihan kamar dan lingkungan kos');
  addText('3. PIHAK KEDUA dilarang membawa tamu menginap tanpa izin');
  addText('4. PIHAK KEDUA wajib menghemat penggunaan listrik dan air');
  addText('5. PIHAK KEDUA wajib melaporkan kerusakan fasilitas kepada PIHAK PERTAMA');
  y += lineHeight; // Add extra space between articles

  // PASAL 6
  addText('PASAL 6 - SANKSI', 12, true);
  y += lineHeight / 2;
  addText('1. Keterlambatan pembayaran akan dikenakan denda 5% per minggu');
  addText('2. Pelanggaran tata tertib dapat berakibat pemutusan kontrak sepihak');
  y += lineHeight; // Add extra space between articles

  // PASAL 7
  addText('PASAL 7 - FORCE MAJEURE', 12, true);
  y += lineHeight / 2;
  addText('Hal-hal yang terjadi di luar kemampuan kedua belah pihak (force majeure) akan dibicarakan secara musyawarah untuk mencapai mufakat.');
  y += lineHeight; // Add extra space between articles

  // PASAL 8
  addText('PASAL 8 - PENYELESAIAN PERSELISIHAN', 12, true);
  y += lineHeight / 2;
  addText('Apabila terjadi perselisihan antara kedua belah pihak, akan diselesaikan secara musyawarah untuk mencapai mufakat.');
  y += lineHeight * 1.5; // Add extra space before closing

  addText('Demikian perjanjian ini dibuat dalam rangkap 2 (dua) yang masing-masing mempunyai kekuatan hukum yang sama.');
  y += lineHeight * 3;

  // Calculate positions for signature lines and text
  const leftLineX = margin + 40;
  const rightLineX = pageWidth - margin - 40;
  const lineWidth = 80;

  // Draw signature lines
  doc.setLineWidth(0.5);
  doc.line(leftLineX - 10, y, leftLineX + lineWidth, y);
  doc.line(rightLineX - lineWidth, y, rightLineX + 10, y);

  // Add labels and names
  y += lineHeight;
  
  // Helper function to center text
  const addCenteredNameText = (text: string, x: number, fontSize: number) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, x - (textWidth / 2), y + 5);
  };

  // Add labels
  doc.setFont("helvetica", "bold");
  addCenteredNameText("PIHAK PERTAMA", leftLineX + (lineWidth / 2), 11);
  addCenteredNameText("PIHAK KEDUA", rightLineX - (lineWidth / 2), 11);

  // Add names
  y += lineHeight + 2;
  doc.setFont("helvetica", "normal");
  addCenteredNameText(property.name, leftLineX + (lineWidth / 2), 10);
  addCenteredNameText(user.name, rightLineX - (lineWidth / 2), 10);
}
