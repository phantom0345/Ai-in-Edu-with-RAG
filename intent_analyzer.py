def analyze_intent(query: str):
    q = query.lower()

    if any(w in q for w in ["solve", "find", "calculate", "compute"]):
        return "procedural"

    if any(w in q for w in ["what is", "define", "meaning", "explain"]):
        return "conceptual"

    if any(w in q for w in ["visual", "graph", "video", "watch"]):
        return "video"

    return "mixed"
