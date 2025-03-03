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
