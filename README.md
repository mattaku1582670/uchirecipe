# うちレシピ

自分専用のレシピ管理 PWA。レシピを登録・検索し、任意のレシピを集めたリストを作成できます。ネイティブアプリではなく PWA として動作し、オフライン利用・端末へのインストール・完全無料運用に対応します。データはすべて端末内（IndexedDB）に保存され、外部サーバーは不要です。

- **想定ユーザー**: 本人のみ（シングルユーザー）
- **目的**: レシピの記録・再利用、献立組み、マンネリ防止
- **方針**: 入力の心理的ハードルを下げ、記録が継続して貯まることを最優先

## 主な機能

- **レシピ管理**: 登録・編集・削除、星評価、タグ、参考URL、Markdown 本文（材料・手順）、画像（複数）
- **「作った」記録**: ワンタップで最終作成日を更新
- **一覧・検索・並び替え**: キーワード検索（名前・本文）、タグ絞り込み、ソート（古い順／高評価順／最近追加順）
- **リスト**
  - 手動リスト: 好きなレシピを集め、ドラッグ（タッチ対応）で並べ替え
  - スマートリスト: タグ・最低評価・最終作成日・キーワードの条件で自動抽出
- **取り込み**: URL を貼り付けて下書き作成。iOS ショートカット連携（`/share`）で OGP 等の自動入力に対応
- **バックアップ**: 画像込みの ZIP でエクスポート／インポート（`schemaVersion` 付き）
- **PWA**: オフライン動作（Service Worker）・ホーム画面へのインストール

## 技術スタック

| 項目 | 採用技術 |
|------|---------|
| フレームワーク | React 18 + TypeScript |
| ビルド | Vite |
| 永続化 | Dexie.js（IndexedDB） |
| バックアップ | JSZip（ZIP 形式） |
| PWA | vite-plugin-pwa |
| フォント | Shippori Mincho（見出し）／ Zen Kaku Gothic New（本文） |

## セットアップ

```bash
npm install      # 依存関係のインストール
npm run dev      # 開発サーバー起動（http://localhost:5173/）
npm run build    # 本番ビルド（dist/ に出力、Service Worker 生成）
npm run preview  # ビルド結果のプレビュー
npm run typecheck
```

> Windows の PowerShell で `npm` が実行ポリシーで止まる場合は `npm.cmd run <script>` を使ってください。

## ディレクトリ構成

```
src/
├── types.ts            # データモデル（Recipe / List / SmartCondition など）
├── db.ts               # Dexie 永続化レイヤ + CRUD + スナップショット
├── seed.ts             # 初期データ
├── logic/recipes.ts    # 純粋ロジック（evalSmart / mdToHtml / 日付整形 など）
├── store/AppStore.tsx  # アプリ状態（Context + useReducer）
├── screens/            # 各画面（Home / RecipeDetail / Lists / ListDetail / SmartEdit / Settings / Import）
├── components/         # 共通UI（BottomNav / 各種シート / RecipeCard / Toast など）
├── import/             # URL 取り込み（モック + /share クエリ解釈）
├── backup/             # ZIP エクスポート／インポート
└── styles/             # デザイントークン・スタイル
```

## データの保存と取り込みについて

- すべてのデータは端末内の IndexedDB に保存されます。共有や同期は行いません。
- 自前で撮影・選択した画像は Blob として、取り込み画像は URL 参照として保持します（容量最小化のため）。
- アプリ本体から外部サイトを直接取得することは CORS のため行いません。レシピサイトの自動取り込みは **iOS ショートカット**側で OGP/JSON-LD を取得し、`/share?url=&title=&image=&desc=` でアプリを開く方式に対応しています。

## バックアップ

設定画面から ZIP でエクスポート／インポートできます。

```
backup.zip
├── data.json            # recipes + lists + schemaVersion
└── images/              # type:'local'（自前写真）の Blob のみ
```

URL 参照画像は `data.json` 内に URL 文字列として残ります。インポート時は `schemaVersion` を確認します。

## デプロイ（GitHub Pages）

`main` ブランチへの push で GitHub Actions が自動ビルド＆デプロイします（`.github/workflows/deploy.yml`）。公開URL: `https://mattaku1582670.github.io/uchirecipe/`

**初回のみ**、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。

- `base` はビルド時の環境変数 `BASE_PATH=/uchirecipe/`（ワークフローで指定）から適用されます。ローカルの `npm run dev` / `npm run build` は `/` のままです。
- SPA ルート（`/share` など）対応として、ビルド時に `index.html` を `404.html` として複製しています。
- iOS ショートカットからは `https://mattaku1582670.github.io/uchirecipe/share?url=...&title=...&image=...&desc=...` を開きます。

## ライセンス

個人利用を目的とした非公開プロジェクトです。
