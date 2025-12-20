import json
import os
import glob

def normalize_data():
    base_dir = '/Users/agent005/Desktop/iit project/RAG_Corpus'
    output_file = os.path.join(base_dir, 'merged_dataset.json')
    
    # Define source directories and their file patterns
    # Using glob patterns to match json files
    sources = [
        os.path.join(base_dir, 'concepts'),
        os.path.join(base_dir, 'problems'),
        os.path.join(base_dir, 'videos')
    ]
    
    merged_data = []
    id_counter = 1
    
    # Iterate over each source directory's JSON files
    for source_dir in sources:
        if not os.path.isdir(source_dir):
            print(f"Warning: Directory not found: {source_dir}")
            continue
            
        # Get all json files in the directory
        json_files = glob.glob(os.path.join(source_dir, '*.json'))
        # Sort files to ensure stable order
        json_files.sort()
        
        for file_path in json_files:
            print(f"Processing {file_path}...")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if not isinstance(data, list):
                    print(f"Warning: File {file_path} does not contain a list of items. Skipping.")
                    continue
                
                for item in data:
                    # Generate unique ID
                    unique_id = f"calc_{id_counter:06d}"
                    id_counter += 1
                    
                    # Normalize fields
                    normalized_item = {
                        "id": unique_id,
                        "topic": item.get('topic'),
                        "subtopic": item.get('subtopic'),
                        "chapter": item.get('chapter'),
                        "layer": item.get('layer'),
                        "difficulty": item.get('difficulty'),
                        "content_type": item.get('content_type'),
                        "source": item.get('source'),
                        "content": item.get('content'),
                        "metadata": {}
                    }
                    
                    # Move extra fields to metadata
                    # Define standard fields that stay at root
                    standard_fields = {
                        'topic', 'subtopic', 'chapter', 'layer', 'difficulty', 
                        'content_type', 'source', 'content'
                    }
                    
                    # Everything else goes to metadata
                    for key, value in item.items():
                        if key not in standard_fields:
                            normalized_item['metadata'][key] = value
                            
                    # Ensure metadata is not empty if there are no extra fields? 
                    # The prompt implies we keep metadata structure.
                    # If specific fields like channel, title etc are present, they will be in metadata now.
                    
                    merged_data.append(normalized_item)
                    
            except json.JSONDecodeError:
                print(f"Error: Failed to decode JSON from {file_path}")
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

    # Write merged data to output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(merged_data, f, indent=2, ensure_ascii=False)
        print(f"Successfully wrote {len(merged_data)} items to {output_file}")
    except Exception as e:
        print(f"Error writing output file: {e}")

if __name__ == "__main__":
    normalize_data()
