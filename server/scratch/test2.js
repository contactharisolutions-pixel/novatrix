const { distributeROI } = require('../services/roiCron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("Running distributeROI manually...");
  await distributeROI();
  await prisma.$disconnect();
}
run();
