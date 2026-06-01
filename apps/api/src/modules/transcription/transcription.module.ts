import { Module } from '@nestjs/common';
import { TranscriptionProviderPlaceholder } from './transcription-provider.placeholder';

@Module({
  providers: [TranscriptionProviderPlaceholder],
  exports: [TranscriptionProviderPlaceholder],
})
export class TranscriptionModule {}
