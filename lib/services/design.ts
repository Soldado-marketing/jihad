import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { brandColors, companyProfile, designTokens } from '@/lib/brand';
import { getEnv } from '@/lib/env';
import { readAssetBuffer, storeAsset } from '@/lib/services/assets';
import { logEvent } from '@/lib/services/logging';
import { getLatestAssetForPost, listAssetsForPost } from '@/lib/repositories/assets';
import { getPostById } from '@/lib/repositories/posts';
import type { AssetRecord, ContentLanguage, LanguageContent } from '@/lib/types';
import { slugify } from '@/lib/utils';

const BELLEZA_FONT = path.join(
  process.cwd(),
  'node_modules/@fontsource/belleza/files/belleza-latin-400-normal.woff',
);

const ARABIC_FALLBACK_FONT = path.join(
  process.cwd(),
  'node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-500-normal.woff',
);

type RenderInput = {
  language: ContentLanguage;
  content: LanguageContent;
  heroImage?: {
    dataUri: string;
  } | null;
};

type TopicStyle = 'real_estate' | 'energy_storage' | 'ai_energy' | 'general';

export async function generateDesignAssets(postId: string) {
  const post = getPostById(postId);

  if (!post) {
    throw new Error('Post not found.');
  }

  if (!post.arabicContent || !post.germanContent) {
    throw new Error('Generate content before generating designs.');
  }

  const heroAsset = await resolveHeroAsset(post.id, post.heroAssetId);
  const heroImage =
    heroAsset && heroAsset.mimeType.startsWith('image/')
      ? {
          dataUri: `data:${heroAsset.mimeType};base64,${(
            await readAssetBuffer(heroAsset.id)
          ).toString('base64')}`,
        }
      : null;

  const arabicPng = await renderPostPng({
    language: 'arabic',
    content: post.arabicContent,
    heroImage,
  });

  const germanPng = await renderPostPng({
    language: 'german',
    content: post.germanContent,
    heroImage,
  });

  const topicSlug = slugify(post.topicTitle) || 'weekly-topic';

  const arabicAsset = await storeAsset({
    postId,
    kind: 'generated_ar',
    filename: `${topicSlug}-arabic.png`,
    buffer: arabicPng,
    mimeType: 'image/png',
    metadata: {
      width: designTokens.width,
      height: designTokens.height,
      role: 'generated-post',
    },
  });

  const germanAsset = await storeAsset({
    postId,
    kind: 'generated_de',
    filename: `${topicSlug}-german.png`,
    buffer: germanPng,
    mimeType: 'image/png',
    metadata: {
      width: designTokens.width,
      height: designTokens.height,
      role: 'generated-post',
    },
  });

  await logEvent({
    postId,
    scope: 'design',
    message: 'Generated bilingual social post designs.',
    details: {
      arabicAssetId: arabicAsset?.id,
      germanAssetId: germanAsset?.id,
      heroAssetId: heroAsset?.id ?? null,
    },
  });

  return {
    arabicAsset,
    germanAsset,
  };
}

export function getGeneratedDesignAssets(postId: string) {
  return {
    arabic: getLatestAssetForPost(postId, 'generated_ar'),
    german: getLatestAssetForPost(postId, 'generated_de'),
  };
}

async function resolveHeroAsset(postId: string, heroAssetId: string | null) {
  const assets = listAssetsForPost(postId);

  if (heroAssetId) {
    const selected = assets.find((asset) => asset.id === heroAssetId);

    if (selected) {
      return selected;
    }
  }

  return assets.find(
    (asset) =>
      asset.kind === 'attachment' &&
      asset.mimeType.startsWith('image/'),
  );
}

async function renderPostPng(input: RenderInput) {
  const svg = await renderSvg(input);

  return sharp(Buffer.from(svg), { density: 220 }).png().toBuffer();
}

async function renderSvg(input: RenderInput) {
  const latinFont = await fs.readFile(BELLEZA_FONT);
  const arabicFont = await loadArabicFont();
  const isArabic = input.language === 'arabic';
  const content = input.content;
  const topicStyle = inferTopicStyle(content);
  const align = isArabic ? 'end' : 'start';
  const direction = isArabic ? 'rtl' : 'ltr';
  const textPanelX = isArabic ? 546 : 58;
  const textPanelWidth = 476;
  const textAnchorX = isArabic ? textPanelX + textPanelWidth - 18 : textPanelX + 18;
  const heroX = isArabic ? 54 : 586;
  const heroY = 164;
  const heroWidth = 440;
  const heroHeight = 992;
  const brandX = isArabic ? 922 : 162;
  const headlineMetrics = getHeadlineMetrics(content.headline, isArabic);
  const paragraphMetrics = getParagraphMetrics(content.paragraph, isArabic);
  const headlineLines = wrapText(
    content.headline,
    headlineMetrics.maxCharsPerLine,
    headlineMetrics.maxLines,
  );
  const paragraphLines = wrapText(
    content.paragraph,
    paragraphMetrics.maxCharsPerLine,
    paragraphMetrics.maxLines,
  );
  const supportLines = content.supportingLines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
  const supportBlockY =
    642 + headlineLines.length * headlineMetrics.lineHeight + paragraphLines.length * 18;
  const contactCardX = isArabic ? 492 : 58;
  const contactTextX = isArabic ? 964 : 148;
  const contactPhoneX = isArabic ? 704 : 644;
  const badgeText = getTopicBadgeText(topicStyle, isArabic);
  const headlineFontClass = isArabic ? 'arabic' : 'latin';
  const bodyFontClass = isArabic ? 'arabic body' : 'latin body';
  const heroVisual = input.heroImage
    ? `<image href="${input.heroImage.dataUri}" x="${heroX}" y="${heroY}" width="${heroWidth}" height="${heroHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#heroClip)" />`
    : renderAbstractHero({
        x: heroX,
        y: heroY,
        width: heroWidth,
        height: heroHeight,
        isArabic,
        topicStyle,
        keywords: getTopicKeywords(topicStyle, isArabic, content),
      });

  if (!input.heroImage) {
    return renderInsightSvg({
      content,
      isArabic,
      latinFontBase64: latinFont.toString('base64'),
      arabicFontBase64: arabicFont.toString('base64'),
      topicStyle,
    });
  }

  const svg = `
    <svg width="${designTokens.width}" height="${designTokens.height}" viewBox="0 0 ${designTokens.width} ${designTokens.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${brandColors.veryDarkBlue}" />
          <stop offset="60%" stop-color="${brandColors.darkBlue}" />
          <stop offset="100%" stop-color="#3f3d72" />
        </linearGradient>
        <linearGradient id="textPanel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(8,15,39,0.70)" />
          <stop offset="100%" stop-color="rgba(39,41,82,0.58)" />
        </linearGradient>
        <linearGradient id="contactBar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${brandColors.yellow}" />
          <stop offset="100%" stop-color="${brandColors.goldYellow}" />
        </linearGradient>
        <linearGradient id="heroOverlay" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(7,15,38,0.08)" />
          <stop offset="100%" stop-color="rgba(7,15,38,0.35)" />
        </linearGradient>
        <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M 34 0 L 0 0 0 34" fill="none" stroke="rgba(252,252,252,0.07)" stroke-width="1" />
        </pattern>
        <clipPath id="heroClip">
          <rect x="${heroX}" y="${heroY}" width="${heroWidth}" height="${heroHeight}" rx="48" />
        </clipPath>
        <filter id="headlineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="16" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.88 0 0 0  0 0 0.72 0 0  0 0 0 0.55 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>
          @font-face {
            font-family: 'SHBelleza';
            src: url('data:font/woff;base64,${latinFont.toString('base64')}') format('woff');
            font-weight: 400;
            font-style: normal;
          }
          @font-face {
            font-family: 'SHArabic';
            src: url('data:font/woff;base64,${arabicFont.toString('base64')}') format('woff');
            font-weight: 500;
            font-style: normal;
          }
          .latin {
            font-family: 'SHBelleza', serif;
          }
          .arabic {
            font-family: 'SHArabic', sans-serif;
          }
          .body {
            fill: ${brandColors.white};
            font-size: 27px;
            line-height: 1.6;
          }
          .muted {
            fill: rgba(252,252,252,0.75);
            font-size: 20px;
            letter-spacing: 2px;
          }
        </style>
      </defs>

      <rect width="1080" height="1350" fill="url(#bg)" />
      <rect width="1080" height="1350" fill="url(#grid)" opacity="0.45" />
      <rect x="22" y="22" width="1036" height="1306" rx="52" fill="rgba(255,255,255,0.02)" stroke="rgba(249,202,141,0.18)" stroke-width="1.2" />
      <circle cx="${isArabic ? 178 : 902}" cy="122" r="118" fill="rgba(249,202,141,0.10)" />
      <circle cx="${isArabic ? 942 : 138}" cy="1266" r="200" fill="rgba(249,202,141,0.08)" />
      <path d="${
        isArabic
          ? 'M 0 1040 C 180 940, 342 990, 520 896 C 720 792, 864 796, 1080 684 L 1080 1350 L 0 1350 Z'
          : 'M 0 684 C 216 796, 360 792, 560 896 C 738 990, 900 940, 1080 1040 L 1080 1350 L 0 1350 Z'
      }" fill="rgba(7,15,38,0.34)" />
      <path d="${
        isArabic
          ? 'M 1080 0 L 868 0 L 664 172 L 736 238 L 1080 0 Z'
          : 'M 0 0 L 212 0 L 416 172 L 344 238 L 0 0 Z'
      }" fill="rgba(220,175,115,0.88)" opacity="0.95" />

      ${heroVisual}
      <rect x="${heroX}" y="${heroY}" width="${heroWidth}" height="${heroHeight}" rx="48" fill="url(#heroOverlay)" opacity="${input.heroImage ? '1' : '0.78'}" />
      <rect x="${heroX}" y="${heroY}" width="${heroWidth}" height="${heroHeight}" rx="48" fill="none" stroke="rgba(249,202,141,0.34)" stroke-width="2" />

      <rect x="${textPanelX}" y="214" width="${textPanelWidth}" height="${860 + supportLines.length * 44}" rx="44" fill="url(#textPanel)" stroke="rgba(249,202,141,0.18)" stroke-width="1.4" />

      ${renderBrandLockup(brandX, 72, isArabic)}

      <rect x="${isArabic ? textPanelX + textPanelWidth - 226 : textPanelX + 28}" y="194" width="198" height="46" rx="23" fill="rgba(249,202,141,0.16)" stroke="rgba(249,202,141,0.42)" stroke-width="1.3" />
      <text x="${isArabic ? textPanelX + textPanelWidth - 126 : textPanelX + 126}" y="224" class="${
        isArabic ? 'arabic' : 'latin'
      }" fill="${brandColors.yellow}" font-size="22" text-anchor="middle">${badgeText}</text>

      <text x="${textAnchorX}" y="332" class="${headlineFontClass}" fill="${brandColors.yellow}" font-size="${
        headlineMetrics.fontSize
      }" text-anchor="${align}" direction="${direction}" unicode-bidi="plaintext" ${
        !isArabic ? 'filter="url(#headlineGlow)"' : ''
      }>
        ${renderLines(headlineLines, {
          x: textAnchorX,
          startY: 332,
          lineHeight: headlineMetrics.lineHeight,
        })}
      </text>

      <text x="${textAnchorX}" y="${364 + headlineLines.length * headlineMetrics.lineHeight}" class="${bodyFontClass}" text-anchor="${align}" direction="${direction}" unicode-bidi="plaintext">
        ${renderLines(paragraphLines, {
          x: textAnchorX,
          startY: 364 + headlineLines.length * headlineMetrics.lineHeight,
          lineHeight: paragraphMetrics.lineHeight,
        })}
      </text>

      ${
        supportLines.length
          ? `<rect x="${textPanelX + 24}" y="${supportBlockY}" width="${
              textPanelWidth - 48
            }" height="${118 + supportLines.length * 46}" rx="30" fill="rgba(7,15,38,0.34)" stroke="rgba(249,202,141,0.18)" stroke-width="1" />
      ${supportLines
        .map((line, index) =>
          renderSupportLine({
            line,
            index,
            x: textAnchorX,
            align,
            isArabic,
            y: supportBlockY + 58 + index * 48,
          }),
        )
        .join('')}`
          : ''
      }

      <rect x="${contactCardX}" y="1184" width="530" height="118" rx="34" fill="url(#contactBar)" />
      <rect x="${contactCardX + 22}" y="1202" width="226" height="80" rx="24" fill="rgba(7,15,38,0.07)" opacity="0.28" />
      <rect x="${contactCardX + 282}" y="1202" width="226" height="80" rx="24" fill="rgba(7,15,38,0.07)" opacity="0.28" />
      <text x="${contactTextX}" y="1236" fill="${brandColors.veryDarkBlue}" font-size="18" class="${
        isArabic ? 'arabic' : 'latin'
      }" opacity="0.72" text-anchor="${align}">${isArabic ? 'بريد الشركة' : 'COMPANY EMAIL'}</text>
      <text x="${contactTextX}" y="1274" fill="${brandColors.veryDarkBlue}" font-size="31" class="latin" text-anchor="${align}">${companyProfile.email}</text>
      <text x="${contactPhoneX}" y="1236" fill="${brandColors.veryDarkBlue}" font-size="18" class="${
        isArabic ? 'arabic' : 'latin'
      }" opacity="0.72" text-anchor="${align}">${isArabic ? 'هاتف الشركة' : 'COMPANY PHONE'}</text>
      <text x="${contactPhoneX}" y="1274" fill="${brandColors.veryDarkBlue}" font-size="31" class="latin" text-anchor="${align}">${companyProfile.phone}</text>
    </svg>
  `;

  return svg;
}

function renderBrandLockup(x: number, y: number, isArabic: boolean) {
  const anchor = isArabic ? 'end' : 'start';
  const offsetX = isArabic ? -118 : 118;
  const wordmarkX = x + offsetX;

  return `
    <g transform="translate(${x}, ${y})">
      <path d="M 0 0 L 40 72 L -40 72 Z" fill="none" stroke="${brandColors.goldYellow}" stroke-width="3" opacity="0.95" />
      <path d="M -25 46 Q -6 18 14 46" fill="none" stroke="${brandColors.goldYellow}" stroke-width="2" opacity="0.75" />
      <path d="M -17 34 Q 0 16 17 34" fill="none" stroke="${brandColors.goldYellow}" stroke-width="2" opacity="0.7" />
      <text x="${wordmarkX}" y="42" text-anchor="${anchor}" class="latin" fill="${brandColors.white}" font-size="30" letter-spacing="7">SH INVESTMENTS</text>
      <text x="${wordmarkX}" y="72" text-anchor="${anchor}" class="latin muted">YOUR FIRST STEP</text>
    </g>
  `;
}

function renderLines(
  lines: string[],
  options: {
    x: number;
    startY: number;
    lineHeight: number;
  },
) {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${options.x}" y="${
          options.startY + index * options.lineHeight
        }">${escapeXml(line)}</tspan>`,
    )
    .join('');
}

function renderSupportLine(input: {
  line: string;
  index: number;
  x: number;
  align: 'start' | 'end';
  isArabic: boolean;
  y: number;
}) {
  const bulletX = input.isArabic ? input.x + 18 : input.x - 18;

  return `
    <circle cx="${bulletX}" cy="${input.y - 10}" r="8" fill="${brandColors.yellow}" />
    <text x="${input.x}" y="${input.y}" class="${
      input.isArabic ? 'arabic' : 'latin'
    }" fill="${brandColors.white}" font-size="28" text-anchor="${
      input.align
    }" direction="${input.isArabic ? 'rtl' : 'ltr'}" unicode-bidi="plaintext">${escapeXml(
    input.line,
  )}</text>
  `;
}

function renderAbstractHero(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  isArabic: boolean;
  topicStyle: TopicStyle;
  keywords: string[];
}) {
  const badgeX = input.isArabic ? input.x + 100 : input.x + input.width - 100;
  const illustration = renderTopicIllustration({
    topicStyle: input.topicStyle,
    x: input.x + 34,
    y: input.y + 44,
    width: input.width - 68,
    height: 520,
    isArabic: input.isArabic,
  });
  const chips = input.keywords
    .slice(0, 3)
    .map((keyword, index) =>
      renderKeywordChip({
        label: keyword,
        x: input.x + 32,
        y: input.y + 612 + index * 98,
        width: input.width - 64,
        isArabic: input.isArabic,
      }),
    )
    .join('');

  return `
    <rect x="${input.x}" y="${input.y}" width="${input.width}" height="${input.height}" rx="48" fill="rgba(255,255,255,0.05)" />
    <rect x="${input.x + 22}" y="${input.y + 22}" width="${input.width - 44}" height="${
      input.height - 44
    }" rx="38" fill="rgba(39,41,82,0.36)" stroke="rgba(249,202,141,0.12)" />
    <circle cx="${input.x + input.width / 2}" cy="${input.y + 140}" r="118" fill="rgba(249,202,141,0.08)" />
    ${illustration}
    ${chips}
    <rect x="${badgeX - 44}" y="${input.y + 56}" width="88" height="88" rx="28" fill="rgba(7,15,38,0.24)" stroke="rgba(249,202,141,0.18)" />
    <circle cx="${badgeX}" cy="${input.y + 100}" r="18" fill="rgba(249,202,141,0.68)" />
  `;
}

function renderInsightSvg(input: {
  content: LanguageContent;
  isArabic: boolean;
  latinFontBase64: string;
  arabicFontBase64: string;
  topicStyle: TopicStyle;
}) {
  const align = input.isArabic ? 'end' : 'start';
  const direction = input.isArabic ? 'rtl' : 'ltr';
  const badgeText = getTopicBadgeText(input.topicStyle, input.isArabic);
  const headlineLines = wrapText(
    input.content.headline,
    input.isArabic ? 18 : 22,
    4,
  );
  const paragraphLines = wrapText(
    input.content.paragraph,
    input.isArabic ? 31 : 35,
    3,
  );
  const supportLines = input.content.supportingLines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
  const keywords = getTopicKeywords(input.topicStyle, input.isArabic, input.content);
  const textAnchorX = input.isArabic ? 972 : 108;
  const headlineFontSize = input.isArabic ? 60 : 62;
  const headlineLineHeight = input.isArabic ? 74 : 76;
  const paragraphLineHeight = input.isArabic ? 38 : 40;
  const headlineStartY = 678;
  const paragraphStartY = headlineStartY + headlineLines.length * headlineLineHeight + 24;
  const supportStartY = paragraphStartY + paragraphLines.length * paragraphLineHeight + 34;
  const illustration = renderTopicIllustration({
    topicStyle: input.topicStyle,
    x: 180,
    y: 170,
    width: 720,
    height: 250,
    isArabic: input.isArabic,
  });
  const chipWidth = 286;
  const chipGap = 22;
  const chipY = 480;
  const chipXs = [88, 88 + chipWidth + chipGap, 88 + (chipWidth + chipGap) * 2];

  return `
    <svg width="${designTokens.width}" height="${designTokens.height}" viewBox="0 0 ${designTokens.width} ${designTokens.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${brandColors.veryDarkBlue}" />
          <stop offset="58%" stop-color="${brandColors.darkBlue}" />
          <stop offset="100%" stop-color="#3f3d72" />
        </linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(8,15,39,0.72)" />
          <stop offset="100%" stop-color="rgba(39,41,82,0.54)" />
        </linearGradient>
        <linearGradient id="contactBar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${brandColors.yellow}" />
          <stop offset="100%" stop-color="${brandColors.goldYellow}" />
        </linearGradient>
        <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M 34 0 L 0 0 0 34" fill="none" stroke="rgba(252,252,252,0.06)" stroke-width="1" />
        </pattern>
        <filter id="headlineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.88 0 0 0  0 0 0.72 0 0  0 0 0 0.5 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>
          @font-face {
            font-family: 'SHBelleza';
            src: url('data:font/woff;base64,${input.latinFontBase64}') format('woff');
            font-weight: 400;
            font-style: normal;
          }
          @font-face {
            font-family: 'SHArabic';
            src: url('data:font/woff;base64,${input.arabicFontBase64}') format('woff');
            font-weight: 500;
            font-style: normal;
          }
          .latin {
            font-family: 'SHBelleza', serif;
          }
          .arabic {
            font-family: 'SHArabic', sans-serif;
          }
        </style>
      </defs>

      <rect width="1080" height="1350" fill="url(#bg)" />
      <rect width="1080" height="1350" fill="url(#grid)" opacity="0.44" />
      <rect x="22" y="22" width="1036" height="1306" rx="52" fill="rgba(255,255,255,0.02)" stroke="rgba(249,202,141,0.18)" stroke-width="1.2" />
      <circle cx="${input.isArabic ? 180 : 906}" cy="124" r="116" fill="rgba(249,202,141,0.10)" />
      <circle cx="${input.isArabic ? 946 : 134}" cy="1232" r="186" fill="rgba(249,202,141,0.08)" />
      <path d="${
        input.isArabic
          ? 'M 0 980 C 180 882, 364 948, 552 856 C 730 770, 882 782, 1080 694 L 1080 1350 L 0 1350 Z'
          : 'M 0 694 C 198 782, 350 770, 528 856 C 716 948, 900 882, 1080 980 L 1080 1350 L 0 1350 Z'
      }" fill="rgba(7,15,38,0.34)" />
      <path d="${
        input.isArabic
          ? 'M 1080 0 L 870 0 L 664 172 L 738 242 L 1080 0 Z'
          : 'M 0 0 L 210 0 L 416 172 L 342 242 L 0 0 Z'
      }" fill="rgba(220,175,115,0.88)" />

      ${renderBrandLockup(input.isArabic ? 920 : 160, 72, input.isArabic)}
      <rect x="82" y="142" width="916" height="308" rx="48" fill="rgba(39,41,82,0.32)" stroke="rgba(249,202,141,0.24)" stroke-width="1.4" />
      <circle cx="${input.isArabic ? 170 : 910}" cy="196" r="64" fill="rgba(249,202,141,0.08)" />
      <circle cx="${input.isArabic ? 912 : 168}" cy="394" r="54" fill="rgba(249,202,141,0.06)" />
      ${illustration}

      <rect x="${input.isArabic ? 790 : 90}" y="548" width="200" height="48" rx="24" fill="rgba(249,202,141,0.14)" stroke="rgba(249,202,141,0.36)" />
      <text x="${input.isArabic ? 890 : 190}" y="579" class="${
        input.isArabic ? 'arabic' : 'latin'
      }" fill="${brandColors.yellow}" font-size="22" text-anchor="middle">${badgeText}</text>

      ${keywords
        .slice(0, 3)
        .map((keyword, index) =>
          renderKeywordChip({
            label: keyword,
            x: chipXs[index] ?? chipXs[0],
            y: chipY,
            width: chipWidth,
            isArabic: input.isArabic,
          }),
        )
        .join('')}

      <rect x="58" y="620" width="964" height="500" rx="42" fill="url(#panel)" stroke="rgba(249,202,141,0.18)" stroke-width="1.4" />
      <text x="${textAnchorX}" y="${headlineStartY}" class="${input.isArabic ? 'arabic' : 'latin'}" fill="${
        brandColors.yellow
      }" font-size="${headlineFontSize}" text-anchor="${align}" direction="${direction}" unicode-bidi="plaintext" ${
        !input.isArabic ? 'filter="url(#headlineGlow)"' : ''
      }>
        ${renderLines(headlineLines, {
          x: textAnchorX,
          startY: headlineStartY,
          lineHeight: headlineLineHeight,
        })}
      </text>

      <text x="${textAnchorX}" y="${paragraphStartY}" class="${input.isArabic ? 'arabic' : 'latin'}" fill="${
        brandColors.white
      }" font-size="30" text-anchor="${align}" direction="${direction}" unicode-bidi="plaintext">
        ${renderLines(paragraphLines, {
          x: textAnchorX,
          startY: paragraphStartY,
          lineHeight: paragraphLineHeight,
        })}
      </text>

      ${
        supportLines.length
          ? supportLines
              .map((line, index) =>
                renderSupportLine({
                  line,
                  index,
                  x: textAnchorX,
                  align,
                  isArabic: input.isArabic,
                  y: supportStartY + index * 50,
                }),
              )
              .join('')
          : ''
      }

      <rect x="58" y="1186" width="964" height="116" rx="34" fill="url(#contactBar)" />
      <rect x="80" y="1204" width="442" height="80" rx="24" fill="rgba(7,15,38,0.07)" opacity="0.28" />
      <rect x="558" y="1204" width="442" height="80" rx="24" fill="rgba(7,15,38,0.07)" opacity="0.28" />
      <text x="${input.isArabic ? 468 : 104}" y="1238" fill="${brandColors.veryDarkBlue}" font-size="18" class="${
        input.isArabic ? 'arabic' : 'latin'
      }" opacity="0.72" text-anchor="${align}">${input.isArabic ? 'بريد الشركة' : 'COMPANY EMAIL'}</text>
      <text x="${input.isArabic ? 468 : 104}" y="1276" fill="${brandColors.veryDarkBlue}" font-size="31" class="latin" text-anchor="${align}">${companyProfile.email}</text>
      <text x="${input.isArabic ? 944 : 582}" y="1238" fill="${brandColors.veryDarkBlue}" font-size="18" class="${
        input.isArabic ? 'arabic' : 'latin'
      }" opacity="0.72" text-anchor="${align}">${input.isArabic ? 'هاتف الشركة' : 'COMPANY PHONE'}</text>
      <text x="${input.isArabic ? 944 : 582}" y="1276" fill="${brandColors.veryDarkBlue}" font-size="31" class="latin" text-anchor="${align}">${companyProfile.phone}</text>
    </svg>
  `;
}

function inferTopicStyle(content: LanguageContent): TopicStyle {
  const text = `${content.headline} ${content.paragraph} ${content.caption} ${content.supportingLines.join(' ')}`.toLowerCase();

  if (/(immobil|gewerbe|wohn|miet|real estate|property|عقار|عقارات|سكن|مكاتب|تجاري|وحدات سكنية|تحويل العقارات)/i.test(text)) {
    return 'real_estate';
  }

  if (/(ki|künstliche intelligenz|artificial intelligence|ai|ذكاء اصطناعي|الذكاء الاصطناعي)/i.test(text)) {
    return 'ai_energy';
  }

  if (/(solar|wind|energy|energie|strom|storage|battery|afa|photovoltaik|batterie|طاقة|كهرباء|تخزين|بطاريات|شمسي|رياح)/i.test(text)) {
    return 'energy_storage';
  }

  return 'general';
}

function getTopicBadgeText(topicStyle: TopicStyle, isArabic: boolean) {
  if (topicStyle === 'real_estate') {
    return isArabic ? 'تحول عقاري' : 'Real estate shift';
  }

  if (topicStyle === 'energy_storage') {
    return isArabic ? 'اقتصاد الطاقة' : 'Energy economics';
  }

  if (topicStyle === 'ai_energy') {
    return isArabic ? 'ذكاء الطاقة' : 'Energy intelligence';
  }

  return isArabic ? 'رؤية سوقية' : 'Market focus';
}

function getTopicKeywords(topicStyle: TopicStyle, isArabic: boolean, content: LanguageContent) {
  if (topicStyle === 'real_estate') {
    return isArabic
      ? ['شغور تجاري', 'طلب سكني', 'إعادة استخدام']
      : ['Commercial vacancy', 'Housing demand', 'Adaptive reuse'];
  }

  if (topicStyle === 'energy_storage') {
    return isArabic
      ? ['مرونة العائد', 'توقيت السوق', 'تخزين الكهرباء']
      : ['Flexible returns', 'Market timing', 'Battery storage'];
  }

  if (topicStyle === 'ai_energy') {
    return isArabic
      ? ['تحليل البيانات', 'توقع الإنتاج', 'كفاءة التشغيل']
      : ['Data analysis', 'Forecasting', 'Operational efficiency'];
  }

  return buildFallbackKeywords(content, isArabic);
}

function buildFallbackKeywords(content: LanguageContent, isArabic: boolean) {
  const source = content.supportingLines.length ? content.supportingLines : [content.paragraph];

  return source
    .flatMap((line) => line.split(/[,.،؛:]/))
    .map((part) => part.trim())
    .filter((part) => part.length >= 8 && part.length <= 28)
    .slice(0, 3)
    .concat(isArabic ? ['تحليل أوضح'] : ['Clearer analysis'])
    .slice(0, 3);
}

function renderKeywordChip(input: {
  label: string;
  x: number;
  y: number;
  width: number;
  isArabic: boolean;
}) {
  return `
    <rect x="${input.x}" y="${input.y}" width="${input.width}" height="54" rx="27" fill="rgba(249,202,141,0.14)" stroke="rgba(249,202,141,0.30)" />
    <text x="${input.isArabic ? input.x + input.width - 26 : input.x + 26}" y="${input.y + 35}" class="${
      input.isArabic ? 'arabic' : 'latin'
    }" fill="${brandColors.white}" font-size="24" text-anchor="${
      input.isArabic ? 'end' : 'start'
    }" direction="${input.isArabic ? 'rtl' : 'ltr'}" unicode-bidi="plaintext">${escapeXml(
    input.label,
  )}</text>
  `;
}

function renderTopicIllustration(input: {
  topicStyle: TopicStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  isArabic: boolean;
}) {
  const x = input.x;
  const y = input.y;
  const w = input.width;
  const h = input.height;

  if (input.topicStyle === 'real_estate') {
    return `
      <rect x="${x + w * 0.04}" y="${y + h * 0.08}" width="${w * 0.42}" height="${h * 0.76}" rx="32" fill="rgba(255,255,255,0.05)" stroke="rgba(249,202,141,0.18)" />
      <rect x="${x + w * 0.12}" y="${y + h * 0.34}" width="${w * 0.11}" height="${h * 0.42}" rx="14" fill="rgba(249,202,141,0.12)" stroke="rgba(249,202,141,0.22)" />
      <rect x="${x + w * 0.26}" y="${y + h * 0.22}" width="${w * 0.14}" height="${h * 0.54}" rx="14" fill="rgba(249,202,141,0.16)" stroke="rgba(249,202,141,0.28)" />
      <rect x="${x + w * 0.16}" y="${y + h * 0.66}" width="${w * 0.24}" height="${h * 0.12}" rx="18" fill="rgba(7,15,38,0.30)" stroke="rgba(249,202,141,0.18)" />
      <path d="M ${x + w * 0.47} ${y + h * 0.26} L ${x + w * 0.58} ${y + h * 0.26} L ${x + w * 0.58} ${
        y + h * 0.18
      } L ${x + w * 0.68} ${y + h * 0.34} L ${x + w * 0.58} ${y + h * 0.5} L ${x + w * 0.58} ${
        y + h * 0.42
      } L ${x + w * 0.47} ${y + h * 0.42} Z" fill="${brandColors.goldYellow}" opacity="0.84" />
      <path d="M ${x + w * 0.76} ${y + h * 0.58} L ${x + w * 0.86} ${y + h * 0.46} L ${x + w * 0.96} ${
        y + h * 0.58
      } V ${y + h * 0.82} H ${x + w * 0.76} Z" fill="rgba(249,202,141,0.16)" stroke="rgba(249,202,141,0.28)" stroke-width="3" />
      <rect x="${x + w * 0.83}" y="${y + h * 0.67}" width="${w * 0.06}" height="${h * 0.15}" rx="10" fill="rgba(7,15,38,0.28)" />
    `;
  }

  if (input.topicStyle === 'ai_energy') {
    return `
      <circle cx="${x + w * 0.5}" cy="${y + h * 0.44}" r="${h * 0.22}" fill="rgba(249,202,141,0.10)" />
      <circle cx="${x + w * 0.5}" cy="${y + h * 0.44}" r="${h * 0.14}" fill="rgba(255,255,255,0.05)" stroke="rgba(249,202,141,0.26)" />
      <circle cx="${x + w * 0.2}" cy="${y + h * 0.24}" r="14" fill="${brandColors.yellow}" />
      <circle cx="${x + w * 0.8}" cy="${y + h * 0.24}" r="14" fill="${brandColors.yellow}" />
      <circle cx="${x + w * 0.26}" cy="${y + h * 0.72}" r="14" fill="${brandColors.yellow}" />
      <circle cx="${x + w * 0.74}" cy="${y + h * 0.72}" r="14" fill="${brandColors.yellow}" />
      <line x1="${x + w * 0.2}" y1="${y + h * 0.24}" x2="${x + w * 0.5}" y2="${y + h * 0.44}" stroke="rgba(249,202,141,0.34)" stroke-width="5" />
      <line x1="${x + w * 0.8}" y1="${y + h * 0.24}" x2="${x + w * 0.5}" y2="${y + h * 0.44}" stroke="rgba(249,202,141,0.34)" stroke-width="5" />
      <line x1="${x + w * 0.26}" y1="${y + h * 0.72}" x2="${x + w * 0.5}" y2="${y + h * 0.44}" stroke="rgba(249,202,141,0.34)" stroke-width="5" />
      <line x1="${x + w * 0.74}" y1="${y + h * 0.72}" x2="${x + w * 0.5}" y2="${y + h * 0.44}" stroke="rgba(249,202,141,0.34)" stroke-width="5" />
      <rect x="${x + w * 0.26}" y="${y + h * 0.78}" width="${w * 0.48}" height="${h * 0.12}" rx="18" fill="rgba(7,15,38,0.32)" stroke="rgba(249,202,141,0.18)" />
      <rect x="${x + w * 0.31}" y="${y + h * 0.815}" width="${w * 0.1}" height="12" rx="6" fill="${brandColors.yellow}" />
      <rect x="${x + w * 0.44}" y="${y + h * 0.8}" width="${w * 0.2}" height="22" rx="10" fill="rgba(249,202,141,0.16)" />
    `;
  }

  if (input.topicStyle === 'energy_storage') {
    return `
      <rect x="${x + w * 0.18}" y="${y + h * 0.16}" width="${w * 0.54}" height="${h * 0.46}" rx="32" fill="rgba(255,255,255,0.05)" stroke="rgba(249,202,141,0.24)" />
      <rect x="${x + w * 0.24}" y="${y + h * 0.24}" width="${w * 0.44}" height="${h * 0.3}" rx="24" fill="rgba(7,15,38,0.34)" stroke="rgba(249,202,141,0.18)" />
      <rect x="${x + w * 0.3}" y="${y + h * 0.34}" width="${w * 0.24}" height="${h * 0.08}" rx="12" fill="rgba(249,202,141,0.18)" />
      <rect x="${x + w * 0.69}" y="${y + h * 0.34}" width="${w * 0.025}" height="${h * 0.08}" rx="6" fill="${brandColors.goldYellow}" />
      <path d="M ${x + w * 0.18} ${y + h * 0.82} C ${x + w * 0.28} ${y + h * 0.62}, ${x + w * 0.36} ${y + h * 0.62}, ${
        x + w * 0.46
      } ${y + h * 0.82}" fill="none" stroke="rgba(249,202,141,0.28)" stroke-width="8" />
      <path d="M ${x + w * 0.42} ${y + h * 0.82} C ${x + w * 0.52} ${y + h * 0.62}, ${x + w * 0.6} ${y + h * 0.62}, ${
        x + w * 0.7
      } ${y + h * 0.82}" fill="none" stroke="rgba(249,202,141,0.28)" stroke-width="8" />
      <circle cx="${x + w * 0.22}" cy="${y + h * 0.8}" r="14" fill="${brandColors.yellow}" />
      <circle cx="${x + w * 0.46}" cy="${y + h * 0.8}" r="14" fill="${brandColors.yellow}" />
      <circle cx="${x + w * 0.7}" cy="${y + h * 0.8}" r="14" fill="${brandColors.yellow}" />
    `;
  }

  return `
    <rect x="${x + w * 0.12}" y="${y + h * 0.16}" width="${w * 0.76}" height="${h * 0.58}" rx="34" fill="rgba(255,255,255,0.05)" stroke="rgba(249,202,141,0.18)" />
    <circle cx="${x + w * 0.5}" cy="${y + h * 0.38}" r="${h * 0.2}" fill="rgba(249,202,141,0.10)" />
    <path d="M ${x + w * 0.22} ${y + h * 0.76} C ${x + w * 0.34} ${y + h * 0.52}, ${x + w * 0.52} ${
      y + h * 0.52
    }, ${x + w * 0.7} ${y + h * 0.74}" fill="none" stroke="rgba(249,202,141,0.28)" stroke-width="10" />
  `;
}

function getHeadlineMetrics(text: string, isArabic: boolean) {
  const length = text.replace(/\s+/g, '').length;

  if (isArabic) {
    if (length <= 28) {
      return { fontSize: 78, lineHeight: 88, maxCharsPerLine: 14, maxLines: 4 };
    }
    if (length <= 56) {
      return { fontSize: 66, lineHeight: 76, maxCharsPerLine: 17, maxLines: 4 };
    }
    return { fontSize: 56, lineHeight: 66, maxCharsPerLine: 20, maxLines: 4 };
  }

  if (length <= 34) {
    return { fontSize: 78, lineHeight: 88, maxCharsPerLine: 15, maxLines: 4 };
  }
  if (length <= 70) {
    return { fontSize: 66, lineHeight: 76, maxCharsPerLine: 18, maxLines: 4 };
  }
  return { fontSize: 56, lineHeight: 66, maxCharsPerLine: 20, maxLines: 5 };
}

function getParagraphMetrics(text: string, isArabic: boolean) {
  const length = text.replace(/\s+/g, '').length;

  if (isArabic) {
    if (length <= 90) {
      return { lineHeight: 42, maxCharsPerLine: 24, maxLines: 3 };
    }
    return { lineHeight: 38, maxCharsPerLine: 28, maxLines: 4 };
  }

  if (length <= 110) {
    return { lineHeight: 40, maxCharsPerLine: 27, maxLines: 3 };
  }
  return { lineHeight: 36, maxCharsPerLine: 31, maxLines: 4 };
}

function wrapText(text: string, wordsPerLine: number, maxLines: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  let overflow = false;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > wordsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) {
        overflow = true;
        break;
      }
      continue;
    }

    current = candidate;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  } else if (current) {
    overflow = true;
  }

  return lines.slice(0, maxLines).map((line, index, arr) => {
    if (index === arr.length - 1 && overflow) {
      return `${line.replace(/[.!?؟]$/, '')}…`;
    }

    return line;
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadArabicFont() {
  const env = getEnv();

  if (env.SH_ARABIC_FONT_FILE) {
    try {
      return await fs.readFile(path.resolve(process.cwd(), env.SH_ARABIC_FONT_FILE));
    } catch {
      await logEvent({
        scope: 'design',
        level: 'error',
        message: 'Configured Arabic font file could not be loaded. Falling back to Noto Sans Arabic.',
        details: {
          configuredFontFile: env.SH_ARABIC_FONT_FILE,
        },
      });
    }
  }

  return fs.readFile(ARABIC_FALLBACK_FONT);
}
