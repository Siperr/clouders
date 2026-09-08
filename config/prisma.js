const dotenv = require("dotenv");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

module.exports = prisma;
