import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDate,
} from 'class-validator';
import { IncidentSeverity, PostmortemStatus } from '../postmortems.entity';

// Create/Update DTO
export class CreatePostmortemDto {
  @IsString()
  incidentId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsDate()
  incidentDate: Date;

  @IsDate()
  startTime: Date;

  @IsDate()
  endTime: Date;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsOptional()
  @IsArray()
  servicesAffected?: string[];

  @IsOptional()
  @IsNumber()
  usersAffected?: number;

  @IsOptional()
  @IsNumber()
  failedTransactions?: number;

  @IsOptional()
  @IsBoolean()
  slaBreached?: boolean;

  @IsOptional()
  @IsBoolean()
  dataLoss?: boolean;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsArray()
  contributingFactors?: string[];

  @IsOptional()
  @IsString()
  incidentCommander?: string;

  @IsOptional()
  @IsString()
  author?: string;
}

export class UpdatePostmortemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsArray()
  whatWentWell?: string[];

  @IsOptional()
  @IsArray()
  whatWentWrong?: string[];

  @IsOptional()
  lessonsLearned?: Record<string, string[]>;

  @IsOptional()
  @IsArray()
  actionItems?: Array<{
    id: string;
    action: string;
    owner: string;
    dueDate: Date;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
  }>;

  @IsOptional()
  @IsEnum(PostmortemStatus)
  status?: PostmortemStatus;

  @IsOptional()
  @IsString()
  facilitator?: string;

  @IsOptional()
  @IsArray()
  attendees?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

// Response DTO (publicly safe)
export class PostmortemResponseDto {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  status: PostmortemStatus;
  incidentDate: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  usersAffected: number;
  slaBreached: boolean;
  rootCause: string;
  whatWentWell: string[];
  whatWentWrong: string[];
  lessonsLearned: Record<string, string[]>;
  actionItems: Array<{
    id: string;
    action: string;
    owner: string;
    dueDate: Date;
    priority: string;
  }>;
  completedActionItems: number;
  totalActionItems: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Query DTO for filtering
export class PostmortemQueryDto {
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsEnum(PostmortemStatus)
  status?: PostmortemStatus;

  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'incidentDate' | 'severity';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

// Statistics DTO
export class PostmortemStatsDto {
  totalPostmortems: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  averageTTD: number;
  averageTTM: number;
  averageTTR: number;
  actionItemCompletionRate: number;
  mostCommonRootCauses: Array<{
    cause: string;
    count: number;
  }>;
  recentIncidents: PostmortemResponseDto[];
}
