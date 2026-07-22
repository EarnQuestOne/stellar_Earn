import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

type ApiResponseShape = { status: number; description: string; type?: any };

export const ApiDocs = (
  options: {
    tags?: string[];
    summary?: string;
    bearer?: boolean;
    responses?: ApiResponseShape[];
  } = {},
) => {
  const decorators = [] as any[];
  if (options.tags && options.tags.length)
    decorators.push(ApiTags(...options.tags));
  if (options.bearer) decorators.push(ApiBearerAuth('JWT-auth'));
  if (options.summary)
    decorators.push(ApiOperation({ summary: options.summary }));
  if (options.responses)
    options.responses.forEach((r) => decorators.push(ApiResponse(r)));

  return applyDecorators(...decorators);
};
