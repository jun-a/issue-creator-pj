from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
import uuid
import os
import google.generativeai as genai
from dotenv import load_dotenv
import logging
import json
import yaml  # 追加


# .env設定の読み込み
load_dotenv()

# Geminiの設定
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash')

# 型定義
class Issue(BaseModel):
    id: str
    title: str
    story: str
    criteria: Optional[str] = None
    requirements: Optional[str] = None
    created_at: str

    class Config:
        # JSONのシリアライズ時に改行を保持
        json_encoders = {
            str: lambda v: v.replace('\n', '\\n') if isinstance(v, str) else v
        }

    @classmethod
    def parse_obj(cls, obj):
        # 文字列フィールドの改行を復元
        if isinstance(obj, dict):
            for key in ['story', 'criteria', 'requirements']:
                if key in obj and isinstance(obj[key], str):
                    obj[key] = obj[key].replace('\\n', '\n')
        return super().parse_obj(obj)
    
    def to_markdown(self) -> str:
        """IssueをMarkdown形式に変換"""
        md = []
        md.append("## User Story\n")
        md.append(self.story + "\n")
        
        if self.criteria:
            md.append("\n## Acceptance Criteria\n")
            for criterion in self.criteria.split('\n'):
                if criterion.strip():
                    md.append(f"- {criterion.strip()}\n")
                    
        if self.requirements:
            md.append("\n## Technical Requirements\n")
            for req in self.requirements.split('\n'):
                if req.strip():
                    md.append(f"- {req.strip()}\n")
                    
        return "".join(md)

class IssueResponse(BaseModel):
    status: str
    issue: Optional[Issue] = None
    message: Optional[str] = None

# ストレージクラスの追加
class LocalStorage:
    def __init__(self, file_path: str = "issues.json"):
        self.file_path = file_path
        self.issues: Dict[str, Issue] = {}
        self._load()

    def _load(self):
        """JSONファイルからissuesを読み込む"""
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.issues = {
                        id: Issue(**issue_data)
                        for id, issue_data in data.items()
                    }
        except Exception as e:
            logger.error(f"Failed to load issues: {e}")
            self.issues = {}

    def _save(self):
        """issuesをJSONファイルに保存"""
        try:
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(
                    {id: issue.dict() for id, issue in self.issues.items()},
                    f,
                    ensure_ascii=False,
                    indent=2,
                    default=str
                )
        except Exception as e:
            logger.error(f"Failed to save issues: {e}")

    def add_issue(self, issue: Issue):
        """新しいissueを追加"""
        self.issues[issue.id] = issue
        self._save()

    def get_issue(self, issue_id: str) -> Optional[Issue]:
        """IDでissueを取得"""
        return self.issues.get(issue_id)

    def get_all_issues(self) -> List[Issue]:
        """全てのissueを取得"""
        return list(self.issues.values())

# ストレージのインスタンス化
storage = LocalStorage()

# GitHubリポジトリ設定モデル
class GitHubRepo(BaseModel):
    id: str
    name: str
    owner: str
    url: str
    created_at: str
    
    @property
    def full_name(self) -> str:
        return f"{self.owner}/{self.name}"
    
    @property
    def issues_url(self) -> str:
        return f"{self.url}/issues/new"

# リポジトリストレージクラス
class RepoStorage:
    def __init__(self, file_path: str = "repositories.json"):
        self.file_path = file_path
        self.repos: Dict[str, GitHubRepo] = {}
        self._load()
    
    def _load(self):
        """JSONファイルからリポジトリを読み込む"""
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.repos = {
                        id: GitHubRepo(**repo_data)
                        for id, repo_data in data.items()
                    }
        except Exception as e:
            logger.error(f"Failed to load repositories: {e}")
            self.repos = {}
    
    def _save(self):
        """リポジトリをJSONファイルに保存"""
        try:
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(
                    {id: repo.dict() for id, repo in self.repos.items()},
                    f,
                    ensure_ascii=False,
                    indent=2,
                    default=str
                )
        except Exception as e:
            logger.error(f"Failed to save repositories: {e}")
    
    def add_repo(self, repo: GitHubRepo):
        """新しいリポジトリを追加"""
        self.repos[repo.id] = repo
        self._save()
    
    def delete_repo(self, repo_id: str) -> bool:
        """リポジトリを削除"""
        if repo_id in self.repos:
            del self.repos[repo_id]
            self._save()
            return True
        return False
    
    def get_repo(self, repo_id: str) -> Optional[GitHubRepo]:
        """IDでリポジトリを取得"""
        return self.repos.get(repo_id)
    
    def get_all_repos(self) -> List[GitHubRepo]:
        """全てのリポジトリを取得"""
        return list(self.repos.values())

# ストレージのインスタンス化
repo_storage = RepoStorage()

# Jinja2フィルターの追加
def format_list_items(text):
    """テキストを行ごとに分割してリスト項目にフォーマット"""
    if not text:
        return []
    return [line.strip() for line in text.split('\n') if line.strip()]

def to_markdown(issue):
    """IssueをMarkdown形式に変換するフィルター"""
    return issue.to_markdown()

# アプリケーションの初期化
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
templates.env.filters["format_list_items"] = format_list_items
templates.env.filters["to_markdown"] = to_markdown

# ロガーの設定
logger = logging.getLogger("uvicorn")

# ユーティリティ関数
def create_issue_from_text(text: str) -> Issue:
    """自然言語をIssue形式に変換する"""
    try:
        # Geminiに送るプロンプト
        prompt = f"""
以下の要望から、GitHubのIssue形式に変換し、厳密にYAML形式で出力してください。
以下の形式で出力してください：

title: "ここにタイトルを記述"
user_story:
  - "ユーザーストーリーを記述"
acceptance_criteria:
  - "受け入れ基準1"
  - "受け入れ基準2"
technical_requirements:
  - "技術要件1"
  - "技術要件2"

この要望を上記フォーマットに変換してください：
{text}
"""
        # Geminiで変換
        response = model.generate_content(prompt)
        content = response.text.strip()
        
        # マークダウンフォーマットの除去
        content = content.replace('```yaml', '').replace('```', '').strip()
        
        # デバッグ出力
        logger.info("=== Cleaned Content ===")
        logger.info(f"Content text:\n{content}")
        
        # YAMLとしてパース
        try:
            data = yaml.safe_load(content)
            if not data:
                raise HTTPException(status_code=400, detail="Empty YAML response")
            
            # 必須フィールドの確認
            required_fields = ['title', 'user_story']
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required fields: {', '.join(missing_fields)}"
                )
            
            # データの取得と検証
            title = str(data['title']).strip('"')
            
            # リスト形式かどうかを確認してストーリーに変換
            if isinstance(data['user_story'], list):
                story = '\n'.join(data['user_story'])
            else:
                story = str(data['user_story'])
            
            # 受け入れ基準と技術要件（オプショナル）
            criteria = None
            if 'acceptance_criteria' in data and data['acceptance_criteria']:
                if isinstance(data['acceptance_criteria'], list):
                    criteria = '\n'.join(data['acceptance_criteria'])
                else:
                    criteria = str(data['acceptance_criteria'])
            
            requirements = None
            if 'technical_requirements' in data and data['technical_requirements']:
                if isinstance(data['technical_requirements'], list):
                    requirements = '\n'.join(data['technical_requirements'])
                else:
                    requirements = str(data['technical_requirements'])
            
            # デバッグ出力
            logger.info("=== Parsed Result ===")
            logger.info(f"Title: [{title}]")
            logger.info(f"Story: [{story}]")
            logger.info(f"Criteria: [{criteria}]")
            logger.info(f"Requirements: [{requirements}]")
            
            return Issue(
                id=str(uuid.uuid4()),
                title=title,
                story=story,
                criteria=criteria,
                requirements=requirements,
                created_at=datetime.utcnow().isoformat()
            )
        except yaml.YAMLError as e:
            logger.error(f"YAML parse error: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid YAML format: {e}")
            
    except Exception as e:
        logger.error(f"Error in create_issue_from_text: {e}")
        raise HTTPException(status_code=400, detail=str(e))

def get_issue_by_id(issue_id: str) -> Optional[Issue]:
    """IDに基づいてIssueを取得する"""
    try:
        return storage.get_issue(issue_id)
    except Exception as e:
        return None

# エンドポイント
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    try:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "page_title": "Issue Draft Creator"
        })
    except Exception as e:
        return templates.TemplateResponse("error.html", {
            "request": request,
            "message": str(e)
        })

@app.post("/api/requests", response_class=HTMLResponse)
async def api_requests(request: Request, user_input: str = Form(...)):
    try:
        issue = create_issue_from_text(user_input)
        storage.add_issue(issue)  # 作成したissueを保存
        
        # HTMLレスポンスにテンプレートを使用
        return templates.TemplateResponse("partials/issue_preview.html", {
            "request": request,
            "issue": issue
        })
    except HTTPException as e:
        return templates.TemplateResponse("partials/error_message.html", {
            "request": request,
            "message": e.detail
        })
    except Exception as e:
        return templates.TemplateResponse("partials/error_message.html", {
            "request": request,
            "message": str(e)
        })

@app.get("/preview/{issue_id}", response_class=HTMLResponse)
async def preview_issue(request: Request, issue_id: str):
    try:
        issue = storage.get_issue(issue_id)
        repos = repo_storage.get_all_repos()
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        return templates.TemplateResponse("preview.html", {
            "request": request,
            "issue": issue,
            "repos": repos
        })
    except HTTPException as e:
        return templates.TemplateResponse("error.html", {
            "request": request,
            "message": e.detail
        })
    except Exception as e:
        return templates.TemplateResponse("error.html", {
            "request": request,
            "message": str(e)
        })

@app.get("/history", response_class=HTMLResponse)
async def read_history(request: Request):
    try:
        issues = storage.get_all_issues()  # ストレージから全てのissueを取得
        return templates.TemplateResponse("history.html", {
            "request": request,
            "issues": issues
        })
    except Exception as e:
        return templates.TemplateResponse("error.html", {
            "request": request,
            "message": str(e)
        })

# GitHub関連エンドポイント
@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    try:
        repos = repo_storage.get_all_repos()
        return templates.TemplateResponse("settings.html", {
            "request": request,
            "page_title": "Settings",
            "repos": repos
        })
    except Exception as e:
        return templates.TemplateResponse("error.html", {
            "request": request,
            "message": str(e)
        })

@app.post("/api/repos", response_class=HTMLResponse)
async def add_repository(request: Request, 
                         name: str = Form(...), 
                         owner: str = Form(...), 
                         url: str = Form(...)):
    try:
        # URLの正規化
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # GitHubのURLかどうかを簡易チェック
        if 'github.com' not in url:
            url = f'https://github.com/{owner}/{name}'
        
        repo = GitHubRepo(
            id=str(uuid.uuid4()),
            name=name,
            owner=owner,
            url=url,
            created_at=datetime.utcnow().isoformat()
        )
        
        repo_storage.add_repo(repo)
        
        return templates.TemplateResponse("partials/repo_list.html", {
            "request": request,
            "repos": repo_storage.get_all_repos()
        })
    except Exception as e:
        return templates.TemplateResponse("partials/error_message.html", {
            "request": request,
            "message": str(e)
        })

@app.delete("/api/repos/{repo_id}", response_class=HTMLResponse)
async def delete_repository(request: Request, repo_id: str):
    try:
        success = repo_storage.delete_repo(repo_id)
        if not success:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        return templates.TemplateResponse("partials/repo_list.html", {
            "request": request,
            "repos": repo_storage.get_all_repos()
        })
    except HTTPException as e:
        return templates.TemplateResponse("partials/error_message.html", {
            "request": request,
            "message": e.detail
        })
    except Exception as e:
        return templates.TemplateResponse("partials/error_message.html", {
            "request": request,
            "message": str(e)
        })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)