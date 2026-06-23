import type { Recipe, SmartCondition } from '../types';

const MS_PER_DAY = 86_400_000;

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }
  return new Date(year, month - 1, day);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysSince(value: string, today = new Date()): number {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return Math.floor((startOfLocalDay(today).getTime() - date.getTime()) / MS_PER_DAY);
}

export function fmtFull(value: string): string {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function fmtRel(value: string, today = new Date()): string {
  const days = daysSince(value, today);
  if (days <= 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
  return `${Math.floor(days / 365)}年前`;
}

export function stars(rating: number): { filled: string; empty: string } {
  const n = Math.max(0, Math.min(5, Math.trunc(rating)));
  return {
    filled: '★'.repeat(n),
    empty: '★'.repeat(5 - n)
  };
}

export function allTags(recipes: Recipe[]): string[] {
  return [...new Set(recipes.flatMap((recipe) => recipe.tags))];
}

export function evalSmart(
  recipes: Recipe[],
  condition: SmartCondition | null | undefined,
  today = new Date()
): Recipe[] {
  if (!condition) return [];

  const keyword = condition.keyword.trim().toLocaleLowerCase();

  return recipes.filter((recipe) => {
    if (keyword) {
      const target = `${recipe.name}\n${recipe.body}`.toLocaleLowerCase();
      if (!target.includes(keyword)) return false;
    }

    if (condition.minRating > 0 && recipe.rating < condition.minRating) {
      return false;
    }

    if (condition.notMadeDays > 0 && daysSince(recipe.lastMade, today) < condition.notMadeDays) {
      return false;
    }

    if (condition.tags.length) {
      if (condition.tagMode === 'all') {
        if (!condition.tags.every((tag) => recipe.tags.includes(tag))) return false;
      } else if (!condition.tags.some((tag) => recipe.tags.includes(tag))) {
        return false;
      }
    }

    return true;
  });
}

export function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function mdToHtml(markdown: string): string {
  const lines = (markdown || '').split('\n');
  let html = '';
  let mode: 'ul' | 'ol' | null = null;

  const close = () => {
    if (mode === 'ul') html += '</ul>';
    if (mode === 'ol') html += '</ol>';
    mode = null;
  };

  const inline = (value: string) =>
    esc(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // [text](http...) → リンク（http/https のみ。javascript: 等は無視）
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      // 裸の URL を自動リンク（既存リンクの href/テキスト内は除外）
      .replace(/(^|[^"=>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>');

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      close();
      html += `<h2>${inline(trimmed.slice(3))}</h2>`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (mode !== 'ol') {
        close();
        mode = 'ol';
        html += '<ol>';
      }
      html += `<li>${inline(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
    } else if (trimmed.startsWith('- ')) {
      if (mode !== 'ul') {
        close();
        mode = 'ul';
        html += '<ul>';
      }
      html += `<li>${inline(trimmed.slice(2))}</li>`;
    } else if (trimmed === '') {
      close();
    } else {
      close();
      html += `<p>${inline(trimmed)}</p>`;
    }
  });

  close();
  return html;
}
