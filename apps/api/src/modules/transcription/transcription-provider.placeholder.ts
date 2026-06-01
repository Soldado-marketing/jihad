import { Injectable } from '@nestjs/common';

export type TranscriptionPlaceholderResult = {
  status: 'COMPLETED' | 'LOW_CONFIDENCE';
  language: 'ar' | 'en' | 'de' | 'mixed';
  text: string;
  confidence: number;
  providerPolicy: {
    externalProviderCalled: false;
    unauthorizedTrainingAllowed: false;
    retentionReviewRequired: true;
    supportedLanguages: ['ar', 'en', 'de', 'mixed'];
  };
};

@Injectable()
export class TranscriptionProviderPlaceholder {
  transcribePlaceholder(input: {
    voiceNoteId: string;
    languageHint?: 'ar' | 'en' | 'de' | 'mixed';
  }): TranscriptionPlaceholderResult {
    const language = input.languageHint ?? 'mixed';

    return {
      confidence: 0.82,
      language,
      providerPolicy: {
        externalProviderCalled: false,
        retentionReviewRequired: true,
        supportedLanguages: ['ar', 'en', 'de', 'mixed'],
        unauthorizedTrainingAllowed: false,
      },
      status: language === 'mixed' ? 'LOW_CONFIDENCE' : 'COMPLETED',
      text: `Placeholder transcript for voice note ${input.voiceNoteId}. Human review is required before task creation.`,
    };
  }
}
