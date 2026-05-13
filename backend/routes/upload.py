import asyncio

from fastapi import APIRouter, File, HTTPException, UploadFile

from models.document import UploadResponse
from services.document_store import document_store
from services.pdf_processor import process_pdf
from services.vector_store import upsert_chunks_async

router = APIRouter()

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="PDF exceeds the 25MB upload limit.")
        if not content.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Uploaded file does not appear to be a valid PDF.")

        from io import BytesIO

        document_id, safe_file_name, pages, chunks = await asyncio.to_thread(
            process_pdf, file.filename, BytesIO(content)
        )
        if not chunks:
            raise HTTPException(status_code=400, detail="No text chunks extracted from PDF.")

        document_store.save_document(document_id, safe_file_name, pages, chunks)
        await upsert_chunks_async(chunks)

        return UploadResponse(
            file_name=safe_file_name,
            document_id=document_id,
            num_chunks=len(chunks),
            pages=pages,
            message="File processed successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF ingestion failed: {exc}") from exc
