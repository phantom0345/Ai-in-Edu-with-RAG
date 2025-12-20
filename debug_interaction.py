import torch
import faiss
import numpy as np

print("Imports successful")
try:
    x = torch.rand(5, 5)
    print("Torch tensor created")
    
    d = 5
    index = faiss.IndexFlatIP(d)
    print("FAISS index created")
    
    data = x.numpy().astype('float32')
    index.add(data)
    print("Added torch data (via numpy) to FAISS")
except Exception as e:
    print(f"Interaction failed: {e}")
