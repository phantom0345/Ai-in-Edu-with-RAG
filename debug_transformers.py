from transformers import AutoTokenizer, AutoModel
import torch
import os

os.environ["TOKENIZERS_PARALLELISM"] = "false"

model_name = "sentence-transformers/all-mpnet-base-v2"

print("Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
print("Loading model...")
model = AutoModel.from_pretrained(model_name)

import json
BASE_DIR = '/Users/agent005/Desktop/iit project'
with open(f'{BASE_DIR}/RAG_Corpus/merged_dataset.json', 'r') as f:
    corpus = json.load(f)

texts = []
for item in corpus[:32]:
    if item.get("content"):
        texts.append(item["content"])
    else:
        texts.append(f"{item.get('subtopic', '')} - {item.get('metadata', {}).get('title', '')}")

sentences = texts
print(f"Processing {len(sentences)} items...")

print("Tokenizing...")
encoded_input = tokenizer(sentences, padding=True, truncation=True, return_tensors='pt')

print("Forward pass...")
with torch.no_grad():
    model_output = model(**encoded_input)

print("Pooling...")
# Mean Pooling - Take attention mask into account for correct averaging
def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0] #First element of model_output contains all token embeddings
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
print("Embeddings shape:", sentence_embeddings.shape)
print("Success!")
