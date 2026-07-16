import os
import shutil
import tempfile
import uvicorn
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from markitdown import MarkItDown

app = FastAPI(title="MarkItDown Web UI")

# Initialize local MarkItDown
markitdown = MarkItDown()

# Mount static and templates folders
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")

@app.post("/api/convert")
async def convert_file(file: UploadFile = File(...)):
    # 1. Validation for empty uploads
    if not file or not file.filename:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "No file was selected or uploaded."}
        )
        
    filename = file.filename
    _, ext = os.path.splitext(filename)
    
    print(f"--- Conversion Request for '{filename}' ---")
    # Check if the file is empty
    size = "unknown"
    try:
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)
        print(f"[{filename}] Upload size check: {size} bytes.")
        if size == 0:
            print(f"[{filename}] Rejected: File is empty (0 bytes).")
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"The uploaded file '{filename}' is empty."}
            )
    except Exception as e:
        print(f"[{filename}] Size check failed: {e}")
        # Fall back if seek is not supported
        pass

    temp_file_path = None
    try:
        # 2. Save the uploaded file to a temporary file preserving its original extension.
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        temp_size = os.path.getsize(temp_file_path)
        print(f"[{filename}] Temp file created: {temp_file_path} ({temp_size} bytes).")

        # 3. Convert the file using local markitdown
        result = markitdown.convert(temp_file_path)
        markdown_content = result.markdown
        
        md_len = len(markdown_content) if markdown_content else 0
        print(f"[{filename}] Conversion complete. Markdown length: {md_len} characters.")
        
        if markdown_content is None:
            markdown_content = ""
        # 4. Generate suggested output filename
        base_name, _ = os.path.splitext(filename)
        output_filename = f"{base_name}.md"

        return {
            "success": True,
            "filename": filename,
            "output_filename": output_filename,
            "markdown": markdown_content
        }

    except Exception as e:
        # Return clear error message
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": f"Failed to convert file: {str(e)}"}
        )
    finally:
        # 5. Clean up temporary files, ensuring they are always deleted
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as cleanup_err:
                print(f"Error removing temp file {temp_file_path}: {cleanup_err}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
