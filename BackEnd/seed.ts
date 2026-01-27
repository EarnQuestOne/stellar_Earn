interface UserRow {
  id: string;
  username: string;
}

interface QuestRow {
  id: string;
}

import { Client } from 'pg';

export class Seed {
  async run(): Promise<void> {
    console.log('Seeding database...');

    // Create a direct connection to insert data without TypeORM entities
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      await client.connect();

      // ---------- USERS ----------
      const users: UserRow[] = [];
      for (let i = 1; i <= 5; i++) {
        const result = await client.query(
          `INSERT INTO "User" (stellarAddress, username, email, role, xp, level) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username`,
          [
            `GUSER${i}ADDRESS`,
            `user${i}`,
            `user${i}@example.com`,
            i === 1 ? 'ADMIN' : 'USER',
            i * 100,
            1 + Math.floor(i / 2),
          ]
        );
        users.push(result.rows[0]);
      }

      // ---------- QUESTS ----------
      const quests: QuestRow[] = [];
      for (let i = 1; i <= 5; i++) {
        const result = await client.query(
          `INSERT INTO "Quest" (title, description, contractTaskId, rewardAsset, rewardAmount, status, verifierType, verifierConfig, createdBy) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [
            `Quest ${i}`,
            `This is the description for quest ${i}`,
            `TASK_${i}`,
            'TOKEN',
            1000 * i,
            i % 2 === 0 ? 'INACTIVE' : 'ACTIVE',
            'ADMIN',
            { approvalRequired: true },
            users[i % users.length].id,
          ]
        );
        quests.push(result.rows[0]);
      }

      // ---------- SUBMISSIONS ----------
      for (let i = 0; i < users.length; i++) {
        const quest = quests[i % quests.length];
        await client.query(
          `INSERT INTO "Submission" (questId, userId, proof, status) 
           VALUES ($1, $2, $3, $4)`,
          [
            quest.id,
            users[i].id,
            { file: `proof_${i + 1}.pdf` },
            'PENDING',
          ]
        );
      }

      // ---------- NOTIFICATIONS ----------
      for (let i = 0; i < users.length; i++) {
        await client.query(
          `INSERT INTO "Notification" (userId, type, title, message) 
           VALUES ($1, $2, $3, $4)`,
          [
            users[i].id,
            'INFO',
            'Welcome!',
            `Hello ${users[i].username}, welcome to the platform.`,
          ]
        );
      }

      // ---------- PAYOUTS ----------
      for (let i = 0; i < users.length; i++) {
        await client.query(
          `INSERT INTO "Payout" (stellarAddress, amount, asset, status) 
           VALUES ($1, $2, $3, $4)`,
          [
            `GUSER${i + 1}ADDRESS`,
            500 * (i + 1),
            'TOKEN',
            i % 2 === 0 ? 'PENDING' : 'COMPLETED',
          ]
        );
      }

      console.log('Seeding completed!');
    } catch (err) {
      console.error('Error during seeding:', err);
      throw err;
    } finally {
      await client.end();
    }
  }
}

// For direct execution
if (require.main === module) {
  const seed = new Seed();
  seed.run().catch(console.error);
}