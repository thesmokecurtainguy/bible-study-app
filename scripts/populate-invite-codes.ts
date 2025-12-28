/**
 * Script to populate inviteCode for existing groups before adding unique constraint
 * Run this BEFORE applying the migration if you have existing groups
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Create a PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please create a .env file with your Supabase connection string."
  );
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["error"],
});

const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function populateInviteCodes() {
  try {
    // Get all groups without invite codes
    const groups = await prisma.group.findMany({
      where: {
        inviteCode: null,
      },
    });

    console.log(`Found ${groups.length} groups without invite codes`);

    for (const group of groups) {
      let code: string;
      let exists = true;

      // Generate unique code
      while (exists) {
        code = generateInviteCode();
        const existing = await prisma.group.findUnique({
          where: { inviteCode: code },
          select: { id: true },
        });
        exists = !!existing;
      }

      await prisma.group.update({
        where: { id: group.id },
        data: { inviteCode: code! },
      });

      console.log(`Updated group ${group.id} with invite code ${code}`);
    }

    console.log("✅ All groups now have invite codes");
  } catch (error) {
    console.error("Error populating invite codes:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateInviteCodes();

