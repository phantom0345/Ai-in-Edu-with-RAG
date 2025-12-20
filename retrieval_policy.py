def decide_retrieval(intent, student_state):
    """
    Returns retrieval policy:
    - layers
    - difficulty
    - top_k
    """

    # Default policy
    layers = ["conceptual", "procedural"]
    difficulty = ["easy", "medium"]
    top_k = 6

    if intent == "procedural":
        layers = ["procedural"]
        difficulty = ["medium", "hard"]
        top_k = 5

    elif intent == "conceptual":
        layers = ["conceptual", "video"]
        difficulty = ["easy", "medium"]
        top_k = 6

    elif intent == "video":
        layers = ["video"]
        difficulty = ["easy", "medium"]
        top_k = 4

    elif intent == "mixed":
        layers = ["conceptual", "procedural", "video"]
        difficulty = ["easy", "medium"]
        top_k = 8

    # 🔮 Future hook (DO NOT REMOVE)
    # if student_state["mastery"].get("limits", 1) < 0.5:
    #     layers = ["conceptual", "video"]
    #     difficulty = ["easy"]

    return layers, difficulty, top_k
