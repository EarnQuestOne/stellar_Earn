import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddErasureRequests1860000000000 implements MigrationInterface {
  name = 'AddErasureRequests1860000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."erasure_requests_status_enum" AS ENUM('REQUESTED','PROCESSING','COMPLETED','CANCELLED','FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "erasure_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subjectId" character varying NOT NULL, "requestedBy" character varying, "status" "public"."erasure_requests_status_enum" NOT NULL DEFAULT 'REQUESTED', "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL, "executedAt" TIMESTAMP WITH TIME ZONE, "cancelledAt" TIMESTAMP WITH TIME ZONE, "scope" jsonb, "reason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_erasure_requests_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_erasure_subject_status" ON "erasure_requests" ("subjectId", "status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_erasure_subject_status"`);
    await queryRunner.query(`DROP TABLE "erasure_requests"`);
    await queryRunner.query(
      `DROP TYPE "public"."erasure_requests_status_enum"`,
    );
  }
}
