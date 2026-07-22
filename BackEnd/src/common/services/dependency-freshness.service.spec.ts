import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DependencyFreshnessService } from './dependency-freshness.service';
import axios from 'axios';

jest.mock('axios');

describe('DependencyFreshnessService', () => {
  let service: DependencyFreshnessService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DependencyFreshnessService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DependencyFreshnessService>(
      DependencyFreshnessService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAndReport', () => {
    it('should generate report and create GitHub issue when token is configured', async () => {
      (configService.get as jest.Mock).mockReturnValue('test-github-token');
      (axios.post as jest.Mock).mockResolvedValue({
        data: { html_url: 'https://github.com/test/repo/issues/1' },
      });

      const result = await service.checkAndReport(
        'test-owner',
        'test-repo',
        'main',
      );

      expect(result).toEqual({
        issueUrl: 'https://github.com/test/repo/issues/1',
      });
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/issues',
        expect.objectContaining({
          title: expect.stringContaining('Dependency Freshness Report'),
          labels: ['dependencies', 'maintenance', 'automated'],
        }),
        expect.any(Object),
      );
    });

    it('should throw error when GitHub token is not configured', async () => {
      (configService.get as jest.Mock).mockReturnValue(null);

      await expect(
        service.checkAndReport('test-owner', 'test-repo', 'main'),
      ).rejects.toThrow('GITHUB_TOKEN not configured');
    });

    it('should handle GitHub API errors', async () => {
      (configService.get as jest.Mock).mockReturnValue('test-github-token');
      (axios.post as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(
        service.checkAndReport('test-owner', 'test-repo', 'main'),
      ).rejects.toThrow('API Error');
    });
  });

  describe('generateReport', () => {
    it('should generate a report with dependency information', async () => {
      const report = await service['generateReport'](
        'test-owner',
        'test-repo',
        'main',
      );

      expect(report).toHaveProperty('repositoryOwner', 'test-owner');
      expect(report).toHaveProperty('repositoryName', 'test-repo');
      expect(report).toHaveProperty('branch', 'main');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('totalDependencies');
      expect(report).toHaveProperty('outdatedDependencies');
      expect(report).toHaveProperty('dependencies');
      expect(Array.isArray(report.dependencies)).toBe(true);
    });
  });

  describe('formatReportAsMarkdown', () => {
    it('should format report as markdown', () => {
      const report = {
        repositoryOwner: 'test-owner',
        repositoryName: 'test-repo',
        branch: 'main',
        generatedAt: new Date('2024-01-01'),
        totalDependencies: 2,
        outdatedDependencies: 1,
        dependencies: [
          {
            name: 'package1',
            currentVersion: '1.0.0',
            latestVersion: '1.0.0',
            outdated: false,
            type: 'production' as const,
          },
          {
            name: 'package2',
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            outdated: true,
            type: 'production' as const,
          },
        ],
      };

      const markdown = service['formatReportAsMarkdown'](report);

      expect(markdown).toContain('# 📦 Dependency Freshness Report');
      expect(markdown).toContain('test-owner/test-repo');
      expect(markdown).toContain('Total Dependencies: 2');
      expect(markdown).toContain('Outdated Dependencies: 1');
      expect(markdown).toContain('package1');
      expect(markdown).toContain('package2');
    });
  });
});
