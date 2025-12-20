import faiss
import numpy as np

print(f"FAISS version: {faiss.__version__}")
try:
    d = 64
    nb = 100
    nq = 10
    xb = np.random.random((nb, d)).astype('float32')
    xq = np.random.random((nq, d)).astype('float32')

    index = faiss.IndexFlatIP(d)
    index.add(xb)
    print("Add successful")
    
    D, I = index.search(xq, 5)
    print("Search successful")
    print(I)
except Exception as e:
    print(f"FAISS failed: {e}")
