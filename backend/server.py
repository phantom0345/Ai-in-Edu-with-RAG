import os
# Fix for OpenMP runtime conflict (segfault on macOS)
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
import json
import logging
import numpy as np
import faiss
import torch
import asyncio


# Fix for potential tokenizers deadlock/crash
os.environ["TOKENIZERS_PARALLELISM"] = "false"
# Additional PyTorch fixes for macOS
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from ml_engine import MLEngine
import httpx

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ClassMate AI Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
index = None
metadata = []
model = None
ml_engine = None

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(BASE_DIR, "faiss_index.bin")
META_PATH = os.path.join(BASE_DIR, "faiss_metadata.json")
MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"

# Data Models
class SearchRequest(BaseModel):
    query: str
    limit: int = 5

class ChatMsg(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMsg] = []
    user_profile: Optional[Dict[str, Any]] = None

class PredictionRequest(BaseModel):
    user_id: str
    time_taken: float
    correct: int
    attempt_count: int
    hint_count: int
    bottom_hint: int = 0
    scaffold: int = 0

class ChapterRequest(BaseModel):
    topic: str
    subtopic: str
    difficulty: str = "Medium"

class QuizRequest(BaseModel):
    topic: str
    subtopic: str
    num_questions: int = 5
    difficulty: str = "Medium"

class DiagnosticRequest(BaseModel):
    grade: str = "High School"

class HintRequest(BaseModel):
    question_text: str
    user_answer: str = ""
    topic: str
    subtopic: str

class QuizSubmissionRequest(BaseModel):
    user_id: str
    topic: str
    subtopic: str
    questions: List[Dict[str, Any]]

class UserAssessmentRequest(BaseModel):
    user_id: str
    quiz_history: List[Dict[str, Any]]
    topic_mastery: Dict[str, float]

async def call_ollama(prompt: str, model: str = "llama3.1:8b", retries: int = 3) -> str:
    """
    Calls Ollama API with retry logic.
    """
    ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                response.raise_for_status()
                result = response.json()
                return result.get("response", "")
        except Exception as e:
            logger.warning(f"Ollama API error (Attempt {attempt+1}/{retries}): {e}")
            if attempt == retries - 1:
                raise HTTPException(
                    status_code=500,
                    detail=f"Ollama API error: {str(e)}"
                )
            await asyncio.sleep(1)



@app.on_event("startup")
async def startup_event():
    global index, metadata, model, ml_engine
    
    # 0. Load ML Engine
    ml_engine = MLEngine()
    
    # 1. Load FAISS Index
    if os.path.exists(INDEX_PATH):
        logger.info(f"Loading FAISS index from {INDEX_PATH}...")
        index = faiss.read_index(INDEX_PATH)
    else:
        logger.error(f"FAISS index not found at {INDEX_PATH}")
        raise FileNotFoundError("FAISS index missing")

    # 2. Load Metadata
    if os.path.exists(META_PATH):
        logger.info(f"Loading metadata from {META_PATH}...")
        with open(META_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    else:
        logger.error(f"Metadata not found at {META_PATH}")
        raise FileNotFoundError("Metadata missing")

    # 3. Load Embedding Model
    logger.info(f"Loading embedding model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME, device="cpu")
    logger.info("Server startup complete.")

@app.post("/search")
def search(req: SearchRequest):  # Made synchronous to avoid segfault
    if not index or not model:
        raise HTTPException(status_code=503, detail="Server not initializing")
    
    try:
        # Embed query
        query_vector = model.encode([req.query], show_progress_bar=False)
        
        # Search FAISS
        D, I = index.search(query_vector, req.limit)
        
        results = []
        for i, idx in enumerate(I[0]):
            idx = int(idx)
            if idx < 0 or idx >= len(metadata):
                continue
            
            item = metadata[idx].copy()
            item['score'] = float(D[0][i])
            results.append(item)
            
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        # 1. Retrieve Context (call synchronous search)
        search_res = search(SearchRequest(query=req.message, limit=3))
        docs = search_res['results']
        
        context_str = "\n\n".join([
            f"Source: {d.get('source', 'Unknown')} ({d.get('topic', 'General')})\nContent: {d.get('content', '')}"
            for d in docs
        ])
        
        # 2. Call Ollama
        # System instruction with Profile
        profile_txt = ""
        if req.user_profile:
            profile_txt = f"""
            Student Profile:
            Grade: {req.user_profile.get('grade', 'Unknown')}
            Subject: {req.user_profile.get('subject', 'Calculus')}
            Level: {req.user_profile.get('difficultyLevel', 'Medium')}
            """
            
        system_prompt = f"""
        You are an expert calculus tutor named ClassMate.
        {profile_txt}
        
        Use the following CONTEXT to answer the user's question.
        If the context has video links, recommend them.
        If the answer is not in the context, use your general knowledge but mention that it's outside the provided materials.
        
        CONTEXT:
        {context_str}
        """
        
        # Send to Ollama
        full_prompt = f"{system_prompt}\n\nUser: {req.message}\n\nAssistant:"
        response_text = await call_ollama(full_prompt)
        
        return {"response": response_text, "context": docs}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/topic/{topic_name}")
async def get_topic_resources(topic_name: str):
    if not metadata:
        raise HTTPException(status_code=503, detail="Corpus not loaded")
    
    results = []
    topic_lower = topic_name.lower()
    
    for item in metadata:
        # Check topic or subtopic matches
        if (item.get('topic', '').lower() in topic_lower or 
            topic_lower in item.get('topic', '').lower() or
            topic_lower in item.get('subtopic', '').lower()):
            results.append(item)
            
    # Sort by chapter if possible
    results.sort(key=lambda x: x.get('chapter', 100))
    return {"results": results}

    return {"results": results}

class GenerateRequest(BaseModel):
    prompt: str

@app.post("/generate")
async def generate_content(req: GenerateRequest):
    try:
        response_text = await call_ollama(req.prompt)
        return {"text": response_text}
    except Exception as e:
        logger.error(f"Generate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-mastery")
async def predict_mastery(req: PredictionRequest):
    if not ml_engine:
        raise HTTPException(status_code=503, detail="ML Engine not loaded")
    
    score = ml_engine.predict_mastery(
        user_id=req.user_id,
        time_taken=req.time_taken, 
        correct=req.correct, 
        attempt_count=req.attempt_count, 
        hint_count=req.hint_count,
        bottom_hint=req.bottom_hint,
        scaffold=req.scaffold
    )
    return {"mastery_score": score}

@app.post("/generate_learning_chapter")
async def generate_learning_chapter(req: ChapterRequest):
    try:
        # 1. RAG Search
        search_query = f"{req.topic} {req.subtopic} concepts explanation example"
        search_res = search(SearchRequest(query=search_query, limit=10))
        context_docs = search_res['results']
        context_str = "\n".join([f"- {d.get('content', '')}" for d in context_docs])

        # 2. Generate Content
        prompt = f"""
        You are an expert Calculus tutor. Write a comprehensive study chapter for the topic: '{req.topic} - {req.subtopic}'.
        Target Audience: {req.difficulty} level student.
        
        Use the following context if relevant, but ensure the explanation is complete and structured:
        {context_str}

        Format behavior:
        - Use clear headings (##)
        - Write 4-6 detailed paragraphs explaining the concept.
        - Include 2-3 practical solved examples with step-by-step explanations.
        - End with a brief summary.
        - Output strictly in Markdown format.
        """
        
        content = await call_ollama(prompt)
        
        # 3. Video Recommendations
        # Try to find video from RAG sources first
        video_url = None
        for doc in context_docs:
            if doc.get('content_type') == 'video' and doc.get('content'):
                video_url = doc.get('content')
                break
        
        # If no video found in RAG, use default fallback video
        if not video_url:
            video_url = "https://www.youtube.com/embed/HfACrKJ_Y2w"  # Default calculus playlist
        
        # 4. Format RAG sources for transparency
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
            "title": f"{req.topic}: {req.subtopic}",
            "content": content,
            "video_url": video_url,
            "references": context_docs,
            "rag_sources": rag_sources
        }
    except Exception as e:
        logger.error(f"Chapter generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_quiz")
async def generate_quiz(req: QuizRequest):
    """
    Generate or retrieve a cached quiz for the given topic/subtopic.
    Checks cache first for instant loading, falls back to generation if not found.
    """
    try:
        # Check cache first
        cache_key = f"{req.topic}|{req.subtopic}|{req.difficulty}"
        cache_file = os.path.join(os.path.dirname(__file__), "quiz_cache.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    cache = json.load(f)
                
                if cache_key in cache:
                    logger.info(f"✅ Serving cached quiz for {req.topic} - {req.subtopic}")
                    return cache[cache_key]
            except Exception as e:
                logger.warning(f"Cache read error: {e}, falling back to generation")
        
        # Cache miss - generate on demand
        logger.info(f"⏳ Cache miss, generating quiz for {req.topic} - {req.subtopic}")
        
        # 1. RAG Search
        search_query = f"{req.topic} {req.subtopic} practice problems quiz"
        search_res = search(SearchRequest(query=search_query, limit=10))
        context_docs = search_res['results']
        context_str = "\n".join([f"- {d.get('content', '')}" for d in context_docs])

        # 2. Generate Quiz JSON
        prompt = f"""
        Create a {req.num_questions}-question multiple choice quiz on '{req.topic} - {req.subtopic}'.
        Difficulty: {req.difficulty}.
        
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
        
        quiz_data = {
            "quiz": json.loads(response_text),
            "rag_sources": rag_sources
        }
        
        # Save to cache for future use
        try:
            cache = {}
            if os.path.exists(cache_file):
                with open(cache_file, 'r') as f:
                    cache = json.load(f)
            
            cache[cache_key] = quiz_data
            
            with open(cache_file, 'w') as f:
                json.dump(cache, f, indent=2)
            
            logger.info(f"💾 Cached quiz for future use: {cache_key}")
        except Exception as e:
            logger.warning(f"Failed to save to cache: {e}")
        
        return quiz_data
        
    except json.JSONDecodeError:
        logger.error("Failed to parse quiz JSON from LLM")
        raise HTTPException(status_code=500, detail="Failed to generate valid quiz format")
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate_diagnostic_quiz")
async def generate_diagnostic_quiz(req: DiagnosticRequest):
    """
    Generates a comprehensive 15-question diagnostic quiz covering all major calculus topics.
    """
    try:
        prompt = f"""
        Create a 15-question diagnostic calculus quiz that comprehensively covers these topics:
        - Limits (3 questions)
        - Derivatives (4 questions including chain rule, product rule, implicit differentiation)
        - Integrals (4 questions including substitution, integration by parts)
        - Applications (2 questions: optimization, related rates)
        - Series & Sequences (2 questions)
        
        Target level: {req.grade}.
        Ensure questions range from basic to advanced within each topic.
        
        Output STRICTLY valid JSON in this format:
        [
            {{
                "id": 1,
                "question": "Question text?",
                "options": ["Op1", "Op2", "Op3", "Op4"],
                "correct": "Op2",
                "topic": "Derivatives" 
            }}
        ]
        Do not include markdown formatting.
        """
        response_text = await call_ollama(prompt)
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        quiz_data = json.loads(response_text)
        
        # Normalize field names to ensure consistency
        for q in quiz_data:
            if 'correctAnswer' in q and 'correct' not in q:
                q['correct'] = q['correctAnswer']
            elif 'correct' not in q and 'correctAnswer' not in q:
                q['correct'] = q['options'][0] if q.get('options') else ""
                
        return {"quiz": quiz_data}
    except Exception as e:
        logger.error(f"Diagnostic generation error: {e}")
        # Return comprehensive fallback static quiz if LLM fails
        return {"quiz": [
             # Limits (3)
             { "id": 1, "question": "What is the limit of (x^2-1)/(x-1) as x approaches 1?", "options": ["0", "1", "2", "undefined"], "correct": "2", "topic": "Limits" },
             { "id": 2, "question": "lim(x→0) sin(x)/x = ?", "options": ["0", "1", "∞", "undefined"], "correct": "1", "topic": "Limits" },
             { "id": 3, "question": "lim(x→∞) (3x^2 + 2x)/(x^2 - 1) = ?", "options": ["0", "3", "∞", "undefined"], "correct": "3", "topic": "Limits" },
             
             # Derivatives (4)
             { "id": 4, "question": "What is the derivative of x^2?", "options": ["x", "2x", "x^2", "2"], "correct": "2x", "topic": "Derivatives" },
             { "id": 5, "question": "Chain rule is used for?", "options": ["Composite functions", "Product of functions", "Sum of functions", "Constants"], "correct": "Composite functions", "topic": "Derivatives" },
             { "id": 6, "question": "d/dx[x·sin(x)] = ?", "options": ["sin(x)", "x·cos(x)", "sin(x) + x·cos(x)", "cos(x)"], "correct": "sin(x) + x·cos(x)", "topic": "Derivatives" },
             { "id": 7, "question": "If x^2 + y^2 = 25, find dy/dx", "options": ["-x/y", "x/y", "-y/x", "y/x"], "correct": "-x/y", "topic": "Derivatives" },
             
             # Integrals (4)
             { "id": 8, "question": "∫ 1/x dx = ?", "options": ["ln(x) + C", "e^x + C", "x + C", "1 + C"], "correct": "ln(x) + C", "topic": "Integration" },
             { "id": 9, "question": "∫ cos(x) dx = ?", "options": ["sin(x) + C", "-sin(x) + C", "cos(x) + C", "-cos(x) + C"], "correct": "sin(x) + C", "topic": "Integration" },
             { "id": 10, "question": "∫ 2x dx = ?", "options": ["x^2 + C", "2x^2 + C", "x + C", "2x + C"], "correct": "x^2 + C", "topic": "Integration" },
             { "id": 11, "question": "∫ e^x dx = ?", "options": ["e^x + C", "xe^x + C", "e^(x+1) + C", "ln(x) + C"], "correct": "e^x + C", "topic": "Integration" },
             
             # Applications (2)
             { "id": 12, "question": "To find maximum/minimum values, we set the derivative equal to:", "options": ["0", "1", "∞", "undefined"], "correct": "0", "topic": "Applications" },
             { "id": 13, "question": "If the radius of a circle increases at 2 cm/s, how fast is the area increasing when r=5?", "options": ["10π cm²/s", "20π cm²/s", "25π cm²/s", "4π cm²/s"], "correct": "20π cm²/s", "topic": "Applications" },
             
             # Series (2)
             { "id": 14, "question": "The sum of infinite geometric series 1 + 1/2 + 1/4 + 1/8 + ... is:", "options": ["1", "2", "∞", "1/2"], "correct": "2", "topic": "Series" },
             { "id": 15, "question": "Does the series Σ(1/n) converge?", "options": ["Yes", "No", "Only for n>10", "Depends on n"], "correct": "No", "topic": "Series" }
        ]}


@app.post("/generate_hint")
async def generate_hint(req: HintRequest):
    """
    Generates a hint for a quiz question using RAG context.
    Returns the hint text and the RAG sources used for transparency.
    """
    try:
        # 1. RAG Search for relevant context
        search_query = f"{req.topic} {req.subtopic} {req.question_text} hint explanation"
        search_res = search(SearchRequest(query=search_query, limit=3))
        context_docs = search_res['results']
        context_str = "\n".join([f"- {d.get('content', '')}" for d in context_docs])
        
        # 2. Generate hint using Ollama
        prompt = f"""
        You are a helpful tutor. A student is stuck on this question:
        
        Question: {req.question_text}
        {f"Their answer: {req.user_answer}" if req.user_answer else ""}
        
        Use the following context to provide a helpful hint (NOT the full answer):
        {context_str}
        
        Provide a gentle hint that guides them toward the solution without giving it away completely.
        Keep it concise (2-3 sentences).
        """
        
        hint_text = await call_ollama(prompt)
        
        # 3. Format RAG sources for transparency
        rag_sources = [{
            'id': d.get('id', str(i)),
            'topic': d.get('topic', ''),
            'subtopic': d.get('subtopic', ''),
            'content': d.get('content', ''),
            'content_type': d.get('content_type', 'hint'),
            'score': d.get('score', 0),
            'source': d.get('source', 'Unknown')
        } for i, d in enumerate(context_docs)]
        
        return {
            "hint": hint_text,
            "sources": rag_sources
        }
    except Exception as e:
        logger.error(f"Hint generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/submit_quiz_ml")
async def submit_quiz_ml(req: QuizSubmissionRequest):
    """
    Submits quiz results and uses ML model to predict mastery for each question.
    Returns updated mastery scores.
    """
    if not ml_engine:
        raise HTTPException(status_code=503, detail="ML Engine not loaded")
    
    try:
        mastery_predictions = []
        
        for q_data in req.questions:
            # Call ML model for each question
            mastery_score = ml_engine.predict_mastery(
                user_id=req.user_id,
                time_taken=q_data.get('timeTaken', 30),
                correct=1 if q_data.get('correct', False) else 0,
                attempt_count=q_data.get('attemptCount', 1),
                hint_count=q_data.get('hintCount', 0),
                bottom_hint=0,
                scaffold=0
            )
            
            mastery_predictions.append({
                'questionId': q_data.get('questionId'),
                'masteryScore': mastery_score
            })
        
        # Calculate overall topic mastery (average of all questions)
        avg_mastery = sum(p['masteryScore'] for p in mastery_predictions) / len(mastery_predictions) if mastery_predictions else 0.5
        
        return {
            "topic": req.topic,
            "subtopic": req.subtopic,
            "questionMastery": mastery_predictions,
            "overallMastery": avg_mastery * 100,  # Convert to percentage
            "success": True
        }
    except Exception as e:
        logger.error(f"ML quiz submission error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/assess_user_level")
async def assess_user_level(req: UserAssessmentRequest):
    """
    Assesses overall user level (Beginner/Intermediate/Advanced) using ML model and quiz history.
    """
    if not ml_engine:
        # Fallback without ML
        avg_mastery = sum(req.topic_mastery.values()) / len(req.topic_mastery) if req.topic_mastery else 0
        if avg_mastery < 40:
            level = "Beginner"
        elif avg_mastery < 70:
            level = "Intermediate"
        else:
            level = "Advanced"
        
        return {
            "user_id": req.user_id,
            "level": level,
            "confidence": 0.7,
            "avg_mastery": avg_mastery,
            "recommendation": f"Based on your average mastery of {avg_mastery:.1f}%, you're at {level} level."
        }
    
    try:
        # Use ML model to assess based on quiz history
        mastery_scores = []
        
        for quiz in req.quiz_history[-10:]:  # Last 10 quizzes
            # Simulate quiz interaction for ML model
            score = quiz.get('score', 50) / 100  # Normalize to 0-1
            time_taken = quiz.get('time_taken', 300)  # Default 5 min
            questions = quiz.get('totalQuestions', 5)
            
            # Predict mastery for this quiz
            mastery = ml_engine.predict_mastery(
                user_id=req.user_id,
                time_taken=time_taken / questions,  # Per question
                correct=1 if score > 0.7 else 0,
                attempt_count=1,
                hint_count=0
            )
            mastery_scores.append(mastery)
        
        # Calculate overall level
        if mastery_scores:
            avg_ml_mastery = sum(mastery_scores) / len(mastery_scores)
        else:
            avg_ml_mastery = sum(req.topic_mastery.values()) / len(req.topic_mastery) if req.topic_mastery else 0.5
        
        # Determine level
        if avg_ml_mastery < 0.4:
            level = "Beginner"
            recommendation = "Focus on foundational concepts. Start with Guided Study to strengthen weak areas."
        elif avg_ml_mastery < 0.7:
            level = "Intermediate"
            recommendation = "You're making good progress! Continue with Guided Study and challenge yourself with quizzes."
        else:
            level = "Advanced"
            recommendation = "Excellent work! Explore advanced topics in Learner Hub and help others."
        
        return {
            "user_id": req.user_id,
            "level": level,
            "confidence": 0.85,
            "avg_mastery": avg_ml_mastery * 100,
            "ml_score": avg_ml_mastery,
            "recommendation": recommendation,
            "weak_topics": [topic for topic, score in req.topic_mastery.items() if score < 70],
            "strong_topics": [topic for topic, score in req.topic_mastery.items() if score >= 80]
        }
    except Exception as e:
        logger.error(f"User assessment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-ollama")
async def test_ollama(req: GenerateRequest):
    """Simple test endpoint to verify Ollama is working"""
    try:
        response_text = await call_ollama(req.prompt)
        return {"text": response_text, "status": "success"}
    except Exception as e:
        logger.error(f"Test Ollama error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
