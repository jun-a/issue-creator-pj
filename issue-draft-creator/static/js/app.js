// ストレージ管理クラス
class StorageManager {
    constructor() {
        this.storage = localStorage;
        this.issueKey = 'issues';
        this.repoKey = 'repositories';
    }

    // Issue関連
    addIssue(issue) {
        const issues = this.getAllIssues();
        issues[issue.id] = issue;
        this.storage.setItem(this.issueKey, JSON.stringify(issues));
    }

    getIssue(id) {
        const issues = this.getAllIssues();
        return issues[id];
    }

    getAllIssues() {
        const data = this.storage.getItem(this.issueKey);
        return data ? JSON.parse(data) : {};
    }

    deleteIssue(id) {
        const issues = this.getAllIssues();
        if (issues[id]) {
            delete issues[id];
            this.storage.setItem(this.issueKey, JSON.stringify(issues));
            return true;
        }
        return false;
    }

    // リポジトリ関連
    addRepo(repo) {
        const repos = this.getAllRepos();
        repos[repo.id] = repo;
        this.storage.setItem(this.repoKey, JSON.stringify(repos));
    }

    getRepo(id) {
        const repos = this.getAllRepos();
        return repos[id];
    }

    getAllRepos() {
        const data = this.storage.getItem(this.repoKey);
        return data ? JSON.parse(data) : {};
    }

    deleteRepo(id) {
        const repos = this.getAllRepos();
        if (repos[id]) {
            delete repos[id];
            this.storage.setItem(this.repoKey, JSON.stringify(repos));
            return true;
        }
        return false;
    }
}

// UIコンポーネント管理クラス
class ComponentManager {
    constructor() {
        this.initializeComponents();
    }

    // 共通コンポーネントの初期化
    initializeComponents() {
        this.initializeNotifications();
        this.initializeTabs();
        this.initializeNavbar();
    }

    // 通知関連
    initializeNotifications() {
        document.querySelectorAll('.notification .delete').forEach(button => {
            button.addEventListener('click', () => this.hideNotification(button.parentNode));
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification is-${type}`;
        notification.innerHTML = `
            <button class="delete" aria-label="delete"></button>
            <p>${message}</p>
        `;
        notification.querySelector('.delete').addEventListener('click',
            () => this.hideNotification(notification));
        document.body.appendChild(notification);
    }

    hideNotification(element) {
        element.classList.add('is-hiding');
        element.addEventListener('transitionend', () => element.remove());
    }

    // タブ関連
    initializeTabs() {
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleTabClick(e));
        });
    }

    handleTabClick(e) {
        e.preventDefault();
        const tab = e.currentTarget;
        const tabContainer = tab.closest('.tabs');
        const contentContainer = tabContainer.nextElementSibling.parentElement;
        
        // タブの切り替え
        tabContainer.querySelectorAll('[data-tab]').forEach(t => {
            t.parentElement.classList.remove('is-active');
        });
        tab.parentElement.classList.add('is-active');
        
        // コンテンツの切り替え
        const tabId = tab.getAttribute('data-tab');
        contentContainer.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('is-hidden');
        });
        contentContainer.querySelector(`#tab-${tabId}`).classList.remove('is-hidden');
    }

    // ナビゲーション関連
    initializeNavbar() {
        const burgers = document.querySelectorAll('.navbar-burger');
        burgers.forEach(burger => {
            burger.addEventListener('click', () => this.toggleNavbar(burger));
        });
    }

    toggleNavbar(burger) {
        const target = document.getElementById(burger.dataset.target);
        burger.classList.toggle('is-active');
        target.classList.toggle('is-active');
    }
}

// グローバルインスタンスの作成
window.storage = new StorageManager();
window.components = new ComponentManager();

// 後方互換性のため
window.issueStorage = {
    addIssue: (...args) => window.storage.addIssue(...args),
    getIssue: (...args) => window.storage.getIssue(...args),
    getAllIssues: (...args) => window.storage.getAllIssues(...args),
    deleteIssue: (...args) => window.storage.deleteIssue(...args)
};

window.repoStorage = {
    addRepo: (...args) => window.storage.addRepo(...args),
    getRepo: (...args) => window.storage.getRepo(...args),
    getAllRepos: (...args) => window.storage.getAllRepos(...args),
    deleteRepo: (...args) => window.storage.deleteRepo(...args)
};

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

// ページ読み込み時の初期化
// イベント管理クラス
class EventManager {
    constructor() {
        this.MIN_LOADING_TIME = 3000;
        this.loadingStartTime = 0;
        this.initializeHTMXEvents();
    }

    initializeHTMXEvents() {
        document.body.addEventListener('htmx:beforeRequest', this.handleBeforeRequest.bind(this));
        document.body.addEventListener('htmx:afterRequest', this.handleAfterRequest.bind(this));
        document.body.addEventListener('htmx:afterSwap', this.handleAfterSwap.bind(this));
    }

    handleBeforeRequest(evt) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <span class="icon is-large">
                    <i class="fas fa-spinner fa-pulse fa-2x"></i>
                </span>
                <p class="mt-3">Issue を生成中...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        document.body.classList.add('is-loading');
        this.loadingStartTime = Date.now();
    }

    handleAfterRequest(evt) {
        const elapsedTime = Date.now() - this.loadingStartTime;
        const remainingTime = Math.max(0, this.MIN_LOADING_TIME - elapsedTime);

        setTimeout(() => {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                document.body.classList.remove('is-loading');
                loadingOverlay.addEventListener('transitionend', () => {
                    loadingOverlay.remove();
                });
                loadingOverlay.classList.add('is-hiding');
            }
        }, remainingTime);
    }

    handleAfterSwap(evt) {
        window.components.initializeComponents();
    }
}

// ページ管理クラス
class PageManager {
    constructor() {
        this.currentPage = this.identifyCurrentPage();
        this.initialize();
    }

    identifyCurrentPage() {
        const path = window.location.pathname;
        if (path === '/') return 'index';
        return path.split('/')[1] || 'index';
    }

    initialize() {
        switch (this.currentPage) {
            case 'index':
                this.initializeIndexPage();
                break;
            case 'history':
                this.initializeHistoryPage();
                break;
            case 'preview':
                this.initializePreviewPage();
                break;
            case 'settings':
                this.initializeSettingsPage();
                break;
        }
    }

    initializeIndexPage() {
        this.setupRecentIssues();
    }

    initializeHistoryPage() {
        this.setupIssueList();
    }

    initializePreviewPage() {
        window.components.initializeTabs();
    }

    initializeSettingsPage() {
        this.setupRepoForm();
    }

    setupRecentIssues() {
        const issues = Object.values(window.storage.getAllIssues())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
        this.renderIssueList('recent-issues-container', issues);
    }

    setupIssueList() {
        const issues = Object.values(window.storage.getAllIssues())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        this.renderIssueList('issues-container', issues);
    }

    setupRepoForm() {
        const form = document.getElementById('repo-form');
        if (form) {
            form.addEventListener('submit', this.handleRepoSubmit.bind(this));
        }
    }

    renderIssueList(containerId, issues) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (issues.length > 0) {
            container.innerHTML = issues.map(issue => `
                <tr>
                    <td>${issue.title}</td>
                    <td>${new Date(issue.created_at).toLocaleString('ja-JP')}</td>
                    <td>
                        <div class="buttons are-small">
                            <a href="/preview/${issue.id}" class="button is-primary">
                                <span class="icon">
                                    <i class="fas fa-eye"></i>
                                </span>
                            </a>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="3" class="has-text-centered">
                        作成されたIssueはありません
                    </td>
                </tr>
            `;
        }
    }

    handleRepoSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const repo = {
            id: crypto.randomUUID(),
            name: formData.get('name'),
            owner: formData.get('owner'),
            created_at: new Date().toISOString()
        };
        window.storage.addRepo(repo);
        e.target.reset();
        window.components.showNotification('リポジトリを追加しました', 'success');
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.events = new EventManager();
    window.pages = new PageManager();
    window.components.initializeComponents();
});