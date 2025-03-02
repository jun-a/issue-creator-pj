# システムアーキテクチャ設計書

## 1. アーキテクチャ概要

```mermaid
graph TB
    subgraph Frontend
        UI[Web UI<br/>HTMX + Bulma CSS]
        Session[(Session Storage<br/>Issue Data)]
        Templates[Templates<br/>Jinja2]
    end
    
    subgraph Backend
        API[FastAPI Server<br/>Stateless]
        AI[AI Service<br/>Natural Language → Issue]
    end
    
    UI --> |HTMX Requests| API
    API --> |Response| UI
    UI <--> Session
    API --> AI
    Templates --> UI
```

## 2. フロントエンド実装方針

### 2.1 HTMXベースの実装

- すべてのクライアントサイドロジックはHTMXの拡張機能として実装
- JavaScriptはHTMXの機能を拡張する形で統合

```html
<!-- HTMX拡張の例 -->
<div hx-ext="issue-manager">
  <form hx-post="/api/convert"
        hx-target="#preview"
        data-issue-store>
    <textarea name="content"></textarea>
    <button type="submit">Convert</button>
  </form>
</div>
```

### 2.2 HTMX拡張機能の実装

```javascript
htmx.defineExtension('issue-manager', {
    onEvent: function(name, evt) {
        if (name === "htmx:afterRequest") {
            const target = evt.target;
            if (target.hasAttribute("data-issue-store")) {
                // セッションストレージへの保存処理
                const response = JSON.parse(evt.detail.xhr.response);
                this.saveIssue(response);
            }
        }
    },

    saveIssue: function(issue) {
        const issues = JSON.parse(sessionStorage.getItem('issues') || '[]');
        issues.push({
            ...issue,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
        });
        sessionStorage.setItem('issues', JSON.stringify(issues));
    }
});
```

## 3. データ管理戦略

### 3.1 セッションストレージ構造

```javascript
{
  "issues": [
    {
      "id": "uuid-v4",
      "title": "Issue Title",
      "story": "User Story",
      "acceptance_criteria": "AC",
      "technical_requirements": "Tech Reqs",
      "created_at": "ISO DateTime",
      "updated_at": "ISO DateTime"
    }
  ],
  "current_issue": null
}
```

### 3.2 データ永続化方針

- セッションストレージを主なデータストアとして使用
- 必要に応じてローカルストレージへのバックアップを実装
- エクスポート機能によるデータバックアップのサポート

## 4. 開発スケジュール

```mermaid
gantt
    title 実装スケジュール（ユースケースベース）
    dateFormat YYYY-MM-DD
    
    section UC1: 入力機能
    HTMX拡張機能セットアップ    :uc1_1, 2025-03-03, 2d
    入力フォーム実装           :uc1_2, after uc1_1, 2d
    
    section UC2: 変換機能
    モックAPI実装             :uc2_1, after uc1_2, 3d
    AIサービス統合            :uc2_2, after uc2_1, 4d
    
    section UC3: プレビュー
    プレビューページ実装       :uc3_1, after uc2_1, 3d
    HTMX統合                 :uc3_2, after uc3_1, 2d
    
    section UC4: 履歴管理
    履歴機能実装             :uc4_1, after uc3_2, 3d
    UIスタイリング           :uc4_2, after uc4_1, 2d
```

## 5. コンポーネント間の依存関係

- フロントエンド
  - HTMX（基本的なインタラクション）
  - HTMX拡張（カスタムデータ管理）
  - Bulma CSS（スタイリング）
  - Session Storage API（データ永続化）

- バックエンド
  - FastAPI（RESTful API）
  - AI Service（自然言語処理）
  - Jinja2（テンプレートエンジン）

## 6. エラーハンドリング

- セッションストレージの容量制限監視
- データ整合性チェック
- ネットワークエラーのフォールバック処理
- リカバリーメカニズムの実装

## 7. パフォーマンス最適化

- セッションストレージの定期的なクリーンアップ
- 不要なHTTPリクエストの最小化
- レスポンスデータの最適化

## 8. セキュリティ考慮事項

- XSS対策（HTMXのセキュリティベストプラクティス）
- CSRF保護
- 入力データのバリデーション