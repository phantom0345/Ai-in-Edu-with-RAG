import os

def generate_response(prompt):
    """
    Mock LLM response generator for testing Phase 4 pipeline.
    Replace with actual OpenAI/LLM call when API key is available.
    """
    
    # Check for API key in environment
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[
                    {"role": "system", "content": "You are a careful math tutor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            return response.choices[0].message.content
        except ImportError:
            print("Warning: openai package not installed. Using mock response.")
        except Exception as e:
            print(f"Warning: OpenAI call failed ({e}). Using mock response.")

    # Mock response
    return f"""
[MOCK LLM RESPONSE]
Based on the context provided, here is how you check continuity at a point:

1. Check if f(c) is defined.
2. Check if limit x->c f(x) exists.
3. Check if limit equals f(c).

I also found a video "Continuity" (easy) that might help.

(End of mock response. To enable real LLM, set OPENAI_API_KEY env var and install openai package.)
"""
