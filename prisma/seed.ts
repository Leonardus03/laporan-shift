import { PrismaClient, FieldType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxFiles?: number;
};

function withOrder(fields: SeedField[]) {
  return fields.map((f, i) => ({
    ...f,
    required: f.required ?? false,
    order: i + 1,
  }));
}

async function main() {
  for (const name of ["Shift 1", "Shift 2"]) {
    await prisma.shift.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.reportForm.upsert({
    where: { slug: "cuci-pallet" },
    update: {},
    create: {
      slug: "cuci-pallet",
      name: "Cuci Pallet",
      fields: {
        create: withOrder([
          { key: "type_a", label: "Type A", type: FieldType.NUMBER },
          { key: "type_b", label: "Type B", type: FieldType.NUMBER },
          { key: "type_c", label: "Type C", type: FieldType.NUMBER },
          { key: "special_pallet_others", label: "Special Pallet & Others", type: FieldType.NUMBER },
          { key: "box_special", label: "Box Special", type: FieldType.NUMBER },
          { key: "foto_before", label: "Evidence Foto Before", type: FieldType.PHOTO, required: true, maxFiles: 10 },
          { key: "foto_after", label: "Evidence Foto After", type: FieldType.PHOTO, required: true, maxFiles: 10 },
        ]),
      },
    },
  });

  await prisma.reportForm.upsert({
    where: { slug: "upload-packing" },
    update: {},
    create: {
      slug: "upload-packing",
      name: "Upload Foto Repacking",
      fields: {
        create: withOrder(
          Array.from({ length: 5 }, (_, i) => ({
            key: `packing_${i + 1}`,
            label: `Packing ${i + 1}`,
            type: FieldType.PHOTO,
            maxFiles: 10,
          }))
        ),
      },
    },
  });

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    await prisma.admin.upsert({
      where: { email },
      update: {},
      create: {
        name: "Admin",
        email,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
