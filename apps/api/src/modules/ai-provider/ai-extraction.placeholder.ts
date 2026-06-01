import { Injectable } from '@nestjs/common';

export type VoiceTaskExtractionPlaceholder = {
  externalProviderCalled: false;
  taskCreatedAutomatically: false;
  humanConfirmationRequired: true;
  title: string;
  description: string;
  suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
};

@Injectable()
export class AiExtractionPlaceholderService {
  extractTaskDraftFromTranscript(input: {
    transcriptId?: string;
    transcriptText?: string;
  }): VoiceTaskExtractionPlaceholder {
    return {
      description:
        input.transcriptText ??
        'Placeholder description extracted from transcript. Review before confirmation.',
      externalProviderCalled: false,
      humanConfirmationRequired: true,
      suggestedPriority: 'MEDIUM',
      taskCreatedAutomatically: false,
      title: `Task draft from transcript ${input.transcriptId ?? 'placeholder'}`,
    };
  }
}
