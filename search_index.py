import faiss
import numpy as np
import sys
import json
import os

# usage: python3 search_index.py <k> <query_vector_json_string>

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 search_index.py <k> <query_vector_json_string>")
        sys.exit(1)

    k = int(sys.argv[1])
    query_vec_list = json.loads(sys.argv[2])
    query_vec = np.array([query_vec_list], dtype='float32')

    INDEX_PATH = "RAG_Corpus/faiss_index.bin"
    
    if not os.path.exists(INDEX_PATH):
        print(f"Index not found at {INDEX_PATH}")
        sys.exit(1)
        
    index = faiss.read_index(INDEX_PATH)
    D, I = index.search(query_vec, k)
    
    # Print result as JSON string to stdout
    result = {
        "indices": I[0].tolist(),
        "scores": D[0].tolist()
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main()
