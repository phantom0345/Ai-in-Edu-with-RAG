"""
Pre-generate quizzes for all topics and cache them.

This script generates quizzes for all topic/subtopic combinations
and saves them to a cache file for instant retrieval.
"""

import asyncio
import json
import os
from server import call_ollama, search, SearchRequest

# Path to cache
CACHE_DIR = os.path.dirname(__file__)
QUIZ_CACHE_FILE = os.path.join(CACHE_DIR, "quiz_cache.json")

# Topics to generate quizzes for
CALCULUS_TOPICS = {
    "Limits": ["Basic Limit Concept", "Limit Laws", "Continuity", "Infinite Limits"],
    "Derivatives": ["Definition of Derivative", "Derivative Rules", "Chain Rule", "Implicit Differentiation"],
    "Integration": ["Antiderivatives", "Definite Integrals", "Substitution", "Integration by Parts"],
    "Applications": ["Optimization", "Related Rates", "Area Between Curves", "Volume of Revolution"],
    "Series": ["Sequences", "Geometric Series", "Convergence Tests", "Power Series"]
}

async def generate_quiz_for_topic(topic: str, subtopic: str, num_questions: int = 5, difficulty: str = "Medium"):
    """Generate a single quiz and return it."""
    try:
        print(f"  Generating quiz for {topic} - {subtopic}...")
        
        # 1. RAG Search
        search_query = f"{topic} {subtopic} practice problems quiz"
        search_res = search(SearchRequest(query=search_query, limit=10))
        context_docs = search_res['results']
        context_str = "\n".join([f"- {d.get('content', '')}" for d in context_docs])

        # 2. Generate Quiz JSON
        prompt = f"""
        Create a {num_questions}-question multiple choice quiz on '{topic} - {subtopic}'.
        Difficulty: {difficulty}.
        
        Context material:
        {context_str}

        Output STRICTLY valid JSON in this format:
        [
            {{
                "id": 1,
                "question": "Question text here?",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correctAnswer": "Option text matching one of the options",
                "explanation": "Brief explanation of why"
            }}
        ]
        Do not include markdown formatting (like ```json), just the raw JSON string.
        """
        
        response_text = await call_ollama(prompt)
        # Clean response if it contains markdown
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        # Format RAG sources
        rag_sources = [{
            'id': d.get('id', str(i)),
            'topic': d.get('topic', ''),
            'subtopic': d.get('subtopic', ''),
            'content': d.get('content', ''),
            'content_type': d.get('content_type', 'explanation'),
            'score': d.get('score', 0),
            'source': d.get('source', 'Unknown')
        } for i, d in enumerate(context_docs[:10])]
        
        return {
            "quiz": json.loads(response_text),
            "rag_sources": rag_sources
        }
    except Exception as e:
        print(f"    ERROR: Failed to generate quiz for {topic} - {subtopic}: {e}")
        return None

async def pre_generate_all_quizzes():
    """Pre-generate quizzes for all topics and save to cache."""
    cache = {}
    
    # Load existing cache if it exists
    if os.path.exists(QUIZ_CACHE_FILE):
        try:
            with open(QUIZ_CACHE_FILE, 'r') as f:
                cache = json.load(f)
            print(f"Loaded existing cache with {len(cache)} quizzes.")
        except:
            print("Starting with empty cache.")
    
    total_topics = sum(len(subtopics) for subtopics in CALCULUS_TOPICS.values())
    current = 0
    
    print(f"\nGenerating quizzes for {total_topics} topic/subtopic combinations...\n")
    
    for topic, subtopics in CALCULUS_TOPICS.items():
        print(f"\n📚 Topic: {topic}")
        for subtopic in subtopics:
            current += 1
            cache_key = f"{topic}|{subtopic}|Medium"
            
            # Skip if already in cache
            if cache_key in cache:
                print(f"  [{current}/{total_topics}] ✅ Already cached: {subtopic}")
                continue
            
            print(f"  [{current}/{total_topics}] ⏳ Generating: {subtopic}")
            quiz_data = await generate_quiz_for_topic(topic, subtopic)
            
            if quiz_data:
                cache[cache_key] = quiz_data
                print(f"  [{current}/{total_topics}] ✅ Completed: {subtopic}")
                
                # Save after each successful generation (in case of crashes)
                with open(QUIZ_CACHE_FILE, 'w') as f:
                    json.dump(cache, f, indent=2)
            else:
                print(f"  [{current}/{total_topics}] ❌ Failed: {subtopic}")
    
    print(f"\n✅ Cache generation complete! Saved {len(cache)} quizzes to {QUIZ_CACHE_FILE}")

if __name__ == "__main__":
    print("=" * 60)
    print("Quiz Cache Generator")
    print("=" * 60)
    asyncio.run(pre_generate_all_quizzes())
