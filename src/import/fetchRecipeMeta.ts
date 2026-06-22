import { colorForString, imageDataUrl, toHostLabel } from '../utils/app';

export type RecipeMeta = {
  url: string;
  name: string;
  desc: string;
  image: string;
  color: string;
  fromSite: boolean;
};

const SAMPLE_NAMES = ['香味だれの鶏ごはん', '春野菜の味噌スープ', 'ふわとろ卵の丼', '焼くだけ包みハンバーグ', 'スパイスバターカレー'];

const SAMPLE_DESCS = [
  '下ごしらえを少なくして、平日の夜にも作りやすい家庭向けのレシピです。',
  '冷蔵庫にある野菜を合わせやすく、作り置きにも向いた一品です。',
  '短い手順で仕上げられる、メモしておきたい定番の味です。',
  '火加減をゆるく保つと失敗しにくい、やさしい味つけです。',
  '香りを立ててから煮ると、少ない材料でも満足感が出ます。'
];

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function fetchRecipeMeta(url: string): Promise<RecipeMeta> {
  const normalized = normalizeUrl(url);
  const color = colorForString(normalized || url || 'recipe');
  const index = Math.abs([...normalized].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % SAMPLE_NAMES.length;
  const host = toHostLabel(normalized).replace(/\/$/, '');
  const name = host ? `${SAMPLE_NAMES[index]} (${host.split('/')[0]})` : SAMPLE_NAMES[index];
  const desc = SAMPLE_DESCS[index];

  await new Promise((resolve) => window.setTimeout(resolve, 650));

  return {
    url: normalized,
    name,
    desc,
    color,
    image: imageDataUrl(name, color),
    fromSite: true
  };
}

export function metaFromShareQuery(params: URLSearchParams): RecipeMeta | null {
  const url = normalizeUrl(params.get('url') || '');
  if (!url) return null;
  const title = params.get('title') || '';
  const desc = params.get('desc') || '';
  const color = colorForString(url);
  const name = title.trim() || `取り込みレシピ (${toHostLabel(url).split('/')[0]})`;
  const image = params.get('image') || '';

  return {
    url,
    name,
    desc,
    color,
    image,
    fromSite: true
  };
}
