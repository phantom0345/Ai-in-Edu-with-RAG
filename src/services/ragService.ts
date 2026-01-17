import { RagItem, UserProfile, RagSource, QuizSubmissionData } from '../types';

const API_BASE = "http://localhost:8000";

export const searchCorpus = async (query: string, limit: number = 5): Promise<RagItem[]> => {
    try {
        const res = await fetch(`${API_BASE}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit })
        });
        const data = await res.json();
        return data.results || [];
    } catch (e) {
        console.error("Search failed", e);
        return [];
    }
};

export const getResourcesForTopic = async (topic: string): Promise<RagItem[]> => {
    try {
        const res = await fetch(`${API_BASE}/topic/${encodeURIComponent(topic)}`);
        const data = await res.json();
        return data.results || [];
    } catch (e) {
        console.error("Topic fetch failed", e);
        return [];
    }
};

export const getVideoForTopic = async (topic: string): Promise<RagItem | undefined> => {
    const resources = await getResourcesForTopic(topic);
    return resources.find(r => r.content_type === 'video');
};

export const generateLearningChapter = async (topic: string, subtopic: string, difficulty: string = 'Medium') => {
    try {
        const res = await fetch(`${API_BASE}/generate_learning_chapter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, subtopic, difficulty })
        });
        return await res.json();
    } catch (e) {
        console.error("Chapter generation failed", e);
        throw e;
    }
};

export const generateQuiz = async (topic: string, subtopic: string, num_questions: number = 5, difficulty: string = 'Medium') => {
    try {
        const res = await fetch(`${API_BASE}/generate_quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, subtopic, num_questions, difficulty })
        });
        const data = await res.json();
        return data; // Return full object with quiz and rag_sources
    } catch (e) {
        console.error("Quiz generation failed", e);
        throw e;
    }
};

export const generateDiagnosticQuiz = async (grade: string, numQuestions: number = 10) => {
    try {
        const res = await fetch(`${API_BASE}/generate_diagnostic_quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade, num_questions: numQuestions })
        });
        const data = await res.json();
        return data.quiz;
    } catch (e) {
        console.error("Diagnostic generation failed", e);
        return [];
    }
};

export const generateHint = async (questionText: string, userAnswer: string = '', topic: string, subtopic: string) => {
    try {
        const res = await fetch(`${API_BASE}/generate_hint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_text: questionText,
                user_answer: userAnswer,
                topic,
                subtopic
            })
        });
        const data = await res.json();
        return data; // { hint: string, sources: RagSource[] }
    } catch (e) {
        console.error("Hint generation failed", e);
        throw e;
    }
};

export const submitQuizWithML = async (userId: string, data: QuizSubmissionData) => {
    try {
        const res = await fetch(`${API_BASE}/submit_quiz_ml`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                topic: data.topic,
                subtopic: data.subtopic,
                questions: data.questions
            })
        });
        return await res.json();
    } catch (e) {
        console.error("ML quiz submission failed", e);
        throw e;
    }
};

export const assessUserLevel = async (userId: string, quizHistory: any[], topicMastery: Record<string, number>) => {
    try {
        const res = await fetch(`${API_BASE}/assess_user_level`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                quiz_history: quizHistory,
                topic_mastery: topicMastery
            })
        });
        return await res.json();
    } catch (e) {
        console.error("User assessment failed", e);
        throw e;
    }
};
