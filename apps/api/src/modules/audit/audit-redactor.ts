const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|secret|token|api.?key|apiKey|api_key|private.?key|privateKey|private_key|payment|card|payroll|ai.?prompt|aiPrompt|ai_prompt|file.?content|fileContent|file_content|chat.?content|chatContent|chat_content|voice.?content|voiceContent|voice_content|transcript|error.?stack|errorStack|error_stack)/i;

export class AuditRedactor {
  redact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, child]) => [
          key,
          this.shouldRedact(key) ? REDACTED : this.redact(child),
        ]),
      );
    }

    return value;
  }

  shouldRedact(key: string): boolean {
    return SENSITIVE_KEY_PATTERN.test(key);
  }
}
