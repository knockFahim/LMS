# Database Migration Guide

This document outlines the recommended workflow for managing database migrations in the LMS project.

## The Issue

You may have encountered issues when trying to apply migrations, particularly errors like:

- "column room_bookings.status does not exist"
- "relation 'books' already exists"
- Other schema-related errors

These issues occur primarily because:

1. We have conflicting migration approaches (push vs. migrate)
2. Duplicate or inconsistent migration files
3. The Neon database connection through WebSocket can sometimes be unstable

## Recommended Migration Workflow

### For Development

During active development, use the direct schema push approach:

```bash
npm run db:push
```

This will update your database schema directly to match your schema.ts file, without tracking migrations.

### For Production or Staging

For production deployments, use the migration-based approach:

1. First, clean up migration files to detect any issues:

    ```bash
    npm run db:clean
    ```

2. Generate migration files based on schema changes:

    ```bash
    npm run db:generate
    ```

3. Apply migrations using our custom script:
    ```bash
    npm run db:apply
    ```

## Fixing Common Issues

### Duplicate Migration Files

If `db:clean` shows duplicate prefixes:

1. Rename the newer file to have the next consecutive prefix number
2. Run `db:clean` again to verify the sequence

### Missing Columns

If your database is missing columns:

1. Use the `/api/fix-room-bookings` endpoint to fix specific issues with the room_bookings table
2. For other tables, consider using the `db:push` command, but be careful as it might cause conflicts with existing data

### Migration Fails

If migrations fail:

1. Check the `migrations/meta` folder to ensure migration metadata is consistent
2. Try running `db:clean` to identify issues
3. Use `db:apply` which has better error handling than the standard `db:migrate`

## Best Practices

1. **Don't mix push and migrate**: Choose one approach for each environment
2. **Keep migrations sequential**: Ensure migration files have sequential numbers
3. **Commit migration files**: Always commit generated migration files to git
4. **Test migrations**: Test migrations on development before applying to production

## Migration Commands

| Command               | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `npm run db:generate` | Generate new migration files based on schema changes        |
| `npm run db:migrate`  | Run standard Drizzle migrations (not recommended)           |
| `npm run db:push`     | Push schema changes directly to database (development only) |
| `npm run db:apply`    | Apply migrations using our custom script (recommended)      |
| `npm run db:clean`    | Check for issues in migration files                         |
| `npm run db:studio`   | Open Drizzle Studio to view and manage database             |
