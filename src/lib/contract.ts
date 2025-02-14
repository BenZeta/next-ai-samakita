import { format } from "date-fns";
import { supabase } from "./supabase";
import type { Property, Transaction, User } from "./contracts";

interface ContractData {
  user: User;
  property: Property;
  transaction: Transaction;
}

export async function generateContract(data: ContractData): Promise<string> {
  const contractContent = generateContractContent(data);
  const contractBuffer = Buffer.from(contractContent);
  const contractKey = `contracts/${data.transaction.id}-${Date.now()}.pdf`;

  // Upload to Supabase Storage
  const { data: uploadData, error } = await supabase.storage.from("contracts").upload(contractKey, contractBuffer, {
    contentType: "application/pdf",
    cacheControl: "31536000",
  });

  if (error) {
    console.error("Error uploading contract:", error);
    throw new Error("Failed to upload contract");
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("contracts").getPublicUrl(contractKey);

  return publicUrl;
}

function generateContractContent(data: ContractData): string {
  const { user, property, transaction } = data;
  const startDate = format(transaction.createdAt, "dd MMMM yyyy");
  const endDate = format(new Date(transaction.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000), "dd MMMM yyyy");

  return `
RENTAL AGREEMENT

This Rental Agreement ("Agreement") is made and entered into on ${format(new Date(), "dd MMMM yyyy")} by and between:

PROPERTY OWNER:
${property.name}
${property.address}
${property.city}, ${property.province} ${property.postalCode}

and

TENANT:
Name: ${user.name}
ID Number (KTP): ${user.ktpNumber || "N/A"}
Phone: ${user.phone || "N/A"}
Email: ${user.email}

for the rental of:

PROPERTY DETAILS:
Property Name: ${property.name}
Description: ${property.description}
Address: ${property.address}
City: ${property.city}
Province: ${property.province}
Postal Code: ${property.postalCode}
Monthly Rent: Rp ${transaction.amount.toLocaleString()}

TERM:
Start Date: ${startDate}
End Date: ${endDate}

TERMS AND CONDITIONS:
1. The tenant agrees to pay the monthly rent of Rp ${transaction.amount.toLocaleString()} on or before the 5th day of each month.
2. A security deposit of Rp ${(transaction.amount * 2).toLocaleString()} is required.
3. The tenant must maintain the property in good condition.
4. The tenant must comply with all property rules and regulations.
5. The tenant must give 30 days notice before moving out.

Facilities Included:
${property.facilities.map((facility) => `- ${facility}`).join("\n")}

Signatures:

Property Owner: _________________
Date: ${format(new Date(), "dd MMMM yyyy")}

Tenant: _________________
Date: _________________
  `.trim();
}
