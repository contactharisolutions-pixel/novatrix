const { PrismaClient } = require('@prisma/client');

// Prevent multiple instances of PrismaClient in development / serverless
// by attaching the PrismaClient to the global object.
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

module.exports = prisma;
