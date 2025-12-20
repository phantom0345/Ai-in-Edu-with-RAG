import faiss
import numpy as np
import json
import os

# ------------------
# CONFIG
# ------------------
EMBEDDINGS_PATH = "RAG_Corpus/embeddings.npy"
INDEX_PATH = "RAG_Corpus/faiss_index.bin"
META_PATH = "RAG_Corpus/faiss_metadata.json"

# ------------------
# LOAD EMBEDDINGS
# ------------------
print(f"Loading embeddings from {EMBEDDINGS_PATH}...")
if not os.path.exists(EMBEDDINGS_PATH):
    print("Error: Embeddings file not found. Run step1_generate_vectors.py first.")
    exit(1)

embeddings = np.load(EMBEDDINGS_PATH)
print("Embeddings shape:", embeddings.shape)

# ------------------
# BUILD FAISS INDEX
# ------------------
print("Building FAISS index...")
dim = embeddings.shape[1]
index = faiss.IndexFlatIP(dim)  # cosine similarity
index.add(embeddings)

print(f"FAISS index contains {index.ntotal} vectors")

# ------------------
# SAVE INDEX
# ------------------
print(f"Saving index to {INDEX_PATH}...")
faiss.write_index(index, INDEX_PATH)

print("✅ Step 2 complete:")
print(f" - FAISS index saved to {INDEX_PATH}")
print(f" - Metadata saved to {META_PATH}")
