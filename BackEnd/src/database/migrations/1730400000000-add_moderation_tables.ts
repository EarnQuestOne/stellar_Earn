import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModerationTables1730400000000 implements MigrationInterface {
  name = 'AddModerationTables1730400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "moderation_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "targetType" character varying(32) NOT NULL,
        "targetId" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "textSnapshot" text,
        "imageUrls" jsonb,
        "automatedScore" double precision NOT NULL DEFAULT '0',
        "automatedLabels" jsonb,
        "keywordHits" jsonb,
        "imageFlags" jsonb,
        "status" character varying(32) NOT NULL DEFAULT 'PENDING',
        "priority" integer NOT NULL DEFAULT '0',
        "reviewedBy" character varying,
        "reviewedAt" TIMESTAMP WITH TIME ZONE,
        "lastAction" character varying(32) NOT NULL DEFAULT 'NONE',
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_moderation_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_moderation_items_targetType" ON "moderation_items" ("targetType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_moderation_items_targetId" ON "moderation_items" ("targetId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_moderation_items_userId" ON "moderation_items" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_moderation_items_status" ON "moderation_items" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "moderation_appeals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "moderationItemId" uuid NOT NULL,
        "userId" character varying NOT NULL,
        "message" text NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'PENDING',
        "resolvedBy" character varying,
        "resolvedAt" TIMESTAMP WITH TIME ZONE,
        "resolutionNote" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_moderation_appeals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_moderation_appeals_item" FOREIGN KEY ("moderationItemId") REFERENCES "moderation_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_moderation_appeals_item" ON "moderation_appeals" ("moderationItemId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_moderation_appeals_user" ON "moderation_appeals" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_moderation_appeals_status" ON "moderation_appeals" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "moderation_appeals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "moderation_items"`);
  }
}
