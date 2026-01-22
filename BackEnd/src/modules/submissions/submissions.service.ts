import { Injectable } from '@nestjs/common';
import { Submission } from './entities/submission.entity';
import { SubmitProofDto } from './dto/submit-proof.dto';
import * as crypto from 'crypto';

@Injectable()
export class SubmissionsService {
  private submissions: Submission[] = [];

  submitProof(dto: SubmitProofDto): Submission {
    // Prevent duplicate submission
    const exists = this.submissions.find(
      s => s.userId === dto.userId && s.questId === dto.questId,
    );
    if (exists) {
      throw new Error('User has already submitted for this quest');
    }

    // Generate proof hash
    const hash = crypto
      .createHash('sha256')
      .update(dto.fileContent)
      .digest('hex');

    // Create submission record
    const submission: Submission = {
      id: (this.submissions.length + 1).toString(),
      userId: dto.userId,
      questId: dto.questId,
      fileUrl: dto.fileName,
      proofHash: hash,
      status: 'pending',
      createdAt: new Date(),
    };

    this.submissions.push(submission);
    return submission;
  }

  getUserSubmissions(userId: string): Submission[] {
    return this.submissions.filter(s => s.userId === userId);
  }

  getQuestSubmissions(questId: string): Submission[] {
    return this.submissions.filter(s => s.questId === questId);
  }
}
