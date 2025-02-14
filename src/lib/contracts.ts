import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Tenant, Room, Property } from "@prisma/client";
import { format } from "date-fns";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface ContractData {
  tenant: Tenant;
  room: Room & { property: Property };
  property: Property;
}

export async function generateContract(data: ContractData): Promise<string> {
  const contractContent = generateContractContent(data);
  const contractBuffer = Buffer.from(contractContent);
  const contractKey = `contracts/${data.tenant.id}-${Date.now()}.pdf`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: contractKey,
      Body: contractBuffer,
      ContentType: "application/pdf",
    })
  );

  const contractUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${contractKey}`;
  return contractUrl;
}

function generateContractContent(data: ContractData): string {
  const { tenant, room, property } = data;
  const startDate = tenant.startDate ? format(tenant.startDate, "dd MMMM yyyy") : "N/A";
  const endDate = tenant.endDate ? format(tenant.endDate, "dd MMMM yyyy") : "N/A";

  return `
RENTAL AGREEMENT

This Rental Agreement ("Agreement") is made and entered into on ${format(new Date(), "dd MMMM yyyy")} by and between:

PROPERTY OWNER:
${property.name}
${property.address}

and

TENANT:
Name: ${tenant.name}
ID Number (KTP): ${tenant.ktpNumber}
Phone: ${tenant.phone}
Email: ${tenant.email}

for the rental of:

PROPERTY DETAILS:
Room Number: ${room.number}
Type: ${room.type}
Size: ${room.size} m²
Monthly Rent: Rp ${room.price.toLocaleString()}

TERM:
Start Date: ${startDate}
End Date: ${endDate}

TERMS AND CONDITIONS:
1. The tenant agrees to pay the monthly rent of Rp ${room.price.toLocaleString()} on or before the 5th day of each month.
2. A security deposit of Rp ${(room.price * 2).toLocaleString()} is required.
3. The tenant must maintain the room in good condition.
4. The tenant must comply with all property rules and regulations.
5. The tenant must give 30 days notice before moving out.

Signatures:

Property Owner: _________________
Date: ${format(new Date(), "dd MMMM yyyy")}

Tenant: _________________
Date: _________________
  `.trim();
}
