# テンプレート構造とJavaScript統合計画

## テンプレート構造分析

### 1. ベーステンプレート
- base.html: 基本レイアウト
  * エラー通知コンポーネント
  * 基本的なページ構造
  * 共通スクリプト/スタイル参照

- layout.html: 主要レイアウト
  * ナビゲーション
  * フッター
  * app.js参照

### 2. メインページ
- index.html
  * Issue作成フォーム
  * 最近の履歴表示
  * htmxフォーム処理
  * Issue保存処理

- history.html
  * Issue一覧表示
  * ソート機能
  * プレビューリンク

- preview.html
  * タブ切り替え
  * Markdownプレビュー
  * コピー機能
  * GitHubリンク

- settings.html
  * リポジトリ管理フォーム
  * リポジトリ一覧
  * CRUD操作

### 3. 部分テンプレート (Partials)
- error_message.html
  * エラー通知表示
  * 削除機能

- issue_preview.html
  * Issue表示
  * タブ制御
  * Markdownコピー
  * ローディング表示

- repo_list.html
  * リポジトリ一覧
  * HTMX削除処理

## 共通のインタラクションパターン

### 1. フォーム処理
- htmxによるフォーム送信
- ローディング表示
- 結果の動的表示
- エラーハンドリング

### 2. データ管理
- ローカルストレージの利用
- Issue保存
- リポジトリ管理
- 履歴管理

### 3. UI操作
- タブ切り替え
- ドロップダウン
- 通知表示
- コピー機能

## app.jsへの統合設計

### 1. 共通コンポーネント管理
```javascript
class ComponentManager {
    // エラーメッセージ
    initializeErrorMessages() {
        // error_message.htmlの機能を統合
    }

    // Issueプレビュー
    initializeIssuePreviews() {
        // issue_preview.htmlの機能を統合
    }

    // リポジトリリスト
    initializeRepoLists() {
        // repo_list.htmlの機能を統合
    }
}
```

### 2. ページ固有の機能
```javascript
class PageManager {
    // indexページ
    initializeIndexPage() {
        // Issue作成フォーム
        // 履歴表示
    }

    // historyページ
    initializeHistoryPage() {
        // 全履歴表示
        // ソート機能
    }

    // previewページ
    initializePreviewPage() {
        // タブ管理
        // Markdownコピー
    }

    // settingsページ
    initializeSettingsPage() {
        // リポジトリフォーム
        // リポジトリ管理
    }
}
```

### 3. イベント管理の統合
```javascript
class EventManager {
    constructor() {
        this.initializeGlobalEvents()
        this.initializeHTMXEvents()
    }

    // グローバルイベント
    initializeGlobalEvents() {
        // 通知クリック
        // ドロップダウン
        // タブクリック
    }

    // HTMXイベント
    initializeHTMXEvents() {
        // beforeRequest
        // afterRequest
        // afterSwap
    }
}
```

## 実装手順の更新

1. コンポーネントの移行
   - Partialsの機能をComponentManagerに統合
   - インラインスクリプトを除去
   - data属性による制御に変更

2. ページ機能の統合
   - 各ページのスクリプトをPageManagerに移行
   - イベントハンドラの集約
   - 共通機能の抽出

3. イベント管理の統一
   - グローバルイベントの集約
   - HTMXイベントの統一
   - エラーハンドリングの標準化

4. テンプレートの更新
   - インラインスクリプトの削除
   - データ属性の追加
   - クラス名の統一

5. 検証プロセス
   - コンポーネント単位のテスト
   - ページ機能の検証
   - クロスページの整合性確認
   - パフォーマンス計測

## 期待される改善点

1. メンテナンス性
   - 機能の集中管理
   - 重複コードの排除
   - 命名規則の統一

2. 再利用性
   - コンポーネント化
   - 共通機能の抽出
   - イベント処理の標準化

3. パフォーマンス
   - コード重複の削減
   - イベントリスナーの最適化
   - リソース読み込みの効率化

4. 開発効率
   - 機能の見通し向上
   - デバッグの容易化
   - 拡張性の向上

次のステップ：Codeモードに切り替えて実装を開始する
