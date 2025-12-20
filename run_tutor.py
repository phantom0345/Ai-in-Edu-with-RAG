from adaptive_retriever import retrieve
from context_builder import build_context
from prompt_templates import tutor_prompt
from llm_engine import generate_response

def ask_tutor(query, user_id=None):
    print(f"DEBUG: Retrieving context for query: '{query}'...")
    retrieved = retrieve(query, user_id)
    print(f"DEBUG: Retrieved {len(retrieved)} items.")
    
    context = build_context(retrieved)
    # print(f"DEBUG: Context built with {len(context)} characters.")
    
    prompt = tutor_prompt(query, context)
    # print(f"DEBUG: Prompt generated.")
    
    print("DEBUG: Calling LLM (or mock)...")
    answer = generate_response(prompt)
    
    return answer

if __name__ == "__main__":
    # Test query
    q = "How do I check continuity at a point?"
    print("\nUSER:", q)
    response = ask_tutor(q)
    print("\nTUTOR (Response):")
    print(response)
