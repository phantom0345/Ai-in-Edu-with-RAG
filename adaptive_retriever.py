import json
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel
import os
import subprocess

from intent_analyzer import analyze_intent
from retrieval_policy import decide_retrieval
from student_state import get_student_state

# Fix for potential tokenizers deadlock/crash
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Paths
META_PATH = "RAG_Corpus/faiss_metadata.json"
MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"

# Load assets
with open(META_PATH, "r", encoding="utf-8") as f:
    metadata = json.load(f)

# Load Model (using pure transformers to avoid crashes)
device = torch.device("cpu")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME).to(device)
model.eval()

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0] 
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def encode_query(query):
    encoded_input = tokenizer([query], padding=True, truncation=True, return_tensors='pt').to(device)
    with torch.no_grad():
        model_output = model(**encoded_input)
    
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    sentence_embeddings = torch.nn.functional.normalize(sentence_embeddings, p=2, dim=1)
    return sentence_embeddings.cpu().numpy().astype("float32")

def retrieve(query, user_id=None):
    # Step 1: intent
    intent = analyze_intent(query)

    # Step 2: student state
    student_state = get_student_state(user_id)

    # Step 3: retrieval policy
    layers, difficulties, top_k = decide_retrieval(intent, student_state)

    # Step 4: vector search
    q_vec = encode_query(query)
    
    # Run FAISS in subprocess to avoid segfault
    q_vec_list = q_vec[0].tolist()
    
    try:
        cmd = [
            ".venv/bin/python3", 
            "search_index.py", 
            "20",  # fetch k=20
            json.dumps(q_vec_list)
        ]
        pool_output = subprocess.check_output(cmd, text=True)
        search_result = json.loads(pool_output)
        
        indices = search_result['indices']
        scores = search_result['scores']
        
    except subprocess.CalledProcessError as e:
        print(f"Error running search_index.py: {e}")
        return []

    results = []
    for idx, score in zip(indices, scores):
        if idx < 0 or idx >= len(metadata): continue # Safety check
        
        item = metadata[idx]

        # Apply Policy Filters
        if item.get("layer") not in layers and layers: 
            continue

        if item.get("difficulty") and item["difficulty"] not in difficulties and difficulties:
             continue

        # Add score for debugging/ranking
        item_copy = item.copy()
        item_copy['score'] = float(score)
        results.append(item_copy)

        if len(results) >= top_k:
            break

    return results
