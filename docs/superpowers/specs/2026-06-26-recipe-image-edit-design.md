# レシピ画像の編集機能拡張 設計書

日付: 2026-06-26

## 目的

レシピ詳細画面の編集モードにおいて、画像まわりの操作性を改善する。

1. 画像の並べ替え（左右の移動ボタン）
2. クリップボードからの画像貼り付け（専用ボタン、画像以外は拒否）
3. 画像の削除（現状UIが無いため新規に追加）

## 現状

- 画像は `recipe.images: RecipeImage[]`（`src/types.ts`）で順序付き配列として管理される。
- ローカル画像は `type: 'local'`、`src` が IndexedDB のキー。Blob 実体は `db.images` に保存。
- 表示は `src/components/RecipeImage.tsx`、ギャラリーは `src/screens/RecipeDetail.tsx`（横スクロール）。
- 追加は編集モードの「写真を追加」ボタン → `<input type="file" accept="image/*">` → `actions.addLocalImage(recipeId, file)`。
- `src/db.ts` に `deleteLocalImage(key)` が定義されているが**どこからも呼ばれておらず、削除UIは存在しない**。
- 並べ替え用ユーティリティ `reorderByTarget`（`src/utils/app.ts`）が既存。

## 機能仕様

### 1. 画像の並べ替え

**UI（`RecipeDetail.tsx`、編集モード時のみ）**
- 実体のある各画像（空プレースホルダーは除外）に `◀` `▶` ボタンを下部中央へ重ねて表示。
- 先頭画像は `◀` を無効化、末尾画像は `▶` を無効化。
- ギャラリーは横スクロールのまま維持。

**ロジック（`AppStore.tsx`）**
- 新規アクション `moveImage(recipeId: string, index: number, direction: 'prev' | 'next')`。
  - `recipe.images` 配列内で `index` 要素を隣（前/後）と入れ替える。
  - 端では何もしない。
  - `patchRecipe(recipeId, { images })` で永続化（既存の楽観更新＋DB保存に乗せる）。

### 2. クリップボードからの貼り付け

**UI（`RecipeDetail.tsx`、編集モード時、「写真を追加」ボタンの隣）**
- 「クリップボードから貼り付け」ボタンを追加。

**ロジック（`AppStore.tsx`）**
- 新規アクション `pasteImageFromClipboard(recipeId: string)`。
  - `navigator.clipboard.read()` で `ClipboardItem[]` を取得。
  - 各 item の `types` から `image/*` を持つ最初の項目を探す。
  - 見つかれば `item.getType(type)` で `Blob` を取得し、共通保存処理に流す。
  - 画像が無い／非画像の場合はトースト「画像が見つかりませんでした」を表示し、何も追加しない。
  - `navigator.clipboard.read` 非対応・権限拒否時はエラートーストで握る（既存 `showError` を利用）。

**共通化**
- `addLocalImage` の引数型を `File` から `Blob` に広げ、ファイル選択・クリップボード貼り付けの両方で同じ保存処理（`putLocalImage` → `images` 配列に追加 → `imageCount` 加算 → トースト）を再利用する。
  - `File` は `Blob` のサブタイプなので既存の呼び出しはそのまま動作する。

### 3. 画像の削除

**UI（`RecipeDetail.tsx`、編集モード時のみ）**
- 実体のある各画像の右上に `×` 削除ボタンを重ねて表示。

**ロジック（`AppStore.tsx`）**
- 新規アクション `removeImage(recipeId: string, index: number)`。
  - 対象画像が `type: 'local'` かつ `src` があれば `deleteLocalImage(src)` で Blob 実体も削除し、`imageCount` を 1 減算。
  - `recipe.images` から該当 index を除外して `patchRecipe(recipeId, { images })`。
  - 確認ダイアログは挟まず即削除。トースト「写真を削除しました」で通知。

## レイアウト

編集モードでは各画像に以下が重なる:
- `×`（削除）: 右上
- `◀` `▶`（並べ替え）: 下部中央

スタイルは `src/styles/app.css`（または該当 CSS）に追加。既存の `image-badge` / `add-photo` の意匠に合わせる。

## スコープ外

- 画像のドラッグ&ドロップ並べ替え（今回は左右ボタン方式を採用）。
- レシピ削除時の孤立ローカル画像のクリーンアップ（既存の課題、別対応）。

## 受け入れ条件

- 編集モードで `◀`/`▶` により画像順が入れ替わり、再読み込み後も順序が保持される。
- 端の画像でボタンが適切に無効化される。
- 「クリップボードから貼り付け」で画像をコピーした状態なら画像が追加され、画像が無い／非画像ならトースト通知のみで追加されない。
- 編集モードで `×` により画像が削除され、ローカル画像は Blob 実体も削除される。再読み込み後も削除が保持される。
- 非編集モードでは並べ替え・削除・貼り付けの各UIが表示されない。
