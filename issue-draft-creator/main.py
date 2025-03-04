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
import yaml

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
    repository: Optional[str] = None

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

# エンドポイント
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "page_title": "Issue Draft Creator"
    })

@app.get("/create", response_class=HTMLResponse)
async def create_issue(request: Request):
    return templates.TemplateResponse("create.html", {
        "request": request,
        "page_title": "Issue作成"
    })

@app.post("/api/requests", response_class=HTMLResponse)
async def api_requests(request: Request, user_input: str = Form(...)):
    try:
        issue = create_issue_from_text(user_input)
        # HTMLテンプレートのレンダリング
        return templates.TemplateResponse("partials/issue_preview.html", {
            "request": request,
            "issue": issue,
            "use_local_storage": True,
            "json_data": issue.dict()  # JSON形式のデータも一緒に送信
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
    return templates.TemplateResponse("preview.html", {
        "request": request,
        "issue_id": issue_id
    })

@app.get("/history", response_class=HTMLResponse)
async def read_history(request: Request):
    return templates.TemplateResponse("history.html", {
        "request": request
    })

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {
        "request": request,
        "page_title": "Settings"
    })

@app.post("/api/repos", response_class=HTMLResponse)
async def add_repository(request: Request, name: str = Form(...), owner: str = Form(...)):
    try:
        repo = {
            "id": str(uuid.uuid4()),
            "name": name,
            "owner": owner,
            "url": f"https://github.com/{owner}/{name}",
            "created_at": datetime.utcnow().isoformat()
        }
        return JSONResponse(content=repo)
    except Exception as e:
        return templates.TemplateResponse("partials/error_message.html", {
            "request": request,
            "message": str(e)
        })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
