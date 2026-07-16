# Plan: Web-Based UI for MarkItDown

## TL;DR
Create a web application where users upload files (PDF, DOCX, images, HTML) and get markdown conversion. The backend (FastAPI + Python) will integrate with the existing markitdown library. The frontend (React + TypeScript + Vite) will provide a clean upload interface, display converted markdown, and allow copying/downloading. Both run locally on localhost during development.

## Steps

### Phase 1: Backend Setup (FastAPI Integration)

1. **Create new FastAPI web server package** at `packages/markitdown-web/`
   - Set up pyproject.toml with dependencies: FastAPI, uvicorn, python-multipart, aiofiles, pydantic
   - Create standard Python package structure: `src/markitdown_web/`
   - *Parallel with step 2*

2. **Create main FastAPI app** ([src/markitdown_web/app.py](src/markitdown_web/app.py))
   - Initialize FastAPI instance with CORS middleware (allow localhost:3000 for dev)
   - Create `/convert` POST endpoint accepting multipart file upload
   - Endpoint logic:
     - Accept file upload with optional MIME type detection
     - Call `MarkItDown().convert_stream()` or `convert_local()` to process
     - Return JSON: `{ markdown: string, title?: string, error?: string }`
   - Error handling for unsupported formats, file size limits, processing errors
   - *Depends on step 1*

3. **Create validation & utility layer** ([src/markitdown_web/converter.py](src/markitdown_web/converter.py))
   - Wrapper function `convert_uploaded_file(file_path, mime_type)` that:
     - Validates file against supported format whitelist (PDF, DOCX, PPTX, images, HTML, CSV, JSON, XML, TXT)
     - Creates MarkItDown instance and processes
     - Returns DocumentConverterResult or raises structured exception
   - Add logging and metrics (file type, conversion time)
   - *Depends on step 1*

4. **Add CLI entry point** to run dev server locally
   - Entry: `markitdown-web --dev` or `markitdown-web-dev`
   - Command: `uvicorn markitdown_web.app:app --reload --host 127.0.0.1 --port 8000`
   - *Depends on step 2*

### Phase 2: Frontend Setup (React + TypeScript + Vite)

5. **Initialize Vite React project** at `packages/markitdown-web/frontend/`
   - Run `npm create vite@latest frontend -- --template react-ts`
   - Install dependencies: axios (for API calls), react-hot-toast (notifications)
   - Dev server will run on `localhost:5173` (Vite default)
   - *Parallel with Phase 1*

6. **Create page structure and components**
   - Main page: [frontend/src/pages/Converter.tsx](frontend/src/pages/Converter.tsx)
   - Components:
     - `FileUploader.tsx` - File input + drag-drop area (optional)
     - `MarkdownViewer.tsx` - Display converted MD in code block
     - `ActionButtons.tsx` - Copy & Download buttons
   - *Depends on step 5*

7. **Implement file upload logic** ([frontend/src/services/api.ts](frontend/src/services/api.ts))
   - Create API service with `uploadFile(file): Promise<{ markdown, title }>`
   - Handle loading states, error messages
   - Post to `http://localhost:8000/convert` (API endpoint)
   - *Depends on step 6*

8. **Implement copy & download**
   - Copy button: use `navigator.clipboard.writeText(markdown)` + toast notification
   - Download button: create Blob, trigger browser download as `converted.md`
   - Use `react-hot-toast` for user feedback
   - *Depends on step 6*

### Phase 3: Integration & Testing

9. **Connect frontend to backend** (*depends on steps 2, 7*)
   - Ensure CORS headers in FastAPI allow `localhost:5173`
   - Test upload → conversion → display → copy/download flow
   - Verify error handling (invalid files, network issues)

10. **Add supported format indicator** (*parallel with step 9*)
    - Display on UI which formats are currently supported
    - Update backend docs with format matrix and file size limits

11. **Create run scripts** for easy local development (*depends on steps 4, 5*)
    - `run-dev.sh` or `run-dev.bat` that starts both servers in parallel
    - Instructions in [packages/markitdown-web/README.md](packages/markitdown-web/README.md)

12. **Basic testing** (*depends on step 9*)
    - Manual testing: upload sample PDF, DOCX, image files
    - Verify correct MD output and copy/download functionality
    - Test error cases: unsupported files, connection errors
    - Unit tests for API validation layer (step 3)

## Relevant Files

**To Create:**
- `packages/markitdown-web/pyproject.toml` — Backend dependencies (FastAPI, uvicorn, python-multipart, aiofiles)
- `packages/markitdown-web/src/markitdown_web/__init__.py` — Package init
- `packages/markitdown-web/src/markitdown_web/app.py` — FastAPI app with `/convert` endpoint
- `packages/markitdown-web/src/markitdown_web/converter.py` — Wrapper around MarkItDown library
- `packages/markitdown-web/src/markitdown_web/__main__.py` — CLI entry point
- `packages/markitdown-web/frontend/` — React+Vite frontend (via `npm create vite`)
- `packages/markitdown-web/frontend/src/services/api.ts` — API client
- `packages/markitdown-web/frontend/src/pages/Converter.tsx` — Main UI component
- `packages/markitdown-web/frontend/src/components/FileUploader.tsx` — Upload component
- `packages/markitdown-web/frontend/src/components/MarkdownViewer.tsx` — Display component
- `packages/markitdown-web/frontend/src/components/ActionButtons.tsx` — Copy/Download component
- `packages/markitdown-web/README.md` — Instructions for running and building

**To Reuse/Reference:**
- `packages/markitdown/src/markitdown/_markitdown.py` — Core MarkItDown class ([MarkItDown.convert_stream()](packages/markitdown/src/markitdown/_markitdown.py)) and [MarkItDown.convert_local()](packages/markitdown/src/markitdown/_markitdown.py)
- `packages/markitdown/src/markitdown/__init__.py` — Public API (MarkItDown class, DocumentConverterResult type)

## Verification

1. **Backend verification**
   - Start FastAPI server: `python -m markitdown_web --dev` on `localhost:8000`
   - Test `/convert` endpoint with curl: `curl -F "file=@sample.pdf" http://localhost:8000/convert`
   - Verify JSON response has `{ markdown: "...", title?: "..." }` structure
   - Test with each supported format: PDF, DOCX, image (JPG), HTML

2. **Frontend verification**
   - Start Vite dev server: `cd frontend && npm run dev` on `localhost:5173`
   - Upload a test file → verify markdown displays in viewer
   - Click "Copy" → verify clipboard has markdown + toast notification
   - Click "Download" → verify file downloads as `converted.md`

3. **Integration verification**
   - Both servers running locally
   - Complete upload → conversion → copy/download workflow
   - Test error cases: upload unsupported format → display error message
   - Network error resilience: connection refused → graceful error UI

4. **Cross-browser test** (Chrome, Firefox, Edge)
   - File upload functionality
   - Copy-to-clipboard behavior
   - Download file naming/location

## Decisions

- **Supported formats (Phase 1 scope):** PDF, DOCX, PPTX, images (JPG/PNG), HTML, CSV, JSON, XML, TXT — chosen as most common LLM-relevant formats
- **No authentication:** Initial version is localhost-only for development; can add auth later if cloud-deployed
- **No history/persistence:** Files are converted in-memory and discarded; no database required for MVP
- **File size limits:** Will set reasonable defaults (e.g., 100MB) configurable via env var
- **Backend library integration:** Use markitdown as Python package (no subprocess calls) for better control and performance
- **API response format:** Simple JSON with `markdown` + optional `title` fields (extensible for future metadata)

## Further Considerations

1. **Optional: Drag-and-drop file upload**
   - Enhance UX with drag-drop area in FileUploader component
   - Requires: HTML5 drag-drop events (straightforward with React)
   - **Recommendation:** Add in Phase 2 (step 6) if time permits; not blocking initial release

2. **Optional: Progress indicators for large files**
   - Show upload progress bar during conversion (especially for large PDFs)
   - Requires: Using `UploadProgress` event in axios + React state
   - **Recommendation:** Add after MVP if file processing times are slow (>5 seconds typical)

3. **Optional: Multiple file batch upload**
   - Allow uploading 5+ files at once, return ZIP of all markdown files
   - Requires: Queue processing logic, ZIP generation on backend
   - **Recommendation:** Defer to Phase 2; scope creep for initial version
