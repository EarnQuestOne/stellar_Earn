# Backend Tools

This directory contains various utility and ad-hoc scripts that were previously located in the root of the Backend application. They are collected here to keep the project root clean and organized.

## Overview of Scripts

### Database Utilities

- **`test-db-connection.ts` (and variants `test-db-connection2.ts` to `test-db-connection5.ts`)**:
  Scripts used to test, profile, and debug database connectivity and connection pool behaviors under different configurations.
- **`create-database.ts`**:
  A script to programmatically create the primary PostgreSQL database if it does not exist.
- **`check-database-structure.ts`**:
  Validates the structure and schema of the database against expected patterns to catch inconsistencies.
- **`check-all-ids.ts`**, **`check-max-id.ts`**, **`check-simple-ids.ts`**:
  Utility scripts to verify, repair, and debug ID generation, especially auto-increment sequences and UUID states across the database tables.

### Migration Utilities

- **`check-migrations.ts`**, **`check-migrations2.ts`**:
  Tools to verify the status of applied TypeORM migrations against the local migration files.
- **`check-migrations-table.ts`**:
  Inspects the internal TypeORM `migrations` table to view exactly what the database has recorded.
- **`mark-initial-migration.ts`**, **`mark-all-migrations.ts`**:
  Ad-hoc scripts used to manually mark specific migrations (or all migrations) as "executed" in the database to forcefully synchronize state without running the migration code.

### Security Utilities

- **`generate-jwt-keys.ts`**, **`generate-jwt-keys-simple.ts`**:
  Scripts to generate private/public RSA key pairs (`.pem` / `.pub` files) required for JWT authentication signing and verification in the application.

## Usage

These scripts are designed to be executed in a Node.js environment with TypeScript support. They rely on the environment variables defined in the root `.env` file.

You can run them using `ts-node` or `bun`. For example:

```bash
# Using bun
bun run tools/test-db-connection.ts

# Using ts-node
npx ts-node tools/test-db-connection.ts
```

> **Warning**
> Many of these scripts interact directly with the database or file system in potentially destructive ways (e.g., modifying migration states). Always review the script contents and ensure you are operating against a local or test environment before execution.
