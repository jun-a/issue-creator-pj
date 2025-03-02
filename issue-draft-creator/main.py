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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)