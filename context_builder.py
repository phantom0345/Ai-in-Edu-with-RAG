def build_context(retrieved_items):
    context_blocks = []

    for item in retrieved_items:
        # Default empty if key missing
        layer = item.get('layer', 'unknown')
        subtopic = item.get('subtopic', 'unknown')
        difficulty = item.get('difficulty', 'unknown')
        content = item.get('content', '')
        
        # If content is None (e.g. video), use description or other metadata
        if content is None:
            title = item.get('metadata', {}).get('title', '')
            url = item.get('metadata', {}).get('url', '')
            content = f"Video Title: {title}\nURL: {url}"

        block = f"""
[LAYER: {layer}]
[SUBTOPIC: {subtopic}]
[DIFFICULTY: {difficulty}]

{content}
"""
        context_blocks.append(block.strip())

    return "\n\n---\n\n".join(context_blocks)
