import hashlib
import os
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import BinaryIO, Iterable, List

import PyPDF2
from langchain.text_splitter import RecursiveCharacterTextSplitter

from config import CHUNK_SIZE, OVERLAP, UPLOAD_DIR


@dataclass(frozen=True)
class DocumentChunk:
    document_id: str
    file_name: str
    chunk_id: int
    text: str
    page_start: int
    page_end: int
    content_hash: str

    def to_dict(self) -> dict:
        return asdict(self)


def safe_upload_path(original_filename: str) -> Path:
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", os.path.basename(original_filename))
    if not safe_name.lower().endswith(".pdf"):
        safe_name = f"{safe_name}.pdf"
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    return Path(UPLOAD_DIR) / safe_name


def document_id_for_file(file_name: str, content: bytes) -> str:
    digest = hashlib.sha256(content).hexdigest()[:16]
    stem = Path(file_name).stem.lower()
    stem = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")[:48] or "document"
    return f"{stem}-{digest}"


def save_pdf(file_name: str, file_obj: BinaryIO) -> tuple[Path, str]:
    content = file_obj.read()
    path = safe_upload_path(file_name)
    path.write_bytes(content)
    return path, document_id_for_file(path.name, content)


def extract_pages(pdf_path: Path) -> List[dict]:
    pages: List[dict] = []
    with pdf_path.open("rb") as file:
        reader = PyPDF2.PdfReader(file)
        for index, page in enumerate(reader.pages, start=1):
            text = normalize_text(page.extract_text() or "")
            if text:
                pages.append({"page_number": index, "text": text})
    if not pages:
        raise ValueError("No extractable text found in the PDF. OCR is required for scanned PDFs.")
    return pages


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_pages(
    pages: Iterable[dict],
    document_id: str,
    file_name: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = OVERLAP,
) -> List[DocumentChunk]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )
    chunks: List[DocumentChunk] = []
    chunk_id = 0
    for page in pages:
        page_number = int(page["page_number"])
        for text in splitter.split_text(page["text"]):
            content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
            chunks.append(
                DocumentChunk(
                    document_id=document_id,
                    file_name=file_name,
                    chunk_id=chunk_id,
                    text=text,
                    page_start=page_number,
                    page_end=page_number,
                    content_hash=content_hash,
                )
            )
            chunk_id += 1
    return chunks


def process_pdf(file_name: str, file_obj: BinaryIO) -> tuple[str, str, int, List[DocumentChunk]]:
    pdf_path, document_id = save_pdf(file_name, file_obj)
    pages = extract_pages(pdf_path)
    chunks = chunk_pages(pages, document_id=document_id, file_name=pdf_path.name)
    return document_id, pdf_path.name, len(pages), chunks
