import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_CHAT_ROOM_NAME = "همگانی";
const DEFAULT_CHAT_ROOM_SLUG = "general";

async function main() {
  console.log("Seeding database...");

  // Create admin user (idempotent - won't overwrite)
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

  const defaultRoom = await prisma.chatRoom.upsert({
    where: { slug: DEFAULT_CHAT_ROOM_SLUG },
    update: {
      name: DEFAULT_CHAT_ROOM_NAME,
      isDefault: true,
    },
    create: {
      name: DEFAULT_CHAT_ROOM_NAME,
      slug: DEFAULT_CHAT_ROOM_SLUG,
      isDefault: true,
      createdByUserId: user.id,
    },
  });

  console.log(`Default chat room "${defaultRoom.name}" created/verified`);
  console.log("Database seeded - existing data preserved");
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
