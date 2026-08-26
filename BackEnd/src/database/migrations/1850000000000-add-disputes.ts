import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisputes1850000000000 implements MigrationInterface {
  name = 'AddDisputes1850000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."disputes_status_enum" AS ENUM('PENDING','UNDER_REVIEW','RESOLVED','APPEALED','WITHDRAWN')`);
    await queryRunner.query(`CREATE TABLE "disputes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "questId" character varying NOT NULL, "submissionId" character varying NOT NULL, "initiatorAddress" character varying NOT NULL, "arbitratorAddress" character varying NOT NULL, "status" "public"."disputes_status_enum" NOT NULL DEFAULT 'PENDING', "upheld" boolean, "slashBps" integer, "openTransactionHash" character varying, "appealTransactionHash" character varying, "resolutionTransactionHash" character varying, "filedAt" TIMESTAMP, "resolvedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_disputes_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_disputes_submission" ON "disputes" ("submissionId")`);
    await queryRunner.query(`CREATE INDEX "idx_disputes_initiator_status" ON "disputes" ("initiatorAddress", "status")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_disputes_initiator_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_disputes_submission"`);
    await queryRunner.query(`DROP TABLE "disputes"`);
    await queryRunner.query(`DROP TYPE "public"."disputes_status_enum"`);
  }
}