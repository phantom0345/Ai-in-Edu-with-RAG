import json
import faiss
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel
import os

# Fix for potential tokenizers deadlock/crash
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ------------------
# CONFIG
# ------------------
CORPUS_PATH = "RAG_Corpus/merged_dataset.json" 
INDEX_PATH = "RAG_Corpus/faiss_index.bin"
META_PATH = "RAG_Corpus/faiss_metadata.json"
MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"
BATCH_SIZE = 32

# ------------------
# LOAD DATA
# ------------------
print(f"Loading corpus from {CORPUS_PATH}...")
try:
    with open(CORPUS_PATH, "r", encoding="utf-8") as f:
        corpus = json.load(f)
    print(f"Loaded {len(corpus)} corpus items")
except FileNotFoundError:
    print(f"Error: Corpus file not found at {CORPUS_PATH}")
    exit(1)

# ------------------
# PREPARE TEXTS
# ------------------
texts = []
metadata = []

print("Preparing text for embedding...")
for item in corpus:
    if item.get("content") is not None:
        text = item["content"]
    else:
        subtopic = item.get('subtopic', '')
        title = item.get('metadata', {}).get('title', '')
        text = f"{subtopic} - {title}"

    texts.append(text)
    metadata.append(item)

# ------------------
# LOAD MODEL
# ------------------
print(f"Loading model {MODEL_NAME}...")
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModel.from_pretrained(MODEL_NAME)
    model.eval() # Set to eval mode
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

# ------------------
# GENERATE EMBEDDINGS
# ------------------
print("Generating embeddings...")

# Mean Pooling - Take attention mask into account for correct averaging
def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0] 
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

all_embeddings = []

total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
print(f"Total batches: {total_batches}")

for i in range(0, len(texts), BATCH_SIZE):
    batch_idx = i // BATCH_SIZE
    if batch_idx % 5 == 0:
        print(f"Processing batch {batch_idx + 1}/{total_batches}")

    batch_texts = texts[i : i + BATCH_SIZE]
    
    # Tokenize
    encoded_input = tokenizer(batch_texts, padding=True, truncation=True, return_tensors='pt')
    
    # Compute token embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)
    
    # Perform pooling
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    
    # Normalize embeddings
    sentence_embeddings = torch.nn.functional.normalize(sentence_embeddings, p=2, dim=1)
    
    all_embeddings.append(sentence_embeddings.numpy())

# Concatenate all batches
embeddings = np.concatenate(all_embeddings, axis=0).astype("float32")
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
# SAVE INDEX + METADATA
# ------------------
print(f"Saving index to {INDEX_PATH}...")
faiss.write_index(index, INDEX_PATH)

print(f"Saving metadata to {META_PATH}...")
with open(META_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("✅ Phase 2 complete:")
print(f" - FAISS index saved to {INDEX_PATH}")
print(f" - Metadata saved to {META_PATH}")
