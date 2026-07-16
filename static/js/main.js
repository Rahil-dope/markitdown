document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const btnRemoveFile = document.getElementById('btnRemoveFile');
    const btnConvert = document.getElementById('btnConvert');
    const loadingContainer = document.getElementById('loadingContainer');
    const errorBanner = document.getElementById('errorBanner');
    
    const tabRendered = document.getElementById('tabRendered');
    const tabRaw = document.getElementById('tabRaw');
    const paneRendered = document.getElementById('paneRendered');
    const paneRaw = document.getElementById('paneRaw');
    
    const btnCopy = document.getElementById('btnCopy');
    const btnDownload = document.getElementById('btnDownload');
    const emptyState = document.getElementById('emptyState');
    const rawMarkdownText = document.getElementById('rawMarkdownText');
    const toast = document.getElementById('toast');

    // OCR Elements
    const btnSettingsToggle = document.getElementById('btnSettingsToggle');
    const settingsContent = document.getElementById('settingsContent');
    const enableOcr = document.getElementById('enableOcr');
    const ocrFields = document.getElementById('ocrFields');
    const ocrProvider = document.getElementById('ocrProvider');
    const ocrApiKey = document.getElementById('ocrApiKey');
    const ocrModel = document.getElementById('ocrModel');
    const ocrBaseUrl = document.getElementById('ocrBaseUrl');
    const groupBaseUrl = document.getElementById('groupBaseUrl');

    // State Variables
    let selectedFile = null;
    let convertedMarkdown = "";
    let suggestedFilename = "";

    // Formatting size utility
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Show Toast notification
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // Show Error
    function showError(message) {
        errorBanner.textContent = message;
        errorBanner.style.display = 'block';
    }

    // Clear Error
    function clearError() {
        errorBanner.textContent = '';
        errorBanner.style.display = 'none';
    }

    // Set File State
    function handleFileSelection(file) {
        clearError();
        if (!file) return;

        // Basic Validation
        if (file.size === 0) {
            showError(`Error: The file "${file.name}" is empty.`);
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);
        
        fileInfo.style.display = 'flex';
        dropzone.style.display = 'none';
    }

    // Remove File State
    function resetFileSelection() {
        selectedFile = null;
        fileInput.value = '';
        fileInfo.style.display = 'none';
        dropzone.style.display = 'flex';
        clearError();
    }

    // Drag and Drop Event Listeners
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    btnRemoveFile.addEventListener('click', () => {
        resetFileSelection();
    });

    // Accordion Toggle
    btnSettingsToggle.addEventListener('click', () => {
        btnSettingsToggle.classList.toggle('active');
        settingsContent.classList.toggle('open');
    });

    // Checkbox Change
    enableOcr.addEventListener('change', () => {
        if (enableOcr.checked) {
            ocrFields.style.display = 'block';
        } else {
            ocrFields.style.display = 'none';
        }
    });

    // Provider Change
    ocrProvider.addEventListener('change', () => {
        if (ocrProvider.value === 'custom') {
            groupBaseUrl.style.display = 'flex';
        } else {
            groupBaseUrl.style.display = 'none';
        }
    });

    // Conversion Logic
    btnConvert.addEventListener('click', async () => {
        if (!selectedFile) {
            showError("No file selected for conversion.");
            return;
        }

        clearError();
        loadingContainer.style.display = 'flex';
        btnConvert.disabled = true;
        btnRemoveFile.disabled = true;

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('enable_ocr', enableOcr.checked);
        formData.append('ocr_provider', ocrProvider.value);
        formData.append('ocr_api_key', ocrApiKey.value);
        formData.append('ocr_model', ocrModel.value);
        formData.append('ocr_base_url', ocrBaseUrl.value);

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Success path
                convertedMarkdown = result.markdown;
                suggestedFilename = result.output_filename;

                // Update text container
                rawMarkdownText.value = convertedMarkdown;

                // Render markdown HTML
                if (convertedMarkdown) {
                    if (window.marked && typeof window.marked.parse === 'function') {
                        paneRendered.innerHTML = window.marked.parse(convertedMarkdown);
                    } else {
                        // Fail-safe simple line-break formatter
                        paneRendered.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHTML(convertedMarkdown)}</pre>`;
                    }
                } else {
                    // Show a descriptive visual warning if the output was completely empty
                    paneRendered.innerHTML = `
                        <div class="empty-preview-warning">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <p><strong>This document yielded no text.</strong></p>
                            <p style="font-size: 0.8rem; opacity: 0.8; max-width: 280px; margin: 0 auto;">This usually happens with scanned PDFs or image-only files.</p>
                            <p style="font-size: 0.8rem; opacity: 0.8; max-width: 280px; margin: 0.5rem auto 0 auto;">To extract text, enable <strong>OCR &amp; LLM Settings</strong>, enter an API Key, and try converting again.</p>
                        </div>
                    `;
                }

                // UI adjustments
                emptyState.style.display = 'none';
                btnCopy.disabled = false;
                btnDownload.disabled = false;
                
                // Keep panes active correctly
                if (tabRendered.classList.contains('active')) {
                    paneRendered.classList.add('active');
                    paneRaw.classList.remove('active');
                } else {
                    paneRaw.classList.add('active');
                    paneRendered.classList.remove('active');
                }

                showToast("File converted successfully!");
            } else {
                showError(result.error || "An unknown error occurred during conversion.");
            }
        } catch (error) {
            showError("Could not connect to conversion server. Please ensure the backend is running.");
            console.error("Fetch error:", error);
        } finally {
            loadingContainer.style.display = 'none';
            btnConvert.disabled = false;
            btnRemoveFile.disabled = false;
        }
    });

    // Escaping helper if marked.js is absent
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Tab Navigation
    tabRendered.addEventListener('click', () => {
        tabRendered.classList.add('active');
        tabRaw.classList.remove('active');
        
        if (convertedMarkdown) {
            paneRendered.classList.add('active');
            paneRaw.classList.remove('active');
        }
    });

    tabRaw.addEventListener('click', () => {
        tabRaw.classList.add('active');
        tabRendered.classList.remove('active');
        
        if (convertedMarkdown) {
            paneRaw.classList.add('active');
            paneRendered.classList.remove('active');
        }
    });

    // Action Controls
    btnCopy.addEventListener('click', () => {
        if (!convertedMarkdown) return;

        navigator.clipboard.writeText(convertedMarkdown)
            .then(() => showToast("Copied to clipboard!"))
            .catch(err => {
                // Fallback copying method if Clipboard API fails
                rawMarkdownText.select();
                document.execCommand('copy');
                showToast("Copied to clipboard!");
            });
    });

    btnDownload.addEventListener('click', () => {
        if (!convertedMarkdown || !suggestedFilename) return;

        const blob = new Blob([convertedMarkdown], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', suggestedFilename);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Download started!");
    });
});
