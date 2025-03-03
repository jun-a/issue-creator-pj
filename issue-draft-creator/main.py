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

# Jinja2フィルターの追加
def format_list_items(text):
    """テキストを行ごとに分割してリスト項目にフォーマット"""
    if not text:
        return []
    return [line.strip() for line in text.split('\n') if line.strip()]

# アプリケーションの初期化
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
templates.env.filters["format_list_items"] = format_list_items

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
            required_fields = ['title', 'user_story', 'acceptance_criteria', 'technical_requirements']
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required fields: {', '.join(missing_fields)}"
                )
            
            # データの取得と検証
            title = str(data['title']).strip('"')
            story = '\n'.join(data['user_story'])
            criteria = '\n'.join(data['acceptance_criteria'])
            requirements = '\n'.join(data['technical_requirements'])
            
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
        issue = storage.get_issue(issue_id)  # ストレージからissueを取得
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        return templates.TemplateResponse("preview.html", {
            "request": request,
            "issue": issue
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)