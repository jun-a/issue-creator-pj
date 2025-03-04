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
        this.initializeErrorNotification();
    }

    initializeNotifications() {
        document.querySelectorAll('.notification .delete').forEach(button => {
            button.addEventListener('click', () => this.hideNotification(button.parentNode));
        });
    }

    initializeErrorNotification() {
        const errorNotification = document.getElementById('error-notification');
        if (errorNotification) {
            const deleteButton = errorNotification.querySelector('.delete');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => {
                    errorNotification.classList.add('is-hidden');
                });
            }
        }
    }

    showNotification(message, type = 'info', targetElement = null) {
        const notification = document.createElement('div');
        notification.className = `notification is-${type}`;
        notification.innerHTML = `
            <button class="delete" aria-label="delete"></button>
            <p>${message}</p>
        `;
        notification.querySelector('.delete').addEventListener('click',
            () => this.hideNotification(notification));

        const insertTarget = document.getElementById('issue-preview');
        if (insertTarget) {
            insertTarget.insertAdjacentElement('afterend', notification);
        } else {
            document.body.appendChild(notification);
        }
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
                        this.showNotification('Markdownをコピーしました', 'success', copyButton);
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
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
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
            this.saveIssueData(evt.detail.elt);
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

    saveIssueData(element) {
        try {
            const issueData = element.querySelector('[data-auto-store="true"]');
            if (!issueData || !issueData.dataset.issue) {
                console.log('Issue data not found in response');
                return;
            }

            const issue = JSON.parse(issueData.dataset.issue);
            if (!this.validateIssueData(issue)) {
                window.components.showNotification('Issue データの形式が不正です', 'error');
                return;
            }

            // 重複チェック
            const existingIssues = window.storage.getAllIssues();
            if (existingIssues[issue.id]) {
                console.log('Issue already exists:', issue.id);
                return;
            }

            // 保存処理
            window.storage.addIssue(issue);
            console.log('Issue saved successfully:', issue);
            window.components.showNotification('Issue を保存しました', 'success');
        } catch (e) {
            console.error('データの処理中にエラーが発生しました:', e);
            window.components.showNotification('データの処理中にエラーが発生しました', 'error');
        }
    }

    validateIssueData(issue) {
        return Boolean(
            issue &&
            typeof issue === 'object' &&
            issue.id &&
            typeof issue.id === 'string' &&
            issue.title &&
            typeof issue.title === 'string' &&
            issue.story &&
            typeof issue.story === 'string'
        );
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
        const issuePreviewContainer = document.getElementById('issue-preview');
        if (!issuePreviewContainer) return;

        // URLからissue_idを取得
        const pathParts = window.location.pathname.split('/');
        const issueId = pathParts[pathParts.length - 1];
        
        // issueデータの取得と表示
        const issue = window.storage.getIssue(issueId);
        if (!issue) {
            window.components.showNotification('Issueが見つかりません', 'error');
            window.location.href = '/history';
            return;
        }

        const repos = this.getValidRepositories();
        if (repos.length === 0) {
            window.components.showNotification('GitHubリポジトリが設定されていません', 'warning');
        }

        function nl2br(text) {
            if (!text) return '';
            return text.replace(/\n/g, '<br>');
        }

        // プレビューの生成
        issuePreviewContainer.innerHTML = `
            <div class="column is-10 is-offset-1">
                <div class="message box animate-fadeIn">
                    <div class="message-header">
                        <p>${issue.title}</p>
                    </div>
                    <div class="message-body">
                        <div class="tabs is-boxed">
                            <ul>
                                <li class="is-active" data-tab="preview">
                                    <a>
                                        <span class="icon is-small"><i class="fas fa-eye"></i></span>
                                        <span>プレビュー</span>
                                    </a>
                                </li>
                                <li data-tab="markdown">
                                    <a>
                                        <span class="icon is-small"><i class="fas fa-code"></i></span>
                                        <span>Markdown</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                        
                        <div id="tab-preview" class="tab-content content markdown-preview">
                            <h3>User Story</h3>
                            <p>${nl2br(issue.story)}</p>
                            
                            ${issue.criteria ? `
                                <h3>Acceptance Criteria</h3>
                                <ul>
                                    ${issue.criteria.split('\n')
                                        .filter(item => item.trim())
                                        .map(item => `<li>${nl2br(item.trim())}</li>`)
                                        .join('')}
                                </ul>
                            ` : ''}
                            
                            ${issue.requirements ? `
                                <h3>Technical Requirements</h3>
                                <ul>
                                    ${issue.requirements.split('\n')
                                        .filter(item => item.trim())
                                        .map(item => `<li>${nl2br(item.trim())}</li>`)
                                        .join('')}
                                </ul>
                            ` : ''}
                        </div>
                        
                        <div id="tab-markdown" class="tab-content is-hidden">
                            <pre><code class="language-markdown">${window.components.convertIssueToMarkdown(issue)}</code></pre>
                        </div>
                    </div>
                </div>
                
                <div class="field is-grouped mt-5">
                    <div class="control">
                        <a href="/history" class="button is-light">
                            <span class="icon">
                                <i class="fas fa-arrow-left"></i>
                            </span>
                            <span>履歴に戻る</span>
                        </a>
                    </div>
                    
                    ${repos.length > 0 ? `
                        <div class="control">
                            <div class="dropdown">
                                <div class="dropdown-trigger">
                                    <button class="button is-primary" aria-haspopup="true" aria-controls="dropdown-menu">
                                        <span class="icon">
                                            <i class="fab fa-github"></i>
                                        </span>
                                        <span>GitHubに投稿</span>
                                        <span class="icon is-small">
                                            <i class="fas fa-angle-down" aria-hidden="true"></i>
                                        </span>
                                    </button>
                                </div>
                                <div class="dropdown-menu" id="dropdown-menu" role="menu">
                                    <div class="dropdown-content">
                                        ${repos.map(repo => `
                                            <a href="${repo.url}/issues/new?title=${encodeURIComponent(issue.title)}&body=${encodeURIComponent(window.components.convertIssueToMarkdown(issue))}"
                                               class="dropdown-item" target="_blank">
                                                ${repo.owner}/${repo.name}
                                            </a>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="control">
                        <button class="button is-info" id="copy-markdown-btn">
                            <span class="icon">
                                <i class="fas fa-copy"></i>
                            </span>
                            <span>Markdownをコピー</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // コンポーネントの初期化
        window.components.initializeTabs();
        window.components.initializeMarkdownCopy();
        window.components.initializeDropdowns();

        // シンタックスハイライトの適用
        if (window.hljs) {
            window.hljs.highlightAll();
        }
    }

    getValidRepositories() {
        const repos = Object.values(window.storage.getAllRepos());
        return repos.filter(repo => {
            return repo &&
                   typeof repo === 'object' &&
                   repo.name &&
                   repo.owner &&
                   repo.url &&
                   repo.url.startsWith('https://github.com/');
        });
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