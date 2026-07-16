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

# ---------------------------------------------------------------------------
# Local OCR fallback for scanned / image-only PDFs
# Uses PyMuPDF (fitz) to render pages → Pillow images → pytesseract OCR
# No API key needed — runs entirely offline.
# ---------------------------------------------------------------------------
def _has_tesseract() -> bool:
    """Check if Tesseract OCR binary is available on the system."""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False

def _ocr_pdf_locally(file_path: str) -> str:
    """
    Render each page of a PDF as an image and run Tesseract OCR.
    Returns the extracted markdown text.
    """
    import fitz  # PyMuPDF
    import pytesseract
    from PIL import Image
    import io

    doc = fitz.open(file_path)
    markdown_parts = []

    for page_num in range(doc.page_count):
        page = doc[page_num]
        # Render at 300 DPI for good OCR accuracy
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes))

        text = pytesseract.image_to_string(img).strip()
        if text:
            markdown_parts.append(f"## Page {page_num + 1}\n\n{text}")
        else:
            markdown_parts.append(f"## Page {page_num + 1}\n\n*[No text could be extracted from this page]*")

    doc.close()
    return "\n\n".join(markdown_parts)


TESSERACT_AVAILABLE = _has_tesseract()
print(f"[MarkItDown UI] Tesseract OCR available: {TESSERACT_AVAILABLE}")


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

        # 3. Convert the file using MarkItDown
        result = markitdown.convert(temp_file_path)
        markdown_content = result.markdown if result.markdown else ""
        
        md_len = len(markdown_content.strip())
        print(f"[{filename}] Conversion complete. Markdown length: {md_len} characters.")
        
        # 4. If text extraction returned nothing and this is a PDF, try local OCR
        if md_len == 0 and ext.lower() == ".pdf":
            if TESSERACT_AVAILABLE:
                print(f"[{filename}] Text extraction empty — running local Tesseract OCR...")
                markdown_content = _ocr_pdf_locally(temp_file_path)
                md_len = len(markdown_content.strip())
                print(f"[{filename}] OCR complete. Markdown length: {md_len} characters.")
            else:
                print(f"[{filename}] Text extraction empty and Tesseract OCR not available.")

        # 5. Generate suggested output filename
        base_name, _ = os.path.splitext(filename)
        output_filename = f"{base_name}.md"

        return {
            "success": True,
            "filename": filename,
            "output_filename": output_filename,
            "markdown": markdown_content,
            "ocr_used": md_len > 0 and ext.lower() == ".pdf" and TESSERACT_AVAILABLE
        }

    except Exception as e:
        # Return clear error message
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": f"Failed to convert file: {str(e)}"}
        )
    finally:
        # 6. Clean up temporary files, ensuring they are always deleted
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as cleanup_err:
                print(f"Error removing temp file {temp_file_path}: {cleanup_err}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
