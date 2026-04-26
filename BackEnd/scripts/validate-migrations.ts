#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation script for two-step migrations
 * This script validates migration files without running them
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateMigrationFile(filePath: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    if (!fs.existsSync(filePath)) {
      result.valid = false;
      result.errors.push(`Migration file does not exist: ${filePath}`);
      return result;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for required imports
    if (!content.includes('import { MigrationInterface, QueryRunner }')) {
      result.valid = false;
      result.errors.push('Missing required imports: MigrationInterface, QueryRunner');
    }

    // Check for class implementing MigrationInterface
    if (!content.includes('implements MigrationInterface')) {
      result.valid = false;
      result.errors.push('Class must implement MigrationInterface');
    }

    // Check for required methods
    if (!content.includes('public async up(queryRunner: QueryRunner)')) {
      result.valid = false;
      result.errors.push('Missing required method: up');
    }

    if (!content.includes('public async down(queryRunner: QueryRunner)')) {
      result.valid = false;
      result.errors.push('Missing required method: down');
    }

    // Check for name property
    if (!content.includes('name = ')) {
      result.valid = false;
      result.errors.push('Missing required property: name');
    }

    // Check for proper error handling
    if (!content.includes('try') && content.includes('await')) {
      result.warnings.push('Consider adding try-catch blocks for error handling');
    }

    // Check for logging
    if (!content.includes('console.log')) {
      result.warnings.push('Consider adding logging statements for better debugging');
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Error reading file: ${error}`);
  }

  return result;
}

function validateRollbackScript(filePath: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    if (!fs.existsSync(filePath)) {
      result.valid = false;
      result.errors.push(`Rollback script does not exist: ${filePath}`);
      return result;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for required imports
    if (!content.includes('import { DataSource }')) {
      result.valid = false;
      result.errors.push('Missing required import: DataSource');
    }

    // Check for database connection handling
    if (!content.includes('await dataSource.initialize()')) {
      result.valid = false;
      result.errors.push('Missing database initialization');
    }

    if (!content.includes('await dataSource.destroy()')) {
      result.warnings.push('Consider adding database cleanup in finally block');
    }

    // Check for error handling
    if (!content.includes('try') || !content.includes('catch')) {
      result.valid = false;
      result.errors.push('Missing error handling');
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Error reading file: ${error}`);
  }

  return result;
}

function validateTestScript(filePath: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    if (!fs.existsSync(filePath)) {
      result.valid = false;
      result.errors.push(`Test script does not exist: ${filePath}`);
      return result;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for required imports
    if (!content.includes('import { DataSource }')) {
      result.valid = false;
      result.errors.push('Missing required import: DataSource');
    }

    // Check for test functions
    if (!content.includes('function test')) {
      result.warnings.push('Consider organizing tests into functions');
    }

    // Check for assertions
    if (!content.includes('console.log') && !content.includes('expect')) {
      result.warnings.push('Consider adding assertions or logging for test results');
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Error reading file: ${error}`);
  }

  return result;
}

function validatePackageJson(filePath: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    if (!fs.existsSync(filePath)) {
      result.valid = false;
      result.errors.push(`package.json does not exist: ${filePath}`);
      return result;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Check for migration scripts
    const requiredScripts = [
      'migration:run',
      'migration:revert',
      'migration:two-step',
      'migration:rollback:two-step',
      'migration:test'
    ];

    for (const script of requiredScripts) {
      if (!packageJson.scripts || !packageJson.scripts[script]) {
        result.warnings.push(`Missing script: ${script}`);
      }
    }

    // Check for required dependencies
    const requiredDeps = ['typeorm', 'ts-node'];
    
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        result.valid = false;
        result.errors.push(`Missing dependency: ${dep}`);
      }
    }

  } catch (error) {
    result.valid = false;
    result.errors.push(`Error parsing package.json: ${error}`);
  }

  return result;
}

async function validateAll() {
  console.log('🔍 Validating two-step migration implementation...\n');

  const migrationsDir = path.join(__dirname, '../src/database/migrations');
  const scriptsDir = __dirname;

  // Validate migration files
  console.log('📋 Validating migration files...');
  
  const step1Result = validateMigrationFile(
    path.join(migrationsDir, '1800000000000-data-migration-step1-schema-sync.ts')
  );
  
  const step2Result = validateMigrationFile(
    path.join(migrationsDir, '1800000000001-data-migration-step2-data-migration.ts')
  );

  console.log('\nStep 1 Migration (Schema Sync):');
  console.log(`  ${step1Result.valid ? '✅' : '❌'} Valid: ${step1Result.valid}`);
  if (step1Result.errors.length > 0) {
    console.log('  Errors:');
    step1Result.errors.forEach(error => console.log(`    - ${error}`));
  }
  if (step1Result.warnings.length > 0) {
    console.log('  Warnings:');
    step1Result.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  console.log('\nStep 2 Migration (Data Migration):');
  console.log(`  ${step2Result.valid ? '✅' : '❌'} Valid: ${step2Result.valid}`);
  if (step2Result.errors.length > 0) {
    console.log('  Errors:');
    step2Result.errors.forEach(error => console.log(`    - ${error}`));
  }
  if (step2Result.warnings.length > 0) {
    console.log('  Warnings:');
    step2Result.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  // Validate rollback script
  console.log('\n📋 Validating rollback script...');
  const rollbackResult = validateRollbackScript(
    path.join(scriptsDir, 'rollback-migrations.ts')
  );
  
  console.log(`Rollback Script: ${rollbackResult.valid ? '✅' : '❌'} Valid: ${rollbackResult.valid}`);
  if (rollbackResult.errors.length > 0) {
    console.log('  Errors:');
    rollbackResult.errors.forEach(error => console.log(`    - ${error}`));
  }
  if (rollbackResult.warnings.length > 0) {
    console.log('  Warnings:');
    rollbackResult.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  // Validate test script
  console.log('\n📋 Validating test script...');
  const testResult = validateTestScript(
    path.join(scriptsDir, 'test-migrations.ts')
  );
  
  console.log(`Test Script: ${testResult.valid ? '✅' : '❌'} Valid: ${testResult.valid}`);
  if (testResult.errors.length > 0) {
    console.log('  Errors:');
    testResult.errors.forEach(error => console.log(`    - ${error}`));
  }
  if (testResult.warnings.length > 0) {
    console.log('  Warnings:');
    testResult.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  // Validate package.json
  console.log('\n📋 Validating package.json...');
  const packageResult = validatePackageJson(
    path.join(__dirname, '../package.json')
  );
  
  console.log(`package.json: ${packageResult.valid ? '✅' : '❌'} Valid: ${packageResult.valid}`);
  if (packageResult.errors.length > 0) {
    console.log('  Errors:');
    packageResult.errors.forEach(error => console.log(`    - ${error}`));
  }
  if (packageResult.warnings.length > 0) {
    console.log('  Warnings:');
    packageResult.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  // Overall validation result
  const allValid = step1Result.valid && step2Result.valid && rollbackResult.valid && 
                   testResult.valid && packageResult.valid;

  console.log('\n' + '='.repeat(50));
  if (allValid) {
    console.log('🎉 All validations passed! Two-step migration implementation is ready.');
  } else {
    console.log('❌ Some validations failed. Please fix the errors before proceeding.');
  }

  return allValid;
}

// Check if this file is being run directly
if (require.main === module) {
  validateAll().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { validateAll };
