import JSZip from 'jszip';
import { db, exportSnapshot, getLocalImage, putLocalImage, replaceSnapshot } from '../db';
import { SCHEMA_VERSION, type Recipe, type RecipeImage, type RecipeSnapshot } from '../types';
import { makeId } from '../utils/app';

const LAST_BACKUP_KEY = 'uchirecipe:lastBackupAt';

type BackupData = RecipeSnapshot;

export function getLastBackupAt(): number | null {
  const value = window.localStorage.getItem(LAST_BACKUP_KEY);
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function setLastBackupAt(value = Date.now()): number {
  window.localStorage.setItem(LAST_BACKUP_KEY, String(value));
  return value;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportBackupZip(): Promise<number> {
  const snapshot = await exportSnapshot();
  const zip = new JSZip();

  const recipes: Recipe[] = [];

  for (const recipe of snapshot.recipes) {
    const images: RecipeImage[] = [];

    for (let index = 0; index < recipe.images.length; index += 1) {
      const image = recipe.images[index];
      if (image.type !== 'local' || !image.src) {
        images.push(image);
        continue;
      }

      const record = await getLocalImage(image.src);
      if (!record) continue;

      const filename = `images/${recipe.id}_${index}.webp`;
      zip.file(filename, record.blob);
      images.push({ ...image, src: filename });
    }

    recipes.push({ ...recipe, images });
  }

  const data: BackupData = {
    schemaVersion: SCHEMA_VERSION,
    recipes,
    lists: snapshot.lists
  };

  zip.file('data.json', JSON.stringify(data, null, 2));
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(blob, `uchirecipe-${stamp}.zip`);
  return setLastBackupAt();
}

function assertBackupData(value: unknown): asserts value is BackupData {
  if (!value || typeof value !== 'object') {
    throw new Error('data.json が見つかりません');
  }
  const data = value as Partial<BackupData>;
  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`未対応のスキーマです: ${String(data.schemaVersion)}`);
  }
  if (!Array.isArray(data.recipes) || !Array.isArray(data.lists)) {
    throw new Error('バックアップ形式が不正です');
  }
}

export async function importBackupZip(file: File): Promise<number> {
  const zip = await JSZip.loadAsync(file);
  const dataFile = zip.file('data.json');
  if (!dataFile) throw new Error('data.json が見つかりません');

  const parsed: unknown = JSON.parse(await dataFile.async('string'));
  assertBackupData(parsed);

  const recipes: Recipe[] = [];
  const imageRecords: Array<{ key: string; blob: Blob }> = [];

  for (const recipe of parsed.recipes) {
    const images: RecipeImage[] = [];

    for (const image of recipe.images) {
      if (image.type !== 'local' || !image.src) {
        images.push(image);
        continue;
      }

      const blobFile = zip.file(image.src);
      if (!blobFile) {
        throw new Error(`画像ファイルが見つかりません: ${image.src}`);
      }

      const blob = await blobFile.async('blob');
      const key = makeId(`img_${recipe.id}`);
      imageRecords.push({ key, blob });
      images.push({ ...image, src: key, broken: false });
    }

    recipes.push({ ...recipe, images });
  }

  await db.transaction('rw', db.images, async () => {
    await db.images.clear();
    await Promise.all(
      imageRecords.map((record) =>
        putLocalImage({
          key: record.key,
          blob: record.blob,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      )
    );
  });

  await replaceSnapshot({
    schemaVersion: SCHEMA_VERSION,
    recipes,
    lists: parsed.lists
  });

  return setLastBackupAt();
}
