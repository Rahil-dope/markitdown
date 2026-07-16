# MarkItDown Web UI

A lightweight, local-only single-page web interface for converting files to Markdown using the local `markitdown` library.

## Features
- **Local-only**: No external APIs, third-party clouds, or database calls. Your files stay private and local.
- **Drag-and-Drop or Upload**: Drag files directly into the web interface or browse files.
- **Instant Preview**: View the converted Markdown side-by-side:
  - **Rendered HTML**: Styled view of the parsed document structure (tables, lists, headers, code blocks).
  - **Raw Markdown**: Monospace text representation for direct inspection.
- **Action Buttons**: Download the `.md` file or copy the raw markdown text to your clipboard.
- **Robust Error Handling**: Real-time validation and clear errors for conversion failures or empty file uploads.

---

## Quick Start

### 1. Set Up Your Environment
Ensure you are in the project's root folder and activate your virtual environment:

**Windows (PowerShell/CMD):**
```powershell
.venv\Scripts\activate
```

**macOS / Linux:**
```bash
source .venv/bin/activate
```

### 2. Install Web UI Dependencies
Install FastAPI and its required server packages:
```bash
pip install -r requirements.txt
```

### 3. Run the Web Server
Launch the application:
```bash
python app.py
```

### 4. Access the App
Open your web browser and navigate to:
```
http://127.0.0.1:8000
```

---

## File Structure
The Web UI is organized as follows:
- [app.py](file:///d:/WORK/Coding/markitdown/app.py) - FastAPI server application code.
- [requirements.txt](file:///d:/WORK/Coding/markitdown/requirements.txt) - Backend python library requirements.
- [templates/index.html](file:///d:/WORK/Coding/markitdown/templates/index.html) - HTML layout structure.
- [static/css/style.css](file:///d:/WORK/Coding/markitdown/static/css/style.css) - Custom responsive UI styles.
- [static/js/main.js](file:///d:/WORK/Coding/markitdown/static/js/main.js) - Drag-and-drop actions, AJAX fetch endpoint, clipboard copy, and download trigger.
- [static/js/marked.min.js](file:///d:/WORK/Coding/markitdown/static/js/marked.min.js) - Bundled markdown parser library for offline preview.
