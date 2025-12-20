import faiss
import numpy as np
import json
from sentence_transformers import SentenceTransformer

# ------------------
# CONFIG
# ------------------
INDEX_PATH = "RAG_Corpus/faiss_index.bin"
META_PATH = "RAG_Corpus/faiss_metadata.json"
MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"

# ------------------
# LOAD RESOURCES
# ------------------
print(f"Loading index from {INDEX_PATH}...")
index = faiss.read_index(INDEX_PATH)
print(f"Index size: {index.ntotal}")

with open(META_PATH, "r", encoding="utf-8") as f:
    metadata = json.load(f)

# ------------------
# GENERATE QUERY EMBEDDING
# ------------------
# Note: Since we are just encoding one query, we can use SentenceTransformer here.
# If it crashes again, we might need a separate query generation script.
# But usually importing faiss THEN torch sometimes works, or vice versa?
# Actually, let's stick to the safe path: use sentence-transformers just for query,
# but import FAISS *before* or *after* carefully.
# If `debug_interaction.py` worked, maybe order matters?
# debug_interaction.py imported torch THEN faiss.
# Let's try importing torch then faiss.

print(f"Loading model {MODEL_NAME}...")
model = SentenceTransformer(MODEL_NAME)

query = "How do I check continuity at a point?"
print(f"Query: {query}")

q_vec = model.encode([query], normalize_embeddings=True).astype("float32")

# ------------------
# SEARCH
# ------------------
k = 5
D, I = index.search(q_vec, k)

print("\nSearch Results:")
for i, idx in enumerate(I[0]):
    item = metadata[idx]
    print(f"{i+1}. [{item['id']}] {item['subtopic']} ({item['layer']})")
    # print(f"   Score: {D[0][i]}")
