import { SelectQueryBuilder } from 'typeorm';

/**
 * Soft delete utility functions for TypeORM entities
 */
export class SoftDeleteUtil<T extends Record<string, any>> {
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
}

/**
 * Extension method for SelectQueryBuilder to add soft delete functionality
 */
export function withSoftDelete<T extends Record<string, any>>(
  queryBuilder: SelectQueryBuilder<T>,
): SoftDeleteUtil<T> {
  return new SoftDeleteUtil(queryBuilder);
}
