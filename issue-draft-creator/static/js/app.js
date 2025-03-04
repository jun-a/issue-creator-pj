class IssueStorage {
    constructor() {
        this.storage = localStorage;
        this.key = 'issues';
    }

    addIssue(issue) {
        const issues = this.getAllIssues();
        issues[issue.id] = issue;
        this.storage.setItem(this.key, JSON.stringify(issues));
    }

    getIssue(id) {
        const issues = this.getAllIssues();
        return issues[id];
    }

    getAllIssues() {
        const data = this.storage.getItem(this.key);
        return data ? JSON.parse(data) : {};
    }

    deleteIssue(id) {
        const issues = this.getAllIssues();
        if (issues[id]) {
            delete issues[id];
            this.storage.setItem(this.key, JSON.stringify(issues));
            return true;
        }
        return false;
    }
}

// グローバルインスタンスの作成
window.issueStorage = new IssueStorage();

class RepoStorage {
    constructor() {
        this.storage = localStorage;
        this.key = 'repositories';
    }

    addRepo(repo) {
        const repos = this.getAllRepos();
        repos[repo.id] = repo;
        this.storage.setItem(this.key, JSON.stringify(repos));
    }

    getRepo(id) {
        const repos = this.getAllRepos();
        return repos[id];
    }

    getAllRepos() {
        const data = this.storage.getItem(this.key);
        return data ? JSON.parse(data) : {};
    }

    deleteRepo(id) {
        const repos = this.getAllRepos();
        if (repos[id]) {
            delete repos[id];
            this.storage.setItem(this.key, JSON.stringify(repos));
            return true;
        }
        return false;
    }
}

// グローバルインスタンスの作成
window.repoStorage = new RepoStorage();

// HTMX拡張の定義
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

// ローディング表示の最小時間を設定
const MIN_LOADING_TIME = 3000; // 3秒

// ローディング状態の管理
let loadingStartTime;
let loadingTimer;

document.body.addEventListener('htmx:beforeRequest', function(evt) {
    if (evt.detail.target.id === 'issue-preview') {
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator.classList.remove('is-hidden');
        loadingStartTime = Date.now();
    }
});

document.body.addEventListener('htmx:afterRequest', function(evt) {
    if (evt.detail.target.id === 'issue-preview') {
        const loadingIndicator = document.getElementById('loading-indicator');
        const elapsedTime = Date.now() - loadingStartTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        // 最小表示時間を確保するため、必要に応じて遅延を追加
        setTimeout(() => {
            loadingIndicator.classList.add('is-hidden');
            if (evt.detail.successful) {
                // 成功時の処理（必要に応じて）
            }
        }, remainingTime);
    }
});

// ページ読み込み完了時の処理
document.addEventListener('DOMContentLoaded', function() {
    // 通知メッセージの閉じるボタン
    document.querySelectorAll('.notification .delete').forEach(button => {
        button.addEventListener('click', () => {
            button.parentNode.remove();
        });
    });
    
    // タブ切り替え機能の初期化
    initializeTabs();
});

// 動的に追加された要素に対するイベントハンドラの設定
document.body.addEventListener('htmx:afterSwap', function(event) {
    // タブ切り替え機能の再初期化
    initializeTabs();
});

// タブ切り替え機能
function initializeTabs() {
    document.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 親要素のコンテキスト内でタブを探す
            const tabContainer = this.closest('.tabs');
            const contentContainer = tabContainer.nextElementSibling.parentElement;
            
            // タブのアクティブ状態を切り替え
            tabContainer.querySelectorAll('[data-tab]').forEach(t => {
                t.parentElement.classList.remove('is-active');
            });
            this.parentElement.classList.add('is-active');
            
            // コンテンツの表示/非表示を切り替え
            const tabId = this.getAttribute('data-tab');
            contentContainer.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('is-hidden');
            });
            contentContainer.querySelector(`#tab-${tabId}`).classList.remove('is-hidden');
        });
    });
}