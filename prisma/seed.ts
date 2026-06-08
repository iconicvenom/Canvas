import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const demo = await prisma.user.upsert({
    where: { email: "demo@canvas.app" },
    update: {},
    create: {
      email: "demo@canvas.app",
      name: "Demo User",
      passwordHash,
      avatarColor: "#0b7cff",
    },
  });

  const board = await prisma.board.create({
    data: {
      name: "Welcome Board",
      description: "A sample board to get started",
      members: { create: { userId: demo.id, role: "owner" } },
      elements: {
        create: [
          {
            type: "sticky",
            x: 200,
            y: 200,
            width: 200,
            height: 200,
            rotation: -3,
            data: { text: "Welcome to Canvas!", color: "#ffe978", fontSize: 22 },
            zIndex: 1,
          },
          {
            type: "sticky",
            x: 500,
            y: 250,
            width: 200,
            height: 200,
            rotation: 4,
            data: { text: "Double-click to edit", color: "#93f4be", fontSize: 18 },
            zIndex: 1,
          },
        ],
      },
    },
  });

  console.log("Seeded demo user: demo@canvas.app / password123");
  console.log("Board:", board.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
