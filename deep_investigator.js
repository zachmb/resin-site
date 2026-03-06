import pg from 'pg';
const { Client } = pg;

import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log("Connected to Postgres");

    try {
        const tables = ['amber_sessions', 'profiles', 'user_credentials', 'amber_tasks'];

        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const res = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${table}'
        ORDER BY ordinal_position;
      `);
            console.table(res.rows);

            const constraints = await client.query(`
        SELECT conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE contype IN ('f', 'p', 'u')
        AND conrelid = 'public.${table}'::regclass;
      `);
            console.log(`Constraints for ${table}:`);
            console.table(constraints.rows);
        }

        console.log("\n--- RLS Status ---");
        const rls = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename IN ('amber_sessions', 'profiles');
    `);
        console.table(rls.rows);

        const policies = await client.query(`
      SELECT tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename IN ('amber_sessions', 'profiles');
    `);
        console.log("Policies:");
        console.table(policies.rows);

    } catch (err) {
        console.error("Investigation Error:", err);
    } finally {
        await client.end();
    }
}

run();
