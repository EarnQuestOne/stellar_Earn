import { PartialType } from '@nestjs/swagger';
import { CreateQuestDto } from './create-quest.dto';

export class UpdateQuestDto extends PartialType(CreateQuestDto) { }
