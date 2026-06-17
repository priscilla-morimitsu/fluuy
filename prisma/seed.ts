import "dotenv/config";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@fluuy.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Fluuy Admin",
      email,
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  console.log(`Seeded platform admin: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
