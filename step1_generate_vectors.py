import json
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
EMBEDDINGS_PATH = "RAG_Corpus/embeddings.npy"
META_PATH = "RAG_Corpus/faiss_metadata.json"
MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"
BATCH_SIZE = 32

# ------------------
# LOAD DATA
# ------------------
print(f"Loading corpus from {CORPUS_PATH}...")
with open(CORPUS_PATH, "r", encoding="utf-8") as f:
    corpus = json.load(f)
print(f"Loaded {len(corpus)} corpus items")

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
        # Video: embed title + subtopic
        subtopic = item.get('subtopic', '')
        title = item.get('metadata', {}).get('title', '')
        text = f"{subtopic} - {title}"

    texts.append(text)
    metadata.append(item)

# ------------------
# LOAD MODEL
# ------------------
print(f"Loading model {MODEL_NAME}...")
device = torch.device("cpu") # Force CPU to be safe
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME).to(device)
model.eval()

# ------------------
# GENERATE EMBEDDINGS
# ------------------
print("Generating embeddings...")

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0] 
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

all_embeddings = []
total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE

for i in range(0, len(texts), BATCH_SIZE):
    if (i // BATCH_SIZE) % 5 == 0:
        print(f"Processing batch {i // BATCH_SIZE + 1}/{total_batches}")
        
    batch_texts = texts[i : i + BATCH_SIZE]
    
    # Tokenize
    encoded_input = tokenizer(batch_texts, padding=True, truncation=True, return_tensors='pt').to(device)
    
    # Compute token embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)
    
    # Perform pooling
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    
    # Normalize embeddings
    sentence_embeddings = torch.nn.functional.normalize(sentence_embeddings, p=2, dim=1)
    
    all_embeddings.append(sentence_embeddings.cpu().numpy())

# Concatenate all batches
embeddings = np.concatenate(all_embeddings, axis=0).astype("float32")
print("Embeddings shape:", embeddings.shape)

# ------------------
# SAVE INTERMEDIATE
# ------------------
print(f"Saving embeddings to {EMBEDDINGS_PATH}...")
np.save(EMBEDDINGS_PATH, embeddings)

print(f"Saving metadata to {META_PATH}...")
with open(META_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("✅ Step 1 complete")
