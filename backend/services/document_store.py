import json
from pathlib import Path
from threading import Lock
from typing import Iterable, List, Optional

from config import UPLOAD_DIR
from services.pdf_processor import DocumentChunk


class DocumentStore:
    def __init__(self, root: str = UPLOAD_DIR):
        self.root = Path(root) / "index"
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()

    def _document_path(self, document_id: str) -> Path:
        return self.root / f"{document_id}.jsonl"

    def _registry_path(self) -> Path:
        return self.root / "documents.json"

    def save_document(self, document_id: str, file_name: str, pages: int, chunks: Iterable[DocumentChunk]) -> None:
        chunk_list = list(chunks)
        with self._lock:
            path = self._document_path(document_id)
            with path.open("w", encoding="utf-8") as handle:
                for chunk in chunk_list:
                    handle.write(json.dumps(chunk.to_dict(), ensure_ascii=False) + "\n")

            registry = self.list_documents()
            registry = [doc for doc in registry if doc["document_id"] != document_id]
            registry.append(
                {
                    "document_id": document_id,
                    "file_name": file_name,
                    "pages": pages,
                    "chunks": len(chunk_list),
                }
            )
            self._registry_path().write_text(json.dumps(registry, indent=2), encoding="utf-8")

    def list_documents(self) -> List[dict]:
        path = self._registry_path()
        if not path.exists():
            return []
        return json.loads(path.read_text(encoding="utf-8"))

    def load_chunks(self, document_id: Optional[str] = None) -> List[dict]:
        paths = [self._document_path(document_id)] if document_id else sorted(self.root.glob("*.jsonl"))
        chunks: List[dict] = []
        for path in paths:
            if not path.exists():
                continue
            with path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if line:
                        chunks.append(json.loads(line))
        return chunks

    def load_parent_context(self, document_id: str, chunk_id: int, window: int = 1) -> str:
        chunks = self.load_chunks(document_id=document_id)
        parent_chunks = [
            chunk
            for chunk in chunks
            if chunk_id - window <= int(chunk["chunk_id"]) <= chunk_id + window
        ]
        parent_chunks.sort(key=lambda chunk: int(chunk["chunk_id"]))
        return "\n\n".join(chunk["text"] for chunk in parent_chunks)


document_store = DocumentStore()
