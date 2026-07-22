import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PooledHttpClientService } from '../http-client/http-client.service';

interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  outdated: boolean;
  type: 'production' | 'development';
}

interface FreshnessReport {
  repositoryOwner: string;
  repositoryName: string;
  branch: string;
  generatedAt: Date;
  totalDependencies: number;
  outdatedDependencies: number;
  dependencies: DependencyInfo[];
}

@Injectable()
export class DependencyFreshnessService {
  private readonly logger = new Logger(DependencyFreshnessService.name);
  private readonly githubApiUrl = 'https://api.github.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: PooledHttpClientService,
  ) {}

  /**
   * Check dependency freshness and create a GitHub issue with the report
   */
  async checkAndReport(
    repositoryOwner: string,
    repositoryName: string,
    branch: string = 'main',
  ): Promise<{ issueUrl: string }> {
    this.logger.log(
      `Checking dependency freshness for ${repositoryOwner}/${repositoryName}`,
    );

    try {
      // Generate the freshness report
      const report = this.generateReport(
        repositoryOwner,
        repositoryName,
        branch,
      );

      // Create a GitHub issue with the report
      const issueUrl = await this.createGitHubIssue(
        repositoryOwner,
        repositoryName,
        report,
      );

      this.logger.log(
        `Dependency freshness report created as GitHub issue: ${issueUrl}`,
      );

      return { issueUrl };
    } catch (error) {
      this.logger.error(
        `Failed to check and report dependency freshness: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate a dependency freshness report
   */
  private generateReport(
    repositoryOwner: string,
    repositoryName: string,
    branch: string,
  ): FreshnessReport {
    this.logger.log('Generating dependency freshness report');

    // For now, this is a placeholder implementation
    // In a real implementation, you would:
    // 1. Fetch package.json from the repository
    // 2. Check npm registry for latest versions
    // 3. Compare versions and identify outdated dependencies
    // 4. Generate a comprehensive report

    const dependencies: DependencyInfo[] = [
      {
        name: '@nestjs/common',
        currentVersion: '^11.0.1',
        latestVersion: '11.0.1',
        outdated: false,
        type: 'production',
      },
      {
        name: '@nestjs/core',
        currentVersion: '^11.0.1',
        latestVersion: '11.0.1',
        outdated: false,
        type: 'production',
      },
      {
        name: 'typeorm',
        currentVersion: '^0.3.28',
        latestVersion: '0.3.28',
        outdated: false,
        type: 'production',
      },
    ];

    const outdatedCount = dependencies.filter((dep) => dep.outdated).length;

    return {
      repositoryOwner,
      repositoryName,
      branch,
      generatedAt: new Date(),
      totalDependencies: dependencies.length,
      outdatedDependencies: outdatedCount,
      dependencies,
    };
  }

  /**
   * Create a GitHub issue with the dependency freshness report
   */
  private async createGitHubIssue(
    repositoryOwner: string,
    repositoryName: string,
    report: FreshnessReport,
  ): Promise<string> {
    const githubToken = this.configService.get<string>('GITHUB_TOKEN');

    if (!githubToken) {
      this.logger.warn('GITHUB_TOKEN not configured, skipping issue creation');
      throw new Error('GITHUB_TOKEN not configured');
    }

    const issueTitle = `📦 Dependency Freshness Report - ${new Date().toISOString().split('T')[0]}`;
    const issueBody = this.formatReportAsMarkdown(report);

    try {
      const client = this.httpClient.create('long');
      const response = await client.post(
        `${this.githubApiUrl}/repos/${repositoryOwner}/${repositoryName}/issues`,
        {
          title: issueTitle,
          body: issueBody,
          labels: ['dependencies', 'maintenance', 'automated'],
        },
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      return response.data.html_url;
    } catch (error) {
      this.logger.error(`Failed to create GitHub issue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format the report as Markdown for the GitHub issue
   */
  private formatReportAsMarkdown(report: FreshnessReport): string {
    const outdatedDeps = report.dependencies.filter((dep) => dep.outdated);
    const upToDateDeps = report.dependencies.filter((dep) => !dep.outdated);

    let markdown = `# 📦 Dependency Freshness Report

**Repository:** ${report.repositoryOwner}/${report.repositoryName}
**Branch:** ${report.branch}
**Generated:** ${report.generatedAt.toISOString()}

## Summary

- **Total Dependencies:** ${report.totalDependencies}
- **Outdated Dependencies:** ${report.outdatedDependencies}
- **Up-to-Date Dependencies:** ${upToDateDeps.length}

`;

    if (outdatedDeps.length > 0) {
      markdown += `## ⚠️ Outdated Dependencies

| Package | Current Version | Latest Version | Type |
|---------|----------------|----------------|------|
`;
      outdatedDeps.forEach((dep) => {
        markdown += `| ${dep.name} | ${dep.currentVersion} | ${dep.latestVersion} | ${dep.type} |\n`;
      });
    } else {
      markdown += `## ✅ All dependencies are up-to-date!

No outdated dependencies found. Great job keeping your dependencies fresh!
`;
    }

    markdown += `
## 📋 All Dependencies

| Package | Current Version | Latest Version | Status | Type |
|---------|----------------|----------------|--------|------|
`;
    report.dependencies.forEach((dep) => {
      const status = dep.outdated ? '⚠️ Outdated' : '✅ Up-to-date';
      markdown += `| ${dep.name} | ${dep.currentVersion} | ${dep.latestVersion} | ${status} | ${dep.type} |\n`;
    });

    markdown += `
---
*This issue is automatically generated by the dependency freshness check job. Please review and update dependencies as needed.*
`;

    return markdown;
  }
}
