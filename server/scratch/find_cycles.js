const prisma = require('../lib/prisma');

async function findCycles() {
  const users = await prisma.user.findMany({
    select: { id: true, sponsor_id: true }
  });

  const map = new Map();
  for (const u of users) {
    map.set(u.id, u.sponsor_id);
  }

  for (const u of users) {
    let current = u.id;
    const visited = new Set();
    
    while (current) {
      if (visited.has(current)) {
        console.log(`Cycle detected starting at user ${u.id}: path = ${Array.from(visited).join(' -> ')} -> ${current}`);
        break;
      }
      visited.add(current);
      current = map.get(current);
    }
  }
}

findCycles().catch(console.error).finally(() => process.exit());
