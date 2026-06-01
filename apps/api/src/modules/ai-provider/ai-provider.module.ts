import { Module } from '@nestjs/common';
import { AiExtractionPlaceholderService } from './ai-extraction.placeholder';

@Module({
  providers: [AiExtractionPlaceholderService],
  exports: [AiExtractionPlaceholderService],
})
export class AiProviderModule {}
