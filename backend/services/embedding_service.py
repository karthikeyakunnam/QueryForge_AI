from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.embeddings.mistralai import MistralAIEmbedding
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from config import EMBEDDING_PROVIDER, OPENAI_API_KEY, MISTRAL_API_KEY

def get_embedding_model():
    """Dynamically selects the appropriate embedding model based on config."""
    if EMBEDDING_PROVIDER.lower() == "openai":
        print("[INFO] Using OpenAI Embedding Model")
        return OpenAIEmbedding(api_key=OPENAI_API_KEY, model="text-embedding-ada-002")  # 1536 dimensions
    
    elif EMBEDDING_PROVIDER.lower() == "mistral":
        print("[INFO] Using Mistral Embedding Model")
        return MistralAIEmbedding(api_key=MISTRAL_API_KEY)
    
    elif EMBEDDING_PROVIDER.lower() == "llama":
        print("[INFO] Using Hugging Face Embedding Model (sentence-transformers)")
        return HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")  # ✅ 384 dimensions
    
    else:
        raise ValueError("Unsupported embedding provider. Use 'openai', 'mistral', or 'llama'.")
