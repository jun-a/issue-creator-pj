# データ管理の改善計画

## 1. 現状の課題

### サーバーサイドのデータ管理
1. LocalStorageクラス（issues.json）
   - Issue保存
   - Issue取得
   - 一覧表示

2. RepoStorageクラス（repositories.json）
   - リポジトリ保存
   - リポジトリ取得
   - 一覧表示

### クライアントサイドのデータ管理
1. IssueStorage
   - window.issueStorage経由でのIssue管理
   - ブラウザのlocalStorageを使用

2. RepoStorage
   - window.repoStorage経由でのリポジトリ管理
   - ブラウザのlocalStorageを使用

## 2. 問題点

1. データの二重管理
   - サーバー: JSONファイル
   - クライアント: localStorage
   
2. 整合性の課題
   - 同期が取れていない
   - 更新タイミングの不一致
   
3. 不要なサーバー負荷
   - ファイルI/O操作
   - 永続化の重複

## 3. 改善方針

### APIエンドポイントの修正

1. /api/requests:
```python
@app.post("/api/requests", response_class=HTMLResponse)
async def api_requests(request: Request, user_input: str = Form(...)):
    try:
        issue = create_issue_from_text(user_input)
        # LocalStorageへの保存を削除
        return templates.TemplateResponse("partials/issue_preview.html", {
            "request": request,
            "issue": issue,
            "use_local_storage": True  # クライアントサイドでの保存を指示
        })
    except HTTPException as e:
        return templates.TemplateResponse("partials/error_message.html", {
            "request": request,
            "message": e.detail
        })
```

2. /preview/{issue_id}:
```python
@app.get("/preview/{issue_id}", response_class=HTMLResponse)
async def preview_issue(request: Request, issue_id: str):
    try:
        # クライアントサイドでのデータ取得を前提に
        return templates.TemplateResponse("preview.html", {
            "request": request,
            "issue_id": issue_id,  # IDのみを渡す
            "repos": None  # クライアントサイドで取得
        })
    except Exception as e:
        return templates.TemplateResponse("error.html", {
            "request": request,
            "message": str(e)
        })
```

3. /history:
```python
@app.get("/history", response_class=HTMLResponse)
async def read_history(request: Request):
    # クライアントサイドでの履歴表示に変更
    return templates.TemplateResponse("history.html", {
        "request": request
    })
```

4. /settings:
```python
@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    # クライアントサイドでのリポジトリ管理に変更
    return templates.TemplateResponse("settings.html", {
        "request": request
    })
```

### HTMLテンプレートの修正

1. preview.html:
```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const issueId = '{{ issue_id }}';
        const issue = window.issueStorage.getIssue(issueId);
        const repos = window.repoStorage.getAllRepos();
        
        // データを表示用に設定
        renderIssue(issue);
        renderRepoList(repos);
    });
</script>
```

2. history.html:
```html
<!-- サーバーサイドのデータ参照を削除 -->
<div id="issues-container" data-page="history">
    <!-- PageManagerで表示制御 -->
</div>
```

### 実装手順

1. サーバーサイドの変更
   - LocalStorageクラスの削除
   - RepoStorageクラスの削除
   - APIエンドポイントの修正

2. クライアントサイドの強化
   - StorageManagerの完成
   - PageManagerの拡張
   - データ取得処理の統一

3. テンプレートの更新
   - サーバーサイドデータ参照の削除
   - クライアントサイド処理への移行
   - データ属性の活用

4. テスト
   - ページ読み込みの確認
   - データ永続化の確認
   - 機能の動作確認

## 4. 期待される効果

1. パフォーマンス向上
   - サーバー負荷の軽減
   - ファイルI/Oの削減
   
2. 保守性の向上
   - データ管理の一元化
   - コードの簡素化
   
3. ユーザー体験の改善
   - 応答速度の向上
   - オフライン対応の可能性

次のステップ：実装の開始
