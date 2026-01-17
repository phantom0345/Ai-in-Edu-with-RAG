import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import Button from '../components/Button';
import Timer from '../components/Timer';
import { generateDiagnosticQuiz } from '../services/ragService';

interface OnboardingProps {
    updateUserProfile: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ updateUserProfile }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Profile Data
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('College');
    const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

    // Quiz Data
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<{ [key: number]: string }>({});

    const handleStartQuiz = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Generate diagnostic quiz
            const questions = await generateDiagnosticQuiz(grade);
            if (questions && questions.length > 0) {
                setQuizQuestions(questions);
                setStep(2);
            } else {
                // Fallback if generic fails
                finishOnboarding(0);
            }
        } catch (error) {
            console.error("Quiz gen failed", error);
            finishOnboarding(0);
        } finally {
            setIsLoading(false);
        }
    };

    const finishOnboarding = (score: number) => {
        // Init mastery based on score
        const initialMastery = {
            "Limits": score * 10,
            "Derivatives": score * 10,
            "Integrals": Math.max(0, score * 10 - 20)
        };

        const profile: UserProfile = {
            name,
            grade,
            subject: 'Calculus',
            learningStyle: 'Visual',
            isOnboarded: true,
            difficultyLevel: difficulty,
            topicMastery: initialMastery,
            quizHistory: [{
                date: new Date().toLocaleDateString(),
                score: score * 10, // approx percentage
                totalQuestions: quizQuestions.length || 5,
                topicsCovered: ["Diagnostics"]
            }]
        };
        updateUserProfile(profile);
        navigate('/dashboard');
    };

    const submitQuiz = () => {
        let correct = 0;
        quizQuestions.forEach((q, i) => {
            // Use 'correct' field instead of 'correctAnswer'
            if (answers[i] === q.correct) correct++;
        });
        finishOnboarding(correct);
    };

    const handleTimerExpire = () => {
        // Auto-submit when timer expires
        submitQuiz();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                    {step === 1 ? "Create Your Profile" : "Diagnostic Quiz"}
                </h2>

                {step === 1 ? (
                    <form onSubmit={handleStartQuiz} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Enter your name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Current Level</label>
                                <select
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                                    value={grade}
                                    onChange={e => setGrade(e.target.value)}
                                >
                                    <option value="High School">High School</option>
                                    <option value="College">College</option>
                                    <option value="Graduate">Graduate</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Difficulty</label>
                                <select
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value as any)}
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" size="lg" disabled={!name || isLoading}>
                            {isLoading ? "Generating Quiz..." : "Next: Take Diagnostic Quiz"}
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        {/* Timer */}
                        <div className="flex justify-center mb-4">
                            <Timer
                                initialSeconds={900}
                                onExpire={handleTimerExpire}
                                storageKey="diagnostic-quiz-timer"
                            />
                        </div>

                        <p className="text-slate-600 text-center mb-4">
                            Let's check your current knowledge to personalize your learning path.
                        </p>
                        {quizQuestions.map((q, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="font-semibold text-slate-800 mb-3">{i + 1}. {q.question}</p>
                                <div className="space-y-2">
                                    {q.options.map((opt: string, idx: number) => (
                                        <label key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                            <input
                                                type="radio"
                                                name={`q-${i}`}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                                checked={answers[i] === opt}
                                                onChange={() => setAnswers(prev => ({ ...prev, [i]: opt }))}
                                            />
                                            <span className="text-slate-700 text-sm">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <Button onClick={submitQuiz} className="w-full" size="lg" disabled={Object.keys(answers).length < quizQuestions.length}>
                            Submit & Start Learning
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
