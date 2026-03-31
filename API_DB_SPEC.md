# API・データベース仕様書

パスワード管理APIの詳細仕様書です。他のAIシステムや開発者がAPIおよびDBの構造を正確に理解できるように記述しています。

---

## 目次

1. [データベース仕様](#データベース仕様)
2. [API 共通仕様](#api-共通仕様)
3. [エンドポイント詳細仕様](#エンドポイント詳細仕様)
4. [ビジネスロジック仕様](#ビジネスロジック仕様)
5. [エラーコード一覧](#エラーコード一覧)
6. [データ型定義](#データ型定義)
7. [アーキテクチャにおける層の責務](#アーキテクチャにおける層の責務)

---

## データベース仕様

### 接続情報

| 項目 | 値 |
|---|---|
| DBMS | PostgreSQL 14以上 |
| ホスト | `.env` の `DB_SERVER` で設定（デフォルト: `localhost`） |
| ポート | `.env` の `DB_PORT` で設定（デフォルト: `5432`） |
| データベース名 | `.env` の `DB_DATABASE` で設定（デフォルト: `tamtdb`） |
| ユーザ名 | `.env` の `DB_USERNAME` で設定（デフォルト: `tamtuser`） |
| パスワード | `.env` の `DB_PASSWORD` で設定（デフォルト: `TAMTTAMT`） |

### スキーマ

スキーマ名: `psinfo`

### テーブル: `psinfo.master`

パスワード情報を格納するメインテーブル。

#### カラム定義

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | `SERIAL` (INTEGER) | NOT NULL | 自動採番 | DBの内部管理キー（APIには公開しない） |
| `title` | `TEXT` | NOT NULL | - | タイトル（業務上の識別キー）|
| `userword` | `TEXT` | NOT NULL | - | ユーザ名 |
| `psword` | `TEXT` | NOT NULL | - | パスワード（複数行テキスト可） |
| `site` | `TEXT` | NULL可 | NULL | 関連サイトのURL |
| `memo` | `TEXT` | NULL可 | NULL | 備考・メモ |
| `deleted_count` | `INTEGER` | NOT NULL | `0` | 論理削除管理カラム（インフラ層の内部実装）|

> **重要**: `id` と `deleted_count` はインフラ層の内部管理カラムです。ドメイン層・ユースケース層・APIレスポンスには一切公開されません。業務上の識別は `title` で行います。

#### 制約

| 制約名 | 種別 | 対象カラム | 説明 |
|---|---|---|---|
| `master_pkey` | PRIMARY KEY | `id` | 主キー制約 |
| `uq_master_title` | UNIQUE | `(title, deleted_count)` | タイトルと削除管理値の複合ユニーク制約 |

#### DDL

```sql
CREATE SCHEMA psinfo;

CREATE TABLE psinfo.master (
    id            SERIAL  PRIMARY KEY,
    title         TEXT    NOT NULL,
    userword      TEXT    NOT NULL,
    psword        TEXT    NOT NULL,
    site          TEXT,
    memo          TEXT,
    deleted_count INT     NOT NULL DEFAULT 0
);

ALTER TABLE psinfo.master
    ADD CONSTRAINT uq_master_title UNIQUE (title, deleted_count);
```

#### `deleted_count` の仕様（インフラ層の内部実装詳細）

> このカラムはインフラストラクチャ層の実装詳細です。ドメイン層・ユースケース層・APIレスポンスには一切公開されません。

- **`0`**: 有効なレコード（未削除）
- **`1` 以上**: 論理削除済みのレコード
- 削除時に使用する値は「同一タイトルで削除済みのレコードが持つ値と重複しない、1以上の最小整数」

---

## API 共通仕様

### ベースURL

```
http://{ホスト}:{ポート}/api/v1
```

デフォルト: `http://localhost:8000/api/v1`

### 識別キーについて

- **業務上の識別キーは `title`** です。パスパラメータ・レスポンスともに `title` でエントリを識別します
- `id`（DB の主キー）はフロントエンドに渡さず、フロントエンドからも受け取りません
- タイトルにスペースや記号が含まれる場合は URL エンコードが必要です（例: `"My Entry"` → `"My%20Entry"`）
- タイトルに `/` を含めることはできません（URLパスと衝突するため）

### リクエスト共通仕様

| 項目 | 値 |
|---|---|
| コンテンツタイプ | `application/json` |
| 文字コード | UTF-8 |
| 認証 | なし（本バージョン） |

### 共通レスポンスフィールド（正常系）

`PasswordResponse` オブジェクト:

| フィールド名 | 型 | NULL可 | 説明 |
|---|---|---|---|
| `title` | `string` | NO | タイトル（業務上の識別キー） |
| `userword` | `string` | NO | ユーザ名 |
| `psword` | `string` | NO | パスワード |
| `site` | `string` | YES | サイトURL |
| `memo` | `string` | YES | メモ |

### 共通エラーレスポンス

```json
{
  "detail": "エラーメッセージ（日本語）"
}
```

---

## エンドポイント詳細仕様

### 1. パスワードエントリ登録

#### リクエスト

| 項目 | 値 |
|---|---|
| メソッド | `POST` |
| パス | `/api/v1/passwords` |
| Content-Type | `application/json` |

**リクエストボディ**

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | `string` | YES | タイトル（有効なエントリ内で一意。空文字不可） |
| `userword` | `string` | YES | ユーザ名（空白のみ不可） |
| `psword` | `string` | YES | パスワード（改行を含む複数行テキスト可） |
| `site` | `string` | NO | サイトのURL |
| `memo` | `string` | NO | メモ |

**リクエスト例**

```json
{
  "title": "Googleアカウント",
  "userword": "user@example.com",
  "psword": "MyP@ssword123",
  "site": "https://accounts.google.com",
  "memo": "メインアカウント"
}
```

#### レスポンス

| ステータスコード | 説明 |
|---|---|
| `201 Created` | 登録成功 |
| `409 Conflict` | 同一タイトルが有効なエントリに既に存在する |
| `422 Unprocessable Entity` | バリデーションエラー（空文字など） |

**成功レスポンス例 (201)**

```json
{
  "title": "Googleアカウント",
  "userword": "user@example.com",
  "psword": "MyP@ssword123",
  "site": "https://accounts.google.com",
  "memo": "メインアカウント"
}
```

---

### 2. パスワードエントリ更新

#### リクエスト

| 項目 | 値 |
|---|---|
| メソッド | `PUT` |
| パス | `/api/v1/passwords/{title}` |
| Content-Type | `application/json` |

**パスパラメータ**

| パラメータ名 | 型 | 説明 |
|---|---|---|
| `title` | `string` | 更新対象の現在のタイトル（URLエンコード必要） |

**リクエストボディ**

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | `string` | YES | 更新後のタイトル（変更しない場合は現在のタイトルと同値） |
| `userword` | `string` | YES | ユーザ名 |
| `psword` | `string` | YES | パスワード |
| `site` | `string` | NO | サイトのURL |
| `memo` | `string` | NO | メモ |

**リクエスト例**（パス: `/api/v1/passwords/Google%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88`）

```json
{
  "title": "Googleアカウント",
  "userword": "user@example.com",
  "psword": "UpdatedP@ss999",
  "site": "https://accounts.google.com",
  "memo": "パスワードを変更しました"
}
```

#### レスポンス

| ステータスコード | 説明 |
|---|---|
| `200 OK` | 更新成功 |
| `404 Not Found` | 指定タイトルの有効なエントリが存在しない |
| `409 Conflict` | 更新後のタイトルが他の有効なエントリと重複する |
| `422 Unprocessable Entity` | バリデーションエラー |

---

### 3. パスワードエントリ削除

#### リクエスト

| 項目 | 値 |
|---|---|
| メソッド | `DELETE` |
| パス | `/api/v1/passwords/{title}` |
| リクエストボディ | なし |

**パスパラメータ**

| パラメータ名 | 型 | 説明 |
|---|---|---|
| `title` | `string` | 削除対象のタイトル（URLエンコード必要） |

#### レスポンス

| ステータスコード | 説明 |
|---|---|
| `200 OK` | 削除成功（削除されたエントリの内容を返す） |
| `404 Not Found` | 指定タイトルの有効なエントリが存在しない |

**成功レスポンス例 (200)**

```json
{
  "title": "Googleアカウント",
  "userword": "user@example.com",
  "psword": "MyP@ssword123",
  "site": "https://accounts.google.com",
  "memo": "メインアカウント"
}
```

---

### 4. パスワードエントリ一覧取得・検索

#### リクエスト

| 項目 | 値 |
|---|---|
| メソッド | `GET` |
| パス | `/api/v1/passwords` |

**クエリパラメータ**

| パラメータ名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `keyword` | `string` | NO | 検索キーワード（部分一致・大文字小文字を区別しない） |

検索対象フィールド: `title`, `userword`, `site`, `memo`

```
GET /api/v1/passwords                    # 全件取得
GET /api/v1/passwords?keyword=Google     # キーワード検索
```

#### レスポンス

| ステータスコード | 説明 |
|---|---|
| `200 OK` | 取得成功（0件でも200を返す） |

**レスポンス例 (200)**

```json
{
  "total": 2,
  "items": [
    {
      "title": "Googleアカウント",
      "userword": "user@example.com",
      "psword": "MyP@ssword123",
      "site": "https://accounts.google.com",
      "memo": "メインアカウント"
    },
    {
      "title": "GitHubアカウント",
      "userword": "myusername",
      "psword": "GitP@ss456",
      "site": "https://github.com",
      "memo": null
    }
  ]
}
```

---

### 5. パスワードエントリ単件取得

#### リクエスト

| 項目 | 値 |
|---|---|
| メソッド | `GET` |
| パス | `/api/v1/passwords/{title}` |

**パスパラメータ**

| パラメータ名 | 型 | 説明 |
|---|---|---|
| `title` | `string` | 取得対象のタイトル（URLエンコード必要） |

#### レスポンス

| ステータスコード | 説明 |
|---|---|
| `200 OK` | 取得成功 |
| `404 Not Found` | 指定タイトルの有効なエントリが存在しない |

---

## ビジネスロジック仕様

### タイトルの一意性（ドメイン層で管理）

タイトルの重複チェックはドメインサービス（`PasswordEntryService`）が担います。

- **登録時**: 有効なエントリ内にタイトルが存在する場合は `409 Conflict`
- **更新時**: 自エントリを除いた有効なエントリ内にタイトルが存在する場合は `409 Conflict`
- 削除済みのエントリは一意性チェックの対象外

### フィールドバリデーション（ドメインエンティティで管理）

`PasswordEntry` エンティティの生成時に以下を検証します。

| フィールド | ルール |
|---|---|
| `title` | 必須、空文字・空白のみ不可 |
| `userword` | 必須、空文字・空白のみ不可 |
| `psword` | 必須、空文字不可（スペースのみは許容） |

### 削除の仕組み（インフラ層の実装詳細）

ドメイン・ユースケース層は「削除する」という業務操作のみを知り、どのように削除するかは関知しません。インフラストラクチャ層が DB 制約を踏まえた実装を行います。

**インフラ層での実装（論理削除）:**

1. title で削除対象レコードを特定する
2. 同一 title を持つ削除済みレコードの `deleted_count` 値をすべて取得する
3. 重複しない `1` 以上の最小整数を算出し `deleted_count` に設定する

---

## エラーコード一覧

| HTTPステータス | 発生条件 | レスポンス例 |
|---|---|---|
| `201 Created` | 登録成功 | - |
| `200 OK` | 更新・削除・取得成功 | - |
| `404 Not Found` | 指定タイトルの有効なエントリが存在しない | `{"detail": "タイトル 'xxx' のエントリが見つかりません"}` |
| `409 Conflict` | タイトルが既存の有効なエントリと重複する | `{"detail": "タイトル 'xxx' は既に登録されています"}` |
| `422 Unprocessable Entity` | フィールドバリデーションエラー（空文字など） | `{"detail": "タイトルは必須です"}` |
| `500 Internal Server Error` | サーバ内部エラー（DB接続失敗など） | FastAPI標準エラーフォーマット |

---

## データ型定義

### PasswordCreateRequest

```json
{
  "title":    "string (必須, 空文字・空白のみ不可)",
  "userword": "string (必須, 空文字・空白のみ不可)",
  "psword":   "string (必須, 空文字不可, 改行を含む複数行可)",
  "site":     "string | null (任意)",
  "memo":     "string | null (任意)"
}
```

### PasswordUpdateRequest

```json
{
  "title":    "string (必須, 更新後のタイトル)",
  "userword": "string (必須)",
  "psword":   "string (必須)",
  "site":     "string | null (任意)",
  "memo":     "string | null (任意)"
}
```

### PasswordResponse

```json
{
  "title":    "string",
  "userword": "string",
  "psword":   "string",
  "site":     "string | null",
  "memo":     "string | null"
}
```

### PasswordListResponse

```json
{
  "total": "integer",
  "items": "PasswordResponse[]"
}
```

### ErrorResponse

```json
{
  "detail": "string (エラーメッセージ)"
}
```

---

## アーキテクチャにおける層の責務

| 層 | 責務 | id の知識 | deleted_count の知識 |
|---|---|---|---|
| **ドメイン層** | 業務上管理する情報・業務ルール（バリデーション・一意性）| **知らない** | **知らない** |
| **ユースケース層** | 業務操作の手順（インフラ取得 → ドメイン処理 → インフラ永続化） | **知らない** | **知らない** |
| **インフラストラクチャ層** | DB操作の具体的な実装（論理削除の仕組みを含む） | **知っている** | **知っている** |
| **コントローラ層** | HTTPリクエスト/レスポンスの変換 | **知らない（APIに出さない）** | **知らない（APIに出さない）** |

### ユースケース層の処理フロー

```
登録:
  ① ドメインエンティティ生成（バリデーション自動実行）
  ② ドメインサービスで業務ルール検証（タイトル一意性）
  ③ インフラ層に永続化を依頼

更新:
  ① インフラ層から現在のエントリを取得（ドメインエンティティとして受け取る）
  ② ドメインエンティティの apply_update() で更新後エンティティを生成
  ③ ドメインサービスで業務ルール検証（タイトル一意性）
  ④ インフラ層に更新の永続化を依頼

削除:
  ① インフラ層から現在のエントリを取得（存在確認）
  ② ドメイン層で削除可否確認（将来の業務制約に備えた拡張ポイント）
  ③ インフラ層に削除を依頼

取得・検索:
  ① インフラ層からドメインエンティティ一覧を取得して返す
```
