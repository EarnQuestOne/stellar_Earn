import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payout } from '../entities/payout.entity';

export interface FraudRiskAssessment {
  payoutId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  flagged: boolean;
  timestamp: Date;
}

export interface AnomalyDetectionResult {
  totalPayoutsChecked: number;
  flaggedPayouts: number;
  assessments: FraudRiskAssessment[];
}

@Injectable()
export class FraudRiskRulesService {
  private readonly logger = new Logger(FraudRiskRulesService.name);

  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
  ) {}

  /**
   * Analyze payout for fraud/risk anomalies
   * This is a placeholder implementation that can be extended with actual rules
   */
  async analyzePayout(payoutId: string): Promise<FraudRiskAssessment> {
    this.logger.log(`Analyzing payout ${payoutId} for fraud/risk anomalies`);

    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error(`Payout ${payoutId} not found`);
    }

    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Rule 1: Check for unusually high amounts
    if (payout.amount > 10000) {
      riskFactors.push('Unusually high payout amount');
      riskLevel = this.increaseRiskLevel(riskLevel, 'high');
    }

    // Rule 2: Check for multiple payouts to same address in short time
    const recentPayouts = await this.payoutRepository.find({
      where: {
        stellarAddress: payout.stellarAddress,
        createdAt: Between(
          new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          new Date(),
        ),
      },
    });

    if (recentPayouts.length > 5) {
      riskFactors.push('Multiple payouts to same address in 24 hours');
      riskLevel = this.increaseRiskLevel(riskLevel, 'medium');
    }

    // Rule 3: Check for failed payout attempts
    if (payout.retryCount > 2) {
      riskFactors.push('Multiple failed payout attempts');
      riskLevel = this.increaseRiskLevel(riskLevel, 'medium');
    }

    // Rule 4: Check for payout to new address (no previous history)
    const previousPayouts = await this.payoutRepository.find({
      where: { stellarAddress: payout.stellarAddress },
      take: 1,
    });

    if (previousPayouts.length === 0) {
      riskFactors.push('Payout to new address with no history');
      riskLevel = this.increaseRiskLevel(riskLevel, 'low');
    }

    // Rule 5: Check for suspicious asset types
    if (payout.asset !== 'XLM' && payout.asset !== 'USDC') {
      riskFactors.push('Payout in non-standard asset');
      riskLevel = this.increaseRiskLevel(riskLevel, 'medium');
    }

    const flagged = riskLevel === 'high' || riskLevel === 'critical';

    const assessment: FraudRiskAssessment = {
      payoutId: payout.id,
      riskLevel,
      riskFactors,
      flagged,
      timestamp: new Date(),
    };

    this.logger.log(
      `Payout ${payoutId} risk assessment: ${riskLevel}, flagged: ${flagged}`,
    );

    return assessment;
  }

  /**
   * Batch analyze multiple payouts for anomalies
   */
  async analyzeRecentPayouts(
    hours: number = 24,
  ): Promise<AnomalyDetectionResult> {
    this.logger.log(`Analyzing payouts from last ${hours} hours for anomalies`);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentPayouts = await this.payoutRepository.find({
      where: {
        createdAt: Between(since, new Date()),
      },
    });

    const assessments: FraudRiskAssessment[] = [];

    for (const payout of recentPayouts) {
      try {
        const assessment = await this.analyzePayout(payout.id);
        assessments.push(assessment);
      } catch (error) {
        this.logger.error(
          `Failed to analyze payout ${payout.id}: ${error.message}`,
        );
      }
    }

    const flaggedPayouts = assessments.filter((a) => a.flagged).length;

    return {
      totalPayoutsChecked: recentPayouts.length,
      flaggedPayouts,
      assessments,
    };
  }

  /**
   * Check if a payout should be blocked based on risk assessment
   */
  async shouldBlockPayout(payoutId: string): Promise<boolean> {
    const assessment = await this.analyzePayout(payoutId);
    return assessment.riskLevel === 'critical';
  }

  /**
   * Get payout statistics for risk analysis
   */
  async getRiskStatistics(): Promise<{
    totalPayouts: number;
    highRiskPayouts: number;
    criticalRiskPayouts: number;
    averagePayoutAmount: number;
    uniqueAddresses: number;
  }> {
    const totalPayouts = await this.payoutRepository.count();

    const highRiskPayouts = await this.payoutRepository
      .createQueryBuilder('payout')
      .where('payout.amount > :threshold', { threshold: 10000 })
      .getCount();

    const criticalRiskPayouts = await this.payoutRepository
      .createQueryBuilder('payout')
      .where('payout.amount > :threshold', { threshold: 50000 })
      .getCount();

    const avgAmountResult = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('AVG(payout.amount)', 'avg')
      .getRawOne();

    const uniqueAddressesResult = await this.payoutRepository
      .createQueryBuilder('payout')
      .select('COUNT(DISTINCT payout.stellarAddress)', 'count')
      .getRawOne();

    return {
      totalPayouts,
      highRiskPayouts,
      criticalRiskPayouts,
      averagePayoutAmount: parseFloat(avgAmountResult.avg) || 0,
      uniqueAddresses: parseInt(uniqueAddressesResult.count) || 0,
    };
  }

  /**
   * Helper method to increase risk level
   */
  private increaseRiskLevel(
    current: 'low' | 'medium' | 'high' | 'critical',
    target: 'low' | 'medium' | 'high' | 'critical',
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const targetIndex = levels.indexOf(target);
    return levels[Math.max(currentIndex, targetIndex)] as any;
  }
}
