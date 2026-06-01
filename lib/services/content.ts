import 'server-only';

import OpenAI from 'openai';
import { z } from 'zod';

import { getContentProvider, getEnv } from '@/lib/env';
import type { BilingualContent, GenerateContentInput } from '@/lib/types';

const languageContentSchema = z.object({
  headline: z.string().min(8),
  paragraph: z.string().min(40),
  supportingLines: z.array(z.string().min(8)).min(1).max(2),
  caption: z.string().min(40),
  hashtags: z.array(z.string().min(2)).min(4).max(8),
});

const bilingualContentSchema = z.object({
  arabic: languageContentSchema,
  german: languageContentSchema,
});

export async function generateBilingualContent(
  input: GenerateContentInput,
): Promise<BilingualContent> {
  const provider = getContentProvider();

  if (provider === 'mock') {
    return generateMockContent(input);
  }

  const env = getEnv();
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  const prompt = `
You write bilingual social media copy for SH Investments, a German investment company.

Return JSON only with this shape:
{
  "arabic": {
    "headline": "...",
    "paragraph": "...",
    "supportingLines": ["...", "..."],
    "caption": "...",
    "hashtags": ["#...", "#..."]
  },
  "german": {
    "headline": "...",
    "paragraph": "...",
    "supportingLines": ["...", "..."],
    "caption": "...",
    "hashtags": ["#...", "#..."]
  }
}

Rules:
- Arabic must be natural, polished, and ready for RTL layout.
- German must be native-level, professional, and precise.
- Keep tone premium, trustworthy, and business-oriented.
- Avoid weak marketing phrases, hype, exaggerated claims, and legal or financial guarantees.
- Use the same strategic meaning in both languages, but do not translate literally.
- Headline: concise and strong.
- Paragraph: one compact informative paragraph.
- Supporting lines: 1 or 2 short lines.
- Caption: 2 short paragraphs max, suitable for Instagram/Facebook/TikTok manual posting.
- Hashtags: 4 to 8 relevant hashtags per language.
- Mention SH Investments naturally only when useful.

Topic: ${input.topic}
Notes: ${input.notes || 'No extra notes provided.'}
Language hints: ${input.languageHints || 'No language hints provided.'}
Email subject: ${input.sourceSubject || 'Not available'}
Sender: ${input.sourceFrom || 'Not available'}
`;

  const response = await client.responses.create({
    model: env.OPENAI_MODEL || 'gpt-4.1-mini',
    input: prompt,
  });

  const raw = response.output_text.trim();
  const parsed = bilingualContentSchema.parse(JSON.parse(raw));

  return {
    arabic: normalizeContent(parsed.arabic),
    german: normalizeContent(parsed.german),
  };
}

function normalizeContent(
  content: z.infer<typeof languageContentSchema>,
) {
  return {
    headline: content.headline.trim(),
    paragraph: content.paragraph.trim(),
    supportingLines: content.supportingLines.map((line) => line.trim()),
    caption: content.caption.trim(),
    hashtags: content.hashtags.map((tag) =>
      tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`,
    ),
  };
}

function generateMockContent(input: GenerateContentInput): BilingualContent {
  const topic = input.topic.trim();

  return {
    arabic: {
      headline: `رؤية أوضح حول ${topic}`,
      paragraph:
        `تقدّم SH Investments قراءة عملية لموضوع ${topic} من منظور استثماري يوازن بين الفرص، جودة القرار، وإدارة المخاطر بعيدًا عن الوعود المبالغ فيها.`,
      supportingLines: [
        'معلومة مختصرة تساعدك على فهم الصورة الاستثمارية بشكل أدق.',
        'محتوى مهني واضح ومناسب لقرارات الأعمال طويلة المدى.',
      ],
      caption:
        `عندما يكون موضوع هذا الأسبوع هو ${topic}، فالأولوية ليست الضجيج التسويقي بل الوضوح.\n\nنقدّم في هذا المنشور زاوية مختصرة تساعد على فهم الأثر الاستثماري واتخاذ قرار أكثر اتزانًا.`,
      hashtags: [
        '#SHInvestments',
        '#استثمار',
        '#أعمال',
        '#ألمانيا',
        '#فرص_استثمارية',
      ],
    },
    german: {
      headline: `Klarer einordnen: ${topic}`,
      paragraph:
        `SH Investments beleuchtet ${topic} in einem sachlichen Investment-Kontext und fokussiert sich auf Einordnung, Chancenbewertung und saubere Risikoperspektiven statt auf überzogene Versprechen.`,
      supportingLines: [
        'Kurze Einordnung für fundiertere Geschäftsentscheidungen.',
        'Präzise formuliert, professionell aufbereitet, direkt nutzbar.',
      ],
      caption:
        `Beim Wochenthema ${topic} zählt nicht Lautstärke, sondern Klarheit.\n\nDieser Beitrag ordnet das Thema kompakt ein und zeigt, worauf Investorinnen und Investoren in der Praxis achten sollten.`,
      hashtags: [
        '#SHInvestments',
        '#Investment',
        '#Business',
        '#Aachen',
        '#Markteinordnung',
      ],
    },
  };
}
