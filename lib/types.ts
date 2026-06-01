export type WorkflowStatus =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'ready';

export type PostSourceType = 'email' | 'manual';

export type ContentLanguage = 'arabic' | 'german';

export type AssetKind =
  | 'reference'
  | 'attachment'
  | 'generated_ar'
  | 'generated_de'
  | 'package'
  | 'logo';

export type LogScope =
  | 'system'
  | 'email_intake'
  | 'content'
  | 'design'
  | 'review'
  | 'package'
  | 'storage';

export type LogLevel = 'info' | 'error';

export type LanguageContent = {
  headline: string;
  paragraph: string;
  supportingLines: string[];
  caption: string;
  hashtags: string[];
};

export type BilingualContent = {
  arabic: LanguageContent;
  german: LanguageContent;
};

export type PostRecord = {
  id: string;
  sourceType: PostSourceType;
  sourceMessageId: string | null;
  sourceSubject: string | null;
  sourceFrom: string | null;
  sourceReceivedAt: string | null;
  topicTitle: string;
  topicNotes: string;
  languageHints: string;
  heroAssetId: string | null;
  status: WorkflowStatus;
  arabicContent: LanguageContent | null;
  germanContent: LanguageContent | null;
  reviewComment: string | null;
  reviewerEmail: string | null;
  approvalToken: string;
  reviewRequestedAt: string | null;
  reviewedAt: string | null;
  readyAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetRecord = {
  id: string;
  postId: string | null;
  kind: AssetKind;
  filename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type LogRecord = {
  id: string;
  postId: string | null;
  scope: LogScope;
  level: LogLevel;
  message: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type PostWithAssets = {
  post: PostRecord;
  assets: AssetRecord[];
};

export type PostSummary = {
  id: string;
  topicTitle: string;
  sourceType: PostSourceType;
  sourceFrom: string | null;
  sourceSubject: string | null;
  status: WorkflowStatus;
  updatedAt: string;
  reviewComment: string | null;
  hasArabicDesign: boolean;
  hasGermanDesign: boolean;
};

export type InboxSyncResult = {
  importedCount: number;
  skippedCount: number;
  generatedCount: number;
  postIds: string[];
};

export type GenerateContentInput = {
  topic: string;
  notes: string;
  sourceSubject?: string | null;
  sourceFrom?: string | null;
  languageHints?: string;
};

export type ReviewEmailPayload = {
  post: PostRecord;
  arabicImage: Buffer;
  germanImage: Buffer;
  reviewerEmail: string;
  approveUrl: string;
  reviewUrl: string;
};

export type StorageUploadResult = {
  storageKey: string;
};
