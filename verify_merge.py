import json

def verify_data():
    output_file = '/Users/agent005/Desktop/iit project/RAG_Corpus/merged_dataset.json'
    
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"Total items: {len(data)}")
        
        if len(data) == 0:
            print("Error: Dataset is empty.")
            return

        # Check first and last item for schema consistency
        samples = [data[0], data[-1]]
        
        # Also try to find a video item to check metadata
        video_item = next((item for item in data if item.get('layer') == 'video'), None)
        if video_item:
            samples.append(video_item)
            
        for i, item in enumerate(samples):
            print(f"\nSample {i+1}:")
            print(f"ID: {item.get('id')}")
            print(f"Type: {item.get('content_type')}")
            print(f"Topic: {item.get('topic')}")
            print(f"Metadata keys: {list(item.get('metadata', {}).keys())}")
            
            # Check ID format
            if not item.get('id', '').startswith('calc_'):
                print(f"Error: Invalid ID format in sample {i+1}")

        # Check for duplicates
        ids = [item['id'] for item in data]
        if len(ids) != len(set(ids)):
            print("Error: Duplicate IDs found.")
        else:
            print("\nAll IDs are unique.")

    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    verify_data()
