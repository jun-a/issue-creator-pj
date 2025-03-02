# 生成AI用プロンプト集

## 0. 実装制約条件

```prompt
以下の制約条件に従って実装を行ってください：

1. プロジェクト構造
   - 実装先: @/issue-draft-creator/ ディレクトリ
   - 既存のファイル構造を維持
   - 新規ファイルの追加は原則禁止

2. 依存関係管理
   - Poetry を使用したパッケージ管理
   - pyproject.toml での依存関係定義

3. ファイル構成方針
   - なるべく一つのファイルにまとめる
   - 機能の分割は必要最小限に
   - シンプルな構造を維持

現在の構成:
/issue-draft-creator/
├── main.py         # メインアプリケーションコード
├── pyproject.toml  # Poetry設定
└── templates/      # HTMLテンプレート
    ├── base.html
    ├── index.html
    └── preview.html
```

## 1. システム概要プロンプト

```prompt
あなたは、自然言語からGitHub Issueを生成するWebアプリケーションを開発する必要があります。

プロジェクト名: IssueDraft Assistant
目的: ユーザーの自然言語による要望を、構造化されたGitHub Issue形式に変換する

技術スタック:
- フロントエンド: HTMX + Bulma CSS
- バックエンド: FastAPI
- データ管理: ブラウザのSession Storage
- テンプレートエンジン: Jinja2

主な機能:
1. 自然言語入力
2. GitHub Issue形式への変換
3. プレビューと編集
4. 履歴管理
```

## 2. フロントエンド実装プロンプト

### 2.1 基本レイアウト

```prompt
Bulma CSSを使用して、以下の要件を満たすレスポンシブなレイアウトを実装してください：

1. ナビゲーションバー
   - プロジェクトタイトル
   - ホーム、履歴へのリンク

2. メインコンテンツエリア
   - モバイルでも使いやすいレイアウト
   - Bulmaのコンポーネントを活用

3. フッター
   - 最小限の情報表示

テンプレート構造:
- base.html（共通レイアウト）
- index.html（入力フォーム）
- preview.html（プレビュー画面）
- history.html（履歴一覧）
```

### 2.2 HTMX拡張機能

static/htmx.min.jsと同じディレクトリに、以下の単一のHTMX拡張機能を実装してください：

1. 拡張機能の定義（static/function.js内に実装）
   ```javascript
   htmx.defineExtension('issue-manager', {
     init: function(api) {
       // セッションストレージの初期化
       if (!sessionStorage.getItem('issues')) {
         sessionStorage.setItem('issues', '[]');
       }
     },

     onEvent: function(name, evt) {
       // イベントハンドリングをここに集約
       if (name === "htmx:afterRequest") {
         // リクエスト後の処理
       } else if (name === "htmx:beforeRequest") {
         // リクエスト前の処理
       }
     }
   });
   ```

2. 機能要件
   - すべてのデータ管理ロジックを拡張機能内に集約
   - グローバルスコープを汚染しない
   - エラー状態の統一管理

3. データ構造
   ```javascript
   // セッションストレージのデータ形式
   {
     "issues": [{
       "id": "uuid-v4",
       "title": "string",
       "story": "string",
       "criteria": "string",
       "requirements": "string",
       "created_at": "ISO string"
     }]
   }
   ```

注意：新しいJavaScriptファイルは作成せず、必要最小限の実装に留めてください。

## 3. バックエンド実装プロンプト

### 3.0 Poetry設定

```prompt
以下の要件でpoetry環境を設定してください：

1. 必須パッケージ
   - fastapi
   - uvicorn
   - jinja2
   - python-multipart
   - aiohttp

2. 設定ファイル（pyproject.toml）
   - Python バージョン: 3.11以上
   - 開発用依存関係の分離
   - プロジェクトメタデータの設定

3. 環境設定
   - 仮想環境の作成
   - 依存関係のインストール
   - 開発用スクリプトの定義
```

### 3.1 FastAPI エンドポイント

```prompt
以下のエンドポイントをmain.pyに実装してください。全ての実装は単一のファイルにまとめ、不要なモジュール分割は避けてください：

1. アプリケーション構造（main.py）
   ```python
   # 必要最小限のインポート
   from fastapi import FastAPI, Request
   from fastapi.templating import Jinja2Templates
   from fastapi.staticfiles import StaticFiles
   
   app = FastAPI()
   templates = Jinja2Templates(directory="templates")
   ```

2. 必要なエンドポイント
   - GET / : メインページ
   - POST /api/requests : 自然言語→Issue変換
   - GET /preview/{issue_id} : プレビュー表示
   - GET /history : 履歴一覧

3. 実装要件
   - すべてのロジックをmain.py内に記述
   - モデルやルーティングの分割を避ける
   - HTMX互換のレスポンス形式を維持
   - エラーハンドリングを各エンドポイントに組み込む

4. コード構造
   - ユーティリティ関数は各エンドポイントの直前に配置
   - 型定義はファイル上部にまとめる
   - テンプレート関連の処理は対応するエンドポイント内に記述
```

### 3.2 テンプレートエンジン

```prompt
Jinja2テンプレートを以下の要件で実装してください：

1. レイアウト構成
   - 共通テンプレート（base.html）
   - 各ページテンプレート

2. HTMX統合
   - 部分更新用のフラグメント
   - エラー表示領域
```

## 4. AI変換機能プロンプト

```prompt
自然言語をGitHub Issue形式に変換する機能を実装してください：

入力: ユーザーの自然言語による要望
出力: 以下の構造化されたデータ
- タイトル
- ユーザーストーリー
- 受け入れ基準
- 技術要件

考慮事項:
1. 入力の文脈理解
2. 構造化された出力の一貫性
3. エラー処理とフォールバック
```

## 5. テスト要件プロンプト

```prompt
以下のテストを実装してください：

1. フロントエンドテスト
   - HTMX拡張機能のユニットテスト
   - セッションストレージの操作テスト

2. バックエンドテスト
   - APIエンドポイントのテスト
   - テンプレートレンダリングテスト

3. 統合テスト
   - エンドツーエンドのフロー確認
   - エラーケースの検証
```

## 6. エラーハンドリングプロンプト

```prompt
以下のエラーシナリオに対する処理を実装してください：

1. フロントエンド
   - セッションストレージエラー
   - ネットワークエラー
   - データ検証エラー

2. バックエンド
   - バリデーションエラー
   - AI処理エラー
   - サーバーエラー

各エラーに対して:
- ユーザーフレンドリーなメッセージ
- リカバリー手順
- ログ記録
```

## プロンプト使用ガイドライン

1. プロンプトの使用順序
   - システム概要の理解
   - フロントエンド実装
   - バックエンド実装
   - AI変換機能の実装
   - テストとエラーハンドリング

2. 各実装ステップでの注意点
   - コードの一貫性確保
   - エラー処理の徹底
   - パフォーマンスとセキュリティの考慮

3. 成果物の検証
   - 要件との整合性確認
   - コードレビューポイント
   - テスト網羅性の確認