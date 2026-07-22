import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyKeys1800000000004 implements MigrationInterface {
  name = 'AddIdempotencyKeys1800000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" character varying NOT NULL,
        "fingerprint" character varying NOT NULL,
        "requestMethod" character varying NOT NULL,
        "requestPath" character varying NOT NULL,
        "requestBodyHash" character varying,
        "responseStatusCode" integer,
        "responseBody" jsonb,
        "locked" boolean NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_idempotency_keys_key" UNIQUE ("key")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_idempotency_keys_fingerprint" ON "idempotency_keys" ("fingerprint", "expiresAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_idempotency_keys_fingerprint"`);
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
