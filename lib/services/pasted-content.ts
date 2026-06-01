import 'server-only';

import type { LanguageContent } from '@/lib/types';
import { truncate } from '@/lib/utils';

const META_LINE_PATTERNS = [
  /^deutsch\b/i,
  /^arabic\b/i,
  /^post-inhalt\b/i,
  /^caption\b/i,
  /^hashtags\b/i,
];

const CONTACT_LINE_PATTERNS = [
  /info@/i,
  /sh-investments\.de/i,
  /\+?\d[\d\s()+-]{7,}/,
  /^📞/,
  /^📩/,
];

export function parseStructuredPostInput(input: string): LanguageContent {
  const normalized = input.replace(/\r/g, '').trim();
  const hashtags = extractHashtags(normalized);
  const blocks = normalized
    .split(/\n\s*\n+/)
    .map((block) => cleanBlock(block))
    .filter((block) => block.length > 0);

  if (blocks.length === 0) {
    return {
      headline: '',
      paragraph: '',
      supportingLines: [],
      caption: '',
      hashtags,
    };
  }

  const firstBlockLines = [...blocks[0]];
  const headline = firstBlockLines.shift() ?? '';
  const paragraphBlocks = [firstBlockLines.join(' ').trim(), ...blocks.slice(1).map((block) => block.join(' ').trim())]
    .map((value) => value.trim())
    .filter(Boolean);

  const caption = paragraphBlocks.join('\n\n').trim();
  const paragraph = truncate(paragraphBlocks[0] ?? '', 240);
  const supportingLines = buildSupportingLines(paragraphBlocks.slice(1), caption);

  return {
    headline,
    paragraph,
    supportingLines,
    caption,
    hashtags,
  };
}

function cleanBlock(block: string) {
  return block
    .split('\n')
    .map((line) => normalizeLine(line))
    .filter(Boolean)
    .filter((line) => !isMetaLine(line))
    .filter((line) => !isContactLine(line))
    .map((line) => removeHashtags(line))
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeLine(line: string) {
  return line
    .replace(/^[\s|•·▪︎◦\-–—]+/g, '')
    .replace(/^\p{Emoji_Presentation}+/gu, '')
    .trim();
}

function isMetaLine(line: string) {
  return META_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function isContactLine(line: string) {
  return CONTACT_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function removeHashtags(line: string) {
  return line.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/\s{2,}/g, ' ').trim();
}

function extractHashtags(input: string) {
  const tags = input.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return Array.from(new Set(tags));
}

function buildSupportingLines(paragraphBlocks: string[], caption: string) {
  const sentencePool = paragraphBlocks
    .flatMap((block) => splitSentences(block))
    .concat(splitSentences(caption))
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => sentence.length > 24)
    .filter((sentence) => sentence.length <= 140);

  return Array.from(new Set(sentencePool)).slice(0, 2).map((sentence) => truncate(sentence, 120));
}

function splitSentences(input: string) {
  return input
    .split(/(?<=[.!؟?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
