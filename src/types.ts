export interface UserProfile {
    name: string;
    grade: string;
    subject: string;
    learningStyle: string; // 'Visual', 'Textual', 'Interactive'
    isOnboarded: boolean;
    difficultyLevel: "Easy" | "Medium" | "Hard";
    topicMastery: Record<string, number>; // Topic -> Score (0.0 to 1.0)
    quizHistory: QuizResult[];
}

export interface QuizResult {
    date: string;
    score: number;
    totalQuestions: number;
    topicsCovered: string[];
}

export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
    topic: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    isHint?: boolean;
}

export enum Page {
    LANDING = 'LANDING',
    ONBOARDING = 'ONBOARDING',
    SESSION = 'SESSION',
    DASHBOARD = 'DASHBOARD',
    RECOMMENDATIONS = 'RECOMMENDATIONS',
    GUIDED_STUDY = 'GUIDED_STUDY'
}

export interface RagItem {
    id: string;
    topic: string;
    subtopic: string;
    chapter: number;
    layer: string | null;
    difficulty: "easy" | "medium" | "hard";
    content_type: "explanation" | "example" | "hint" | "mistake" | "summary" | "video";
    source: string;
    content: string | null;
    metadata: any;
    score?: number;
}

export interface RagSource {
    id: string;
    topic: string;
    subtopic: string;
    content: string;
    content_type: string;
    score: number;
    source?: string;
}

export interface QuizQuestionWithHint extends QuizQuestion {
    hint?: string;
    hintSources?: RagSource[];
    hintUsed?: boolean;
    timeTaken?: number;
    attemptCount?: number;
}

export interface QuizSubmissionData {
    userId: string;
    topic: string;
    subtopic: string;
    questions: Array<{
        questionId: number;
        timeTaken: number;
        correct: boolean;
        attemptCount: number;
        hintCount: number;
    }>;
}

export interface HintRequest {
    questionText: string;
    userAnswer?: string;
    topic: string;
    subtopic: string;
}

export interface HintResponse {
    hint: string;
    sources: RagSource[];
}
