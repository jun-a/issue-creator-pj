from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
import uuid

# 型定義
class Issue(BaseModel):
    id: str
    title: str
    story: str
    criteria: Optional[str] = None
    requirements: Optional[str] = None
    created_at: str

class IssueResponse(BaseModel):
    status: str
    issue: Optional[Issue] = None
    message: Optional[str] = None

# アプリケーションの初期化
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ユーティリティ関数
def create_issue_from_text(text: str) -> Issue:
    """自然言語をIssue形式に変換する"""
    try:
        return Issue(
            id=str(uuid.uuid4()),
            title=text[:50] + "...",
            story=text,
            created_at=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def get_issue_by_id(issue_id: str) -> Optional[Issue]:
    """IDに基づいてIssueを取得する"""
    # Note: 実際の実装ではセッションストレージから取得
    try:
        return Issue(
            id=issue_id,
            title="Sample Issue",
            story="Sample story",
            created_at=datetime.utcnow().isoformat()
        )
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

@app.post("/api/requests", response_class=JSONResponse)
async def api_requests(request: Request, user_input: str = Form(...)):
    try:
        issue = create_issue_from_text(user_input)
        return IssueResponse(status="success", issue=issue)
    except HTTPException as e:
        return IssueResponse(status="error", message=e.detail)
    except Exception as e:
        return IssueResponse(status="error", message=str(e))

@app.get("/preview/{issue_id}", response_class=HTMLResponse)
async def preview_issue(request: Request, issue_id: str):
    try:
        issue = get_issue_by_id(issue_id)
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
        # Note: 実際の実装ではセッションストレージから取得
        issues: List[Issue] = []
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