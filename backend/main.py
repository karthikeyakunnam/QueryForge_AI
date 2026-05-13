from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import upload, query, list_documents, evaluation
import uvicorn

from config import PINECONE_CLOUD, FRONTEND_URL, ALLOWED_ORIGINS

# Initialize FastAPI app
app = FastAPI(
    title="PDF RAG Chatbot API",
    description="An API for a PDF-based Retrieval-Augmented Generation chatbot using FastAPI, OpenAI, and Pinecone.",
    version="1.0.0"
)

# CORS Configuration (Allow frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(list_documents.router, prefix="/api", tags=["Documents"])
app.include_router(evaluation.router, prefix="/api", tags=["Evaluation"])

# Root endpoint
@app.get("/")
async def root():
    return {"message": "PDF RAG Chatbot API is running"}

# Run the server
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
