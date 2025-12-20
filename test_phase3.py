from adaptive_retriever import retrieve

queries = [
    "How do I check continuity at a point?",
    "Solve an exponential growth problem",
    "Explain the chain rule",
    "Show me a video for limits"
]

for q in queries:
    print("\n" + "="*50)
    print("QUERY:", q)
    print("="*50)
    results = retrieve(q)

    for r in results:
        print(
            f"- {r['id']} | {r.get('layer', 'N/A')} | {r.get('difficulty', 'N/A')} | {r.get('subtopic', '')}"
        )
