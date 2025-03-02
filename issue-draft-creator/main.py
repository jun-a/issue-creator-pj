from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

app = FastAPI()
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/generate_issue", response_class=HTMLResponse)
async def generate_issue(request: Request, user_input: str = Form(...)):
    # 自然言語からGitHub Issue形式への変換ロジックをここに実装
    return templates.TemplateResponse("preview.html", {"request": request, "issue": user_input})

@app.get("/history", response_class=HTMLResponse)
async def read_history(request: Request):
    return templates.TemplateResponse("history.html", {"request": request})

@app.post("/api/requests", response_class=HTMLResponse)
async def api_requests(request: Request, user_input: str = Form(...)):
    # 自然言語からIssue形式への変換ロジックをここに実装
    try:
        # 変換処理のロジックを実装
        issue_data = {"title": user_input, "description": "Generated from natural language"}
        return {"status": "success", "issue": issue_data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/preview/{issue_id}", response_class=HTMLResponse)
async def preview_issue(request: Request, issue_id: str):
    # プレビュー表示のロジックをここに実装
    try:
        # ここでissue_idに基づいてデータを取得
        return templates.TemplateResponse("preview.html", {"request": request, "issue_id": issue_id})
    except Exception as e:
        return templates.TemplateResponse("error.html", {"request": request, "message": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)