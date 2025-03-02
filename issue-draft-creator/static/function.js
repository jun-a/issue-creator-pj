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

// セッションストレージのデータ形式
const sessionData = {
  "issues": [{
    "id": "uuid-v4",
    "title": "string",
    "story": "string",
    "criteria": "string",
    "requirements": "string",
    "created_at": "ISO string"
  }]
};