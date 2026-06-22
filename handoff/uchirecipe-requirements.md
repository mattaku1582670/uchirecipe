# レシピデータベース PWA 要件定義書

## 1. 概要

自分専用のレシピ管理アプリ。レシピを登録・検索し、任意のレシピを集めたリストを作成できる。ネイティブアプリではなくPWAとして実装し、オフライン動作・無料運用・端末へのインストールを実現する。

- **想定ユーザー**: 本人のみ（シングルユーザー）
- **目的**: レシピの記録・再利用、献立組み、マンネリ防止
- **方針**: 入力の心理的ハードルを下げ、記録が継続して貯まることを最優先する

## 2. 技術スタック

| 項目 | 採用技術 | 備考 |
|------|---------|------|
| フレームワーク | Vue 3 | 慣れたスタック |
| データ保持 | IndexedDB（Dexie.js） | 画像Blobを保存できる・容量が大きい |
| 状態管理 | Pinia または composable | 規模に応じて選択 |
| PWA化 | vite-plugin-pwa | Service Worker・manifest自動生成 |
| バックアップ | JSZip | 画像込みのZIPエクスポート |
| ホスティング | GitHub Pages | 無料・PWAインストール対応 |

localStorageは画像をBase64で持つと5MB上限にすぐ達するため不採用。IndexedDBでBlob保存する。

## 3. データモデル

### 3.1 Recipe（レシピ）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string (uuid) | ○ | 一意ID |
| name | string | ○ | レシピ名 |
| url | string | - | 参照URL |
| tags | string[] | - | タグ（複数） |
| note | string | - | 自由入力欄。Markdown想定。材料・手順もここに集約 |
| images | ImageRef[] | - | 画像（複数可）。noteとは独立保持。URL参照とBlobのハイブリッド |
| rating | number (0-5) | - | 評価（星の数） |
| lastCookedAt | number | - | 最終作成日（タイムスタンプ） |
| createdAt | number | ○ | 登録日時 |
| updatedAt | number | ○ | 更新日時 |

**設計判断**:
- 材料は構造化せず `note` に集約する。入力簡便さを優先。材料検索はキーワード全文検索で代替する。
- `note` はMarkdownレンダリング対応。入力は素のtextareaで手軽なまま、表示時に見出し・箇条書きで整理できる。
- 画像は `note` に埋め込まず独立フィールドで持つ。サムネイル表示・一覧カードのアイキャッチ・ZIPバックアップを素直にするため。
- 画像はURL参照とBlobのハイブリッドで保持する（後述 ImageRef）。容量を最小化するため、共有取得した画像はURL文字列で保存し、自分で撮った/取り込んだ写真のみBlobで保存する。
- 作った日の全履歴（cookHistory）は当面持たない。`lastCookedAt` のみで運用し、必要になったら追加する。

### 3.1.1 ImageRef（画像参照）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| kind | 'url' \| 'blob' | 参照方式 |
| url | string | kind='url' のとき。元サイト等の画像URL |
| blob | Blob | kind='blob' のとき。端末内に保持する画像実体 |

**容量・トレードオフ**:
- URL参照は文字列のみで容量最小（数十〜数百バイト）。ただし元画像の削除・変更でリンク切れになり、オフライン表示不可。
- Blobは容量が大きい（数百KB〜数MB）が、確実に表示でき、オフライン対応。
- 方針: 共有/OGPで取得した画像はURL参照、ユーザーが撮影・選択した写真はBlob。これにより容量増は自前写真のみに限定される。

### 3.2 List（リスト）

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | ○ | 一意ID |
| name | string | ○ | リスト名 |
| type | 'manual' \| 'smart' | ○ | リスト種別 |
| order | number | ○ | 並び順 |
| recipeIds | string[] | - | manual時のみ使用。手動で入れたレシピ |
| filter | SmartFilter | - | smart時のみ使用。抽出条件 |

manualとsmartは同じテーブルに同居させ、`type` で分岐する。UI上は同じ「リスト一覧」に並ぶ。

### 3.3 SmartFilter（スマートリスト抽出条件）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| tags | string[] | 対象タグ |
| tagsMatch | 'all' \| 'any' | すべて含む / いずれか含む |
| ratingMin | number | 最低評価（この値以上） |
| cookedBefore | number | この日時より前に作った（=しばらく作ってない抽出） |
| cookedAfter | number | この日時より後に作った |
| keyword | string | name / note の部分一致 |

- 空欄の条件は無視し、指定された条件のみAND結合する。
- 全条件が空の場合は全件表示となる（「全レシピ」リストとして利用可、許容する挙動）。

### 3.4 スキーマバージョン

- バックアップの `data.json` に `schemaVersion` を持たせる。
- 将来フィールドを追加した際、古いバックアップを読み込んでマイグレーションできるようにする。

## 4. ストレージ設計（Dexie）

```js
db.version(1).stores({
  recipes: 'id, name, rating, lastCookedAt, updatedAt, *tags',
  lists:   'id, order, type'
})
```

- `*tags` はマルチエントリインデックス。スマートリストのタグ抽出を高速化する。
- 画像Blobは recipes テーブル内に直接保持。別テーブル分離は規模的に不要。

## 5. 機能要件

### 5.1 基本データベース機能
- レシピの新規登録・編集・削除
- 全フィールドの入力（name必須、他は任意）
- 画像の追加・削除（複数可）
- 「作った」操作 → `lastCookedAt` を現在日時で更新

### 5.2 一覧・検索・ソート
- 全レシピのグリッド/リスト表示
- キーワード検索（name / note 部分一致）
- タグによる絞り込み
- ソート軸切替: 最終作成日が古い順 / 評価が高い順 / 最近追加順

### 5.3 リスト機能（手動 + スマート 両対応）

**スマートリスト（細かく選ぶ方式）**
- 条件を組み立てるフィルタUIを提供
  - タグ: チップ複数選択 ＋ all/any 切替
  - 評価: 最低星数の指定
  - 最終作成日: 「○日以上作ってない」「○日以内に作った」
  - キーワード: name / note 部分一致
- 条件を保存し、表示時に毎回クエリ実行（レシピ編集が自動反映される）

**手動リスト（両方の追加導線）**
- レシピ起点: レシピ詳細の「リストに追加」ボタン → 手動リスト一覧をモーダル表示 → チェックで複数リストに追加/解除
- リスト起点: リスト詳細の「レシピを追加」ボタン → 全レシピ一覧から検索・選択
- 内部処理はどちらも `List.recipeIds` の追加/削除で共通
- リスト詳細でカードをドラッグして並べ替え可能

### 5.4 タグ補助
- 既存タグからのサジェスト（datalist程度）で表記ゆれを抑制

### 5.5 共有受け取り・レシピ情報の取り込み（iOS前提）

iOS（Safari）は Web Share Target API 非対応のため、標準の共有シート連携は使えない。以下の2方式で代替する。

**方式1: iOSショートカット経由**
- ユーザーが「ショートカット」アプリに、共有シートから起動するショートカットを自作・登録する（本人の端末に一度入れるだけ）。
- ショートカットがレシピサイトのURLを受け取り、`https://<アプリ>/share?url=...&title=...&image=...` の形でアプリを開く。
- アプリは `/share` ルートでクエリを読み取り、新規レシピ登録画面に値をプリフィルする。
- ショートカット側で「Webページの内容を取得」アクションを使えば、ブラウザのCORS制約を受けずにメタ情報を取得できる。
  - **OGP取得**: `og:title` → `name`、`og:image` → 画像URL（ImageRef.kind='url' で保存）、`og:description` → `note` の初期値。これによりタイトル＋サムネ画像の自動取り込みが実用になる。

**方式2: クリップボード貼り付け欄**
- レシピ画面に「URLを貼り付けて登録」欄を用意。
- ペーストされたURLを `url` に格納。タイトル・画像はショートカット未使用時の手動補完、または取得できる範囲で補完。
- どのOS・状況でも確実に動作するフォールバック。

**材料・手順の自動取得（初期スコープ外・任意拡張）**
- JSON-LD の Recipe スキーマを持つサイトに限り、ショートカット側でパースして材料・手順を `note` にMarkdownで流し込むことが理論上可能。
- ただしサイト依存で確実性・保守性が低いため、初期実装には含めない。運用後に必要性を感じた場合の拡張とする。
- PWA本体からの外部サイト直接fetchはCORSにより不可。取得処理は必ずショートカット側で行う。

### 5.6 バックアップ・復元

**エクスポート（ZIP方式）**
```
backup.zip
├── data.json        // recipes + lists + schemaVersion
└── images/
    ├── {recipeId}_0.webp   // Blob画像のみ実体を格納
    └── ...
```
- ImageRef が kind='blob' のものだけ実体をZIP内 images/ に格納し、data.json側はファイル名参照に差し替える。
- ImageRef が kind='url' のものはURL文字列のまま data.json に残す（実体は持たない）。
- これにより容量最小の方針がバックアップにも一貫する。

**インポート**
- 上記ZIPを読み込み、Blob画像を復元してIndexedDBに書き戻す。URL参照画像はそのまま復元。
- `schemaVersion` を確認し、必要ならマイグレーションを実行する。

**バックアップ促進**
- 起動時に最終バックアップから一定期間（例: 7日）経過していたら、バックアップを促す

## 6. 抽出ロジック（参考実装）

```js
async function resolveSmartList(filter) {
  let coll = db.recipes.toCollection()
  if (filter.ratingMin) coll = coll.filter(r => r.rating >= filter.ratingMin)
  if (filter.tags?.length) {
    coll = coll.filter(r =>
      filter.tagsMatch === 'all'
        ? filter.tags.every(t => r.tags.includes(t))
        : filter.tags.some(t => r.tags.includes(t))
    )
  }
  if (filter.cookedBefore)
    coll = coll.filter(r => !r.lastCookedAt || r.lastCookedAt < filter.cookedBefore)
  if (filter.cookedAfter)
    coll = coll.filter(r => r.lastCookedAt && r.lastCookedAt > filter.cookedAfter)
  if (filter.keyword) {
    const k = filter.keyword.toLowerCase()
    coll = coll.filter(r =>
      r.name.toLowerCase().includes(k) ||
      (r.note ?? '').toLowerCase().includes(k))
  }
  return coll.toArray()
}
```

## 7. 画面構成

| 画面 | 内容 |
|------|------|
| データベース画面 | 全レシピのグリッド/リスト表示、検索・タグ絞り込み・ソート、新規追加 |
| レシピ詳細・編集 | 全フィールド編集、画像追加（撮影/選択=Blob、取得=URL）、「作った」ボタン、「リストに追加」、URL貼り付け取り込み欄 |
| 共有受け取り（/share） | ショートカットからのクエリを受け、新規登録画面に name/url/画像URL/note をプリフィル |
| リスト一覧画面 | manual/smart のリストを並べる、新規リスト作成 |
| リスト詳細画面 | manual: 並べ替え可能なカード／smart: 抽出結果表示 |
| 設定画面 | エクスポート/インポート、バックアップ状態表示 |

## 8. 非機能要件
- オフライン動作（Service Workerによるキャッシュ）
- 端末へのインストール（manifest）
- 完全無料・外部サーバー不要・データはすべて端末ローカル
- 日本語UI

## 9. 段階的実装の指針
1. データモデル + Dexieセットアップ + schemaVersion
2. レシピCRUD + 一覧・検索・ソート
3. バックアップ（エクスポート/インポート）※データ消失リスクへの最優先対策
4. 手動リスト（両導線）
5. スマートリスト（フィルタUI）
6. PWA化（Service Worker・manifest・インストール）
7. 共有受け取り（/share ルート + クリップボード貼り付け欄）、OGP取得用ショートカットの整備
8. タグサジェスト・バックアップ促進などの仕上げ
