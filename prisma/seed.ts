import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error("Environment variables for admin user are not set");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const user = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password: hashedPassword,
    },
  });

  console.log(`Admin user "${user.username}" created/verified`);

  // Clear existing data
  await prisma.magazinePage.deleteMany({});
  await prisma.magazine.deleteMany({});
  await prisma.article.deleteMany({});
  await prisma.tag.deleteMany({});

  console.log("Existing data cleared");

  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
