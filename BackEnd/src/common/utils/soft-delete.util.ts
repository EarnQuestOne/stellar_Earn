import { SelectQueryBuilder, DeleteResult } from 'typeorm';

/**
 * Soft delete utility functions for TypeORM entities
 */
export class SoftDeleteUtil<T> {
  private alias: string;

  constructor(private queryBuilder: SelectQueryBuilder<T>) {
    this.alias = this.queryBuilder.alias;
  }

  /**
   * Adds soft delete filter to exclude deleted records
   */
  excludeDeleted(): SelectQueryBuilder<T> {
    return this.queryBuilder.andWhere(`${this.alias}.deletedAt IS NULL`);
  }

  /**
   * Adds soft delete filter to include only deleted records
   */
  onlyDeleted(): SelectQueryBuilder<T> {
    return this.queryBuilder.andWhere(`${this.alias}.deletedAt IS NOT NULL`);
  }

  /**
   * Adds soft delete filter to include all records (both deleted and not deleted)
   */
  includeDeleted(): SelectQueryBuilder<T> {
    return this.queryBuilder;
  }

  /**
   * Performs soft delete by setting deletedAt timestamp
   */
  async softDelete(id: string): Promise<DeleteResult> {
    return this.queryBuilder
      .update()
      .set({ deletedAt: new Date() })
      .where(`${this.alias}.id = :id`, { id })
      .execute();
  }

  /**
   * Restores a soft deleted record by setting deletedAt to null
   */
  async restore(id: string): Promise<DeleteResult> {
    return this.queryBuilder
      .update()
      .set({ deletedAt: null })
      .where(`${this.alias}.id = :id`, { id })
      .execute();
  }

  /**
   * Performs soft delete based on custom conditions
   */
  async softDeleteBy(conditions: Record<string, any>): Promise<DeleteResult> {
    const whereConditions = Object.keys(conditions).map(
      key => `${this.alias}.${key} = :${key}`
    ).join(' AND ');

    return this.queryBuilder
      .update()
      .set({ deletedAt: new Date() })
      .where(whereConditions, conditions)
      .execute();
  }

  /**
   * Restores records based on custom conditions
   */
  async restoreBy(conditions: Record<string, any>): Promise<DeleteResult> {
    const whereConditions = Object.keys(conditions).map(
      key => `${this.alias}.${key} = :${key}`
    ).join(' AND ');

    return this.queryBuilder
      .update()
      .set({ deletedAt: null })
      .where(whereConditions, conditions)
      .execute();
  }
}

/**
 * Extension method for SelectQueryBuilder to add soft delete functionality
 */
export function withSoftDelete<T>(queryBuilder: SelectQueryBuilder<T>): SoftDeleteUtil<T> {
  return new SoftDeleteUtil(queryBuilder);
}
