import { UserProfile, ChatMessage } from '../types';

const API_BASE = "http://localhost:8000";

export interface ChatResponse {
    response: string;
    context: any[];
}

export const sendMessageToTutor = async (
    message: string,
    history: ChatMessage[],
    userProfile: UserProfile
): Promise<ChatResponse> => {
    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: history.map(h => ({ role: h.role, text: h.text })),
                user_profile: {
                    grade: userProfile.grade,
                    subject: userProfile.subject,
                    difficultyLevel: userProfile.difficultyLevel
                }
            })
        });

        if (!res.ok) throw new Error("Backend error");
        return await res.json();
    } catch (e) {
        console.error("Chat failed", e);
        return {
            response: "I'm sorry, I cannot connect to the tutor server right now. Please ensure the backend is running.",
            context: []
        };
    }
};

// Legacy shim if needed, or we refactor pages
// We will refactor pages to not use createTutorSession anymore.
export const generateQuizForTopic = async (topic: string, difficulty: string): Promise<string> => {
    const prompt = `
    Generate a 5-question multiple choice quiz on the topic: ${topic}.
    Difficulty level: ${difficulty}.
    Format the output as a JSON array of objects, each with:
    - 'q': The question string
    - 'options': A list of 4 options strings
    - 'correct': The exact correct option string (must be one of the options)
    `;

    try {
        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        return data.text || "[]";
    } catch (e) {
        console.error("Quiz gen failed", e);
        return "[]";
    }
};

export const generateStudyPlan = async (userProfile: UserProfile): Promise<string> => {
    const prompt = `
    Generate a concise study recommendation list for a student named ${userProfile.name} 
    studying ${userProfile.subject} in grade ${userProfile.grade}.
    
    Their current mastery levels are: ${JSON.stringify(userProfile.topicMastery)}.
    
    Identify 3 key areas to focus on and briefly explain why.
    Output in a JSON array of objects with keys: "topic", "reason", "suggestedActivity".
  `;

    try {
        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        return data.text || "[]";
    } catch (e) {
        return "[]";
    }
};
