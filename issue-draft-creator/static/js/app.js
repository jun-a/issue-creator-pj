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

    initializeComponents() {
        this.initializeNotifications();
        this.initializeTabs();
        this.initializeNavbar();
        this.initializeMarkdownCopy();
        this.initializeDropdowns();
    }

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

    convertIssueToMarkdown(issue) {
        const md = [];
        md.push("## User Story\n");
        md.push(issue.story + "\n");
        
        if (issue.criteria) {
            md.push("\n## Acceptance Criteria\n");
            issue.criteria.split('\n').forEach(criterion => {
                if (criterion.trim()) {
                    md.push(`- ${criterion.trim()}\n`);
                }
            });
        }
        
        if (issue.requirements) {
            md.push("\n## Technical Requirements\n");
            issue.requirements.split('\n').forEach(req => {
                if (req.trim()) {
                    md.push(`- ${req.trim()}\n`);
                }
            });
        }
        
        return md.join('');
    }

    initializeMarkdownCopy() {
        const copyButton = document.getElementById('copy-markdown-btn');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const markdown = document.querySelector('#tab-markdown code').textContent;
                navigator.clipboard.writeText(markdown)
                    .then(() => {
                        this.showNotification('Markdownをコピーしました', 'success');
                    })
                    .catch(err => {
                        this.showNotification('コピーに失敗しました: ' + err, 'error');
                    });
            });
        }
    }

    initializeDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.querySelector('.dropdown-trigger button').addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('is-active');
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown.is-active').forEach(dropdown => {
                dropdown.classList.remove('is-active');
            });
        });
    }

    initializeTabs() {
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = tab.getAttribute('data-tab');
                
                // タブの切り替え
                tab.parentElement.parentElement.querySelectorAll('li').forEach(t => {
                    t.classList.remove('is-active');
                });
                tab.parentElement.classList.add('is-active');
                
                // コンテンツの切り替え
                const container = tab.closest('.message-body');
                container.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('is-hidden');
                });
                container.querySelector(`#tab-${tabId}`).classList.remove('is-hidden');
            });
        });
    }

    initializeNavbar() {
        const burgers = document.querySelectorAll('.navbar-burger');
        burgers.forEach(burger => {
            burger.addEventListener('click', () => {
                const target = document.getElementById(burger.dataset.target);
                burger.classList.toggle('is-active');
                target.classList.toggle('is-active');
            });
        });
    }
}

// イベント管理クラス
class EventManager {
    constructor() {
        this.MIN_LOADING_TIME = 2000;
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

        // データの保存処理
        if (evt.detail && evt.detail.elt) {
            try {
                const issueData = evt.detail.elt.querySelector('[data-auto-store="true"]');
                if (issueData && issueData.dataset.issue) {
                    const issue = JSON.parse(issueData.dataset.issue);
                    if (issue && issue.id && issue.title && issue.story) {
                        window.storage.addIssue(issue);
                        console.log('Issue saved successfully:', issue);
                    } else {
                        console.error('Invalid issue data structure:', issue);
                        window.components.showNotification('Issue データの形式が不正です', 'error');
                    }
                }
            } catch (e) {
                console.error('データの処理中にエラーが発生しました:', e);
                window.components.showNotification('データの処理中にエラーが発生しました', 'error');
            }
        }

        setTimeout(() => {
            document.body.classList.remove('is-loading');
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.addEventListener('transitionend', () => {
                    loadingOverlay.remove();
                });
                loadingOverlay.classList.add('is-hiding');
            }
        }, remainingTime);
    }

    handleAfterSwap(evt) {
        window.components.initializeComponents();
        if (evt.detail.pathInfo.requestPath === '/preview') {
            hljs.highlightAll();
        }
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
        this.setupRepoList();
    }

    setupRepoForm() {
        const form = document.getElementById('repo-form');
        if (form) {
            form.addEventListener('submit', this.handleRepoSubmit.bind(this));
        }
    }

    setupRepoList() {
        const repos = Object.values(window.storage.getAllRepos());
        this.renderRepoList(repos);
    }

    // リポジトリリストの表示
    renderRepoList(repos) {
        const container = document.getElementById('repo-list');
        if (!container) return;

        if (repos.length > 0) {
            container.innerHTML = repos.map(repo => `
                <tr>
                    <td>${repo.owner}/${repo.name}</td>
                    <td><a href="${repo.url}" target="_blank">${repo.url}</a></td>
                    <td>${new Date(repo.created_at).toLocaleString('ja-JP')}</td>
                    <td>
                        <div class="buttons are-small">
                            <button class="button is-danger" data-repo-id="${repo.id}" data-action="delete-repo">
                                <span class="icon">
                                    <i class="fas fa-trash"></i>
                                </span>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // 削除ボタンのイベントハンドラ設定
            container.querySelectorAll('[data-action="delete-repo"]').forEach(button => {
                button.addEventListener('click', () => {
                    const repoId = button.dataset.repoId;
                    if (window.storage.deleteRepo(repoId)) {
                        window.components.showNotification('リポジトリを削除しました', 'success');
                        this.setupRepoList();
                    }
                });
            });
        } else {
            container.innerHTML = `
                <tr>
                    <td colspan="4" class="has-text-centered">
                        登録されたリポジトリはありません
                    </td>
                </tr>
            `;
        }
    }

    // フォームの送信処理
    handleRepoSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name').trim();
        const owner = formData.get('owner').trim();

        // 入力値のバリデーション
        if (!name || !owner) {
            window.components.showNotification('リポジトリ名とオーナー名を入力してください', 'error');
            return;
        }

        // 既存のリポジトリをチェック
        const repos = Object.values(window.storage.getAllRepos());
        const exists = repos.some(repo =>
            repo.name.toLowerCase() === name.toLowerCase() &&
            repo.owner.toLowerCase() === owner.toLowerCase()
        );

        if (exists) {
            window.components.showNotification('このリポジトリは既に登録されています', 'error');
            return;
        }

        const repo = {
            id: crypto.randomUUID(),
            name: name,
            owner: owner,
            url: `https://github.com/${owner}/${name}`,
            created_at: new Date().toISOString()
        };

        window.storage.addRepo(repo);
        e.target.reset();
        window.components.showNotification('リポジトリを追加しました', 'success');
        this.setupRepoList();
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
}

// グローバルインスタンスの作成
window.storage = new StorageManager();
window.components = new ComponentManager();
window.events = new EventManager();
window.pages = new PageManager();

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