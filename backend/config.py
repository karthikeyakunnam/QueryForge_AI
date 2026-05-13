import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# LLM Provider (OpenAI or Mistral)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mistral")

# Embedding Provider
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "llama")

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# Models
OPENAI_MODEL = os.getenv("OPENAI_MODEL")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL")


# Pinecone Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_CLOUD = os.getenv("PINECONE_CLOUD")
PINECONE_ENV = os.getenv("PINECONE_REGION")  # Example: "us-east1-gcp"
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
VECTOR_DB_DIMENSION = int(os.getenv("VECTOR_DB_DIMENSION", "384"))

# File Storage Directory
UPLOAD_DIR = "uploads"

# Chunking Parameters
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "900"))
OVERLAP = int(os.getenv("CHUNK_OVERLAP", "120"))

# Retrieval
DENSE_WEIGHT = float(os.getenv("DENSE_WEIGHT", "0.55"))
KEYWORD_WEIGHT = float(os.getenv("KEYWORD_WEIGHT", "0.30"))
RERANK_WEIGHT = float(os.getenv("RERANK_WEIGHT", "0.15"))
MIN_RETRIEVAL_CONFIDENCE = float(os.getenv("MIN_RETRIEVAL_CONFIDENCE", "0.18"))

# FastAPI Settings
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://192.168.1.164:3000",
    ).split(",")
    if origin.strip()
]
# Frontend URL for CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")  # Default to local frontend
