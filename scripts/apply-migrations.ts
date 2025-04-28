import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config({ path: ".env.local" });

const runMigrations = async () => {
    if (!process.env.DATABASE_URL) {
        console.error(
            "❌ DATABASE_URL is not defined in environment variables"
        );
        process.exit(1);
    }

    console.log("🔄 Connecting to database...");

    try {
        const sql = neon(process.env.DATABASE_URL);
        const db = drizzle(sql);

        console.log("✅ Connected to database");
        console.log("🔄 Running migrations...");

        // Get migration folder
        const migrationsFolder = path.join(process.cwd(), "migrations");

        // Verify migration files exist
        if (!fs.existsSync(migrationsFolder)) {
            console.error("❌ Migrations folder not found");
            process.exit(1);
        }

        const migrationFiles = fs
            .readdirSync(migrationsFolder)
            .filter(
                (file) => file.endsWith(".sql") && !file.startsWith("meta")
            );

        console.log(`📁 Found ${migrationFiles.length} migration files`);

        // Run migrations
        await migrate(db, { migrationsFolder });

        console.log("✅ Migrations completed successfully");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
};

runMigrations();
