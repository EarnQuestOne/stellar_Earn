# Backend Zero-Downtime Migration Policy

## Overview
This document defines the official zero-downtime migration and schema evolution policy for **EarnQuestOne/stellar_Earn**. Ensuring zero downtime during deployments is critical for maintaining high availability across distributed backend services and Stellar blockchain synchronization workers.

---

## 1. The Expand and Contract Pattern
All breaking database schema changes (such as renaming columns, dropping tables, changing data types, or enforcing new non-nullable constraints) must follow the **Expand and Contract** pattern across multiple deployment phases:

1. **Phase 1: Expand (Additive Changes)**
   - Add new columns, tables, or indexes alongside existing ones.
   - Deploy backend code that is capable of writing to both old and new fields while reading primarily from the old schema.
2. **Phase 2: Dual-Write & Backfill**
   - Update application services to dual-write to both legacy and new schema structures.
   - Execute background migration scripts or workers to safely backfill historical data into the new columns/tables.
3. **Phase 3: Switch Read Target**
   - Update application code to read exclusively from the new schema structures.
   - Verify application stability and error rates under production traffic.
4. **Phase 4: Contract (Removal)**
   - In a subsequent deployment release after the expand phase is fully stabilized, remove legacy columns, tables, or write logic.

---

## 2. Backward & Forward Compatibility Rules
- **No Breaking DDL in Single Deploys**: Destructive operations (`DROP COLUMN`, `ALTER COLUMN TYPE`) are strictly prohibited in a release that simultaneously deploys code depending on the new state.
- **Nullability**: New columns added to existing tables must initially be nullable or provide a safe default value to prevent breaking running instances of older application versions during rolling updates.

---

## 3. Ownership & Review Cadence
- **Primary Owner**: Database Engineering & Platform Architecture Team.
- **Review Cadence**: Audited annually or upon major architectural upgrades to database infrastructure.