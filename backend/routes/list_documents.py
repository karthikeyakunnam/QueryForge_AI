from fastapi import APIRouter
from services.vector_store import list_documents_in_pinecone

router = APIRouter()

@router.get("/list_documents")
async def list_uploaded_documents():
    """
        Returns a list of all uploaded documents stored in Pinecone.
    """
    return {"documents": list_documents_in_pinecone()}