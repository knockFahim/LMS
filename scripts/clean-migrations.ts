import * as fs from "fs";
import * as path from "path";

const cleanMigrations = () => {
    console.log("🧹 Cleaning up migration files...");

    // Get migration folder
    const migrationsFolder = path.join(process.cwd(), "migrations");

    // Verify migration files exist
    if (!fs.existsSync(migrationsFolder)) {
        console.error("❌ Migrations folder not found");
        process.exit(1);
    }

    try {
        // Get all SQL migration files
        const migrationFiles = fs
            .readdirSync(migrationsFolder)
            .filter(
                (file) => file.endsWith(".sql") && !file.startsWith("meta")
            );

        console.log(`📁 Found ${migrationFiles.length} migration files`);

        // Map to store migrations by prefix number
        const migrationMap = new Map();
        const duplicatePrefixes = new Set();

        // Find duplicate prefixes
        migrationFiles.forEach((file) => {
            const prefix = file.split("_")[0]; // Get the numeric prefix (e.g., "0009")

            if (migrationMap.has(prefix)) {
                duplicatePrefixes.add(prefix);
                const existing = migrationMap.get(prefix);
                if (!Array.isArray(existing)) {
                    migrationMap.set(prefix, [existing, file]);
                } else {
                    existing.push(file);
                    migrationMap.set(prefix, existing);
                }
            } else {
                migrationMap.set(prefix, file);
            }
        });

        // Report duplicates
        if (duplicatePrefixes.size > 0) {
            console.log("\n⚠️ Found duplicate migration prefixes:");
            duplicatePrefixes.forEach((prefix) => {
                const files = migrationMap.get(prefix);
                console.log(`  ${prefix}: ${files.join(", ")}`);
            });

            console.log(
                "\nRecommendation: Rename these files to have sequential prefixes."
            );
            console.log("Example command to run for each file:");
            console.log(
                "  mv migrations/0009_duplicate_filename.sql migrations/0010_duplicate_filename.sql\n"
            );
        } else {
            console.log("✅ No duplicate migration prefixes found");
        }

        // Verify sequential numbering
        const prefixes = Array.from(migrationMap.keys())
            .map((p) => parseInt(p))
            .sort((a, b) => a - b);

        let hasGaps = false;
        for (let i = 1; i < prefixes.length; i++) {
            if (prefixes[i] !== prefixes[i - 1] + 1) {
                hasGaps = true;
                console.log(
                    `⚠️ Gap in migration sequence: ${prefixes[i - 1]} -> ${prefixes[i]}`
                );
            }
        }

        if (!hasGaps) {
            console.log(
                "✅ Migration sequence is properly ordered without gaps"
            );
        }
    } catch (error) {
        console.error("❌ Error cleaning migrations:", error);
        process.exit(1);
    }
};

cleanMigrations();
