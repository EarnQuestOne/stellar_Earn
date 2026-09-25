import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StellarService } from '../stellar/stellar.service';
import { Submission } from '../submissions/entities/submission.entity';
import {
  AppealDisputeDto,
  OpenDisputeDto,
  ResolveDisputeDto,
} from './dto/dispute.dto';
import { Dispute, DisputeStatus } from './entities/dispute.entity';

export interface DisputeActor {
  id: string;
  stellarAddress: string;
  role: string;
}

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    private readonly stellar: StellarService,
  ) {}

  async open(dto: OpenDisputeDto, actor: DisputeActor): Promise<Dispute> {
    const submission = await this.submissions.findOne({
      where: { id: dto.submissionId },
      relations: ['quest', 'user'],
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (
      submission.user?.id !== actor.id ||
      submission.user.stellarAddress !== actor.stellarAddress
    ) {
      throw new ForbiddenException(
        'Only the submission participant can open a dispute',
      );
    }
    if (submission.status !== 'REJECTED')
      throw new BadRequestException(
        'Only rejected submissions can be disputed',
      );

    const result = await this.stellar.openDispute(
      submission.quest.contractTaskId,
      actor.stellarAddress,
      dto.arbitratorAddress,
    );
    const dispute = this.disputes.create({
      questId: submission.questId,
      submissionId: submission.id,
      initiatorAddress: actor.stellarAddress,
      arbitratorAddress: dto.arbitratorAddress,
      status: DisputeStatus.PENDING,
      openTransactionHash: result.hash,
      filedAt: new Date(),
    });
    return this.disputes.save(dispute);
  }

  async appeal(
    id: string,
    dto: AppealDisputeDto,
    actor: DisputeActor,
  ): Promise<Dispute> {
    const dispute = await this.get(id);
    this.requireParticipant(dispute, actor);
    if (dispute.status !== DisputeStatus.RESOLVED)
      throw new BadRequestException('Only resolved disputes can be appealed');
    const result = await this.stellar.appealDispute(
      dispute.questId,
      dispute.initiatorAddress,
      dto.newArbitratorAddress,
    );
    dispute.status = DisputeStatus.APPEALED;
    dispute.arbitratorAddress = dto.newArbitratorAddress;
    dispute.appealTransactionHash = result.hash;
    return this.disputes.save(dispute);
  }

  async resolve(
    id: string,
    dto: ResolveDisputeDto,
    actor: DisputeActor,
  ): Promise<Dispute> {
    const dispute = await this.get(id);
    if (
      actor.role !== 'ADMIN' &&
      actor.stellarAddress !== dispute.arbitratorAddress
    ) {
      throw new ForbiddenException(
        'Only the assigned arbitrator or an admin can resolve a dispute',
      );
    }
    const result = await this.stellar.resolveDispute(
      dispute.questId,
      dispute.initiatorAddress,
      actor.stellarAddress,
      dto.upheld,
      dto.slashBps ?? 0,
    );
    dispute.status = DisputeStatus.RESOLVED;
    dispute.upheld = dto.upheld;
    dispute.slashBps = dto.slashBps ?? 0;
    dispute.resolutionTransactionHash = result.hash;
    dispute.resolvedAt = new Date();
    return this.disputes.save(dispute);
  }

  async get(id: string, actor?: DisputeActor): Promise<Dispute> {
    const dispute = await this.disputes.findOne({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (
      actor &&
      actor.role !== 'ADMIN' &&
      dispute.initiatorAddress !== actor.stellarAddress &&
      dispute.arbitratorAddress !== actor.stellarAddress
    ) {
      throw new ForbiddenException('You cannot view this dispute');
    }
    return dispute;
  }

  list(actor: DisputeActor): Promise<Dispute[]> {
    return this.disputes.find({
      where:
        actor.role === 'ADMIN'
          ? {}
          : { initiatorAddress: actor.stellarAddress },
      order: { createdAt: 'DESC' },
    });
  }

  private requireParticipant(dispute: Dispute, actor: DisputeActor): void {
    if (dispute.initiatorAddress !== actor.stellarAddress)
      throw new ForbiddenException('Only the dispute participant can appeal');
  }
}
