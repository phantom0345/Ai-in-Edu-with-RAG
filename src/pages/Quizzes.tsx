import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserProfile, RagSource } from '../types';
import { generateQuiz, generateHint, submitQuizWithML } from '../services/ragService';
import { CALCULUS_TOPICS } from '../constants/topics';
import Button from '../components/Button';
import Timer from '../components/Timer';
import RagSidebar from '../components/RagSidebar';
import { Lightbulb } from 'lucide-react';

interface QuizzesProps {
    userProfile: UserProfile;
    updateUserProfile: (profile: UserProfile) => void;
}

const Quizzes: React.FC<QuizzesProps> = ({ userProfile, updateUserProfile }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Selection State
    const [selectedChapter, setSelectedChapter] = useState<string>(location.state?.topic || Object.keys(CALCULUS_TOPICS)[0]);
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>(location.state?.subtopic || CALCULUS_TOPICS[Object.keys(CALCULUS_TOPICS)[0]][0]);
    const [difficulty, setDifficulty] = useState<string>(userProfile.difficultyLevel || "Medium");

    // Quiz State
    const [isLoading, setIsLoading] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<{ [key: number]: string }>({});
    const [score, setScore] = useState<number | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [ragSources, setRagSources] = useState<RagSource[]>([]);

    // Hint State
    const [hints, setHints] = useState<{ [key: number]: string }>({});
    const [hintSources, setHintSources] = useState<{ [key: number]: RagSource[] }>({});
    const [loadingHint, setLoadingHint] = useState<number | null>(null);

    // Tracking State
    const [questionStartTimes, setQuestionStartTimes] = useState<{ [key: number]: number }>({});
    const [attemptCounts, setAttemptCounts] = useState<{ [key: number]: number }>({});
    const [hintCounts, setHintCounts] = useState<{ [key: number]: number }>({});

    // Update subtopic options when chapter changes
    useEffect(() => {
        if (!CALCULUS_TOPICS[selectedChapter]?.includes(selectedSubtopic)) {
            setSelectedSubtopic(CALCULUS_TOPICS[selectedChapter][0]);
        }
    }, [selectedChapter]);

    const handleGenerateQuiz = async () => {
        setIsLoading(true);
        setQuizQuestions([]);
        setAnswers({});
        setScore(null);
        setShowResults(false);
        setHints({});
        setHintSources({});
        setRagSources([]);
        setQuestionStartTimes({});
        setAttemptCounts({});
        setHintCounts({});

        // Clear timer storage
        sessionStorage.removeItem('quiz-timer');

        try {
            const data = await generateQuiz(selectedChapter, selectedSubtopic, 5, difficulty);
            if (data.quiz && data.quiz.length > 0) {
                setQuizQuestions(data.quiz);

                // Initialize tracking for each question
                const now = Date.now();
                const startTimes: { [key: number]: number } = {};
                const attempts: { [key: number]: number } = {};
                const hintCts: { [key: number]: number } = {};

                data.quiz.forEach((_: any, i: number) => {
                    startTimes[i] = now;
                    attempts[i] = 0;
                    hintCts[i] = 0;
                });

                setQuestionStartTimes(startTimes);
                setAttemptCounts(attempts);
                setHintCounts(hintCts);

                // Set RAG sources from quiz generation
                if (data.rag_sources) {
                    setRagSources(data.rag_sources);
                }
            }
        } catch (e) {
            console.error("Quiz generation failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerChange = (questionIndex: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
        // Increment attempt count
        setAttemptCounts(prev => ({ ...prev, [questionIndex]: (prev[questionIndex] || 0) + 1 }));
    };

    const handleGetHint = async (questionIndex: number) => {
        if (hints[questionIndex]) {
            // Already have hint, just toggle display
            return;
        }

        setLoadingHint(questionIndex);
        try {
            const question = quizQuestions[questionIndex];
            const userAnswer = answers[questionIndex] || '';

            const hintData = await generateHint(
                question.question,
                userAnswer,
                selectedChapter,
                selectedSubtopic
            );

            setHints(prev => ({ ...prev, [questionIndex]: hintData.hint }));
            setHintSources(prev => ({ ...prev, [questionIndex]: hintData.sources }));
            setHintCounts(prev => ({ ...prev, [questionIndex]: (prev[questionIndex] || 0) + 1 }));

            // Add hint sources to RAG sidebar
            if (hintData.sources) {
                setRagSources(prev => [...prev, ...hintData.sources]);
            }
        } catch (e) {
            console.error("Hint generation failed", e);
        } finally {
            setLoadingHint(null);
        }
    };

    const submitQuiz = async () => {
        const now = Date.now();
        let correct = 0;

        // Calculate results
        const questionData = quizQuestions.map((q, i) => {
            const isCorrect = answers[i] === q.correctAnswer;
            if (isCorrect) correct++;

            const timeTaken = Math.floor((now - questionStartTimes[i]) / 1000); // seconds

            return {
                questionId: q.id || i,
                timeTaken,
                correct: isCorrect,
                attemptCount: attemptCounts[i] || 1,
                hintCount: hintCounts[i] || 0
            };
        });

        setScore(correct);
        setShowResults(true);

        // Submit to ML model for mastery prediction
        try {
            const mlResult = await submitQuizWithML(userProfile.name, {
                topic: selectedChapter,
                subtopic: selectedSubtopic,
                questions: questionData
            });

            // Update mastery based on ML prediction
            const updatedMastery = { ...userProfile.topicMastery };
            updatedMastery[selectedSubtopic] = mlResult.overallMastery;
            updatedMastery[selectedChapter] = Math.max(
                updatedMastery[selectedChapter] || 0,
                mlResult.overallMastery
            );

            // Record History
            const newHistory = [
                ...(userProfile.quizHistory || []),
                {
                    date: new Date().toLocaleDateString(),
                    score: (correct / quizQuestions.length) * 100,
                    totalQuestions: quizQuestions.length,
                    topicsCovered: [selectedSubtopic]
                }
            ];

            updateUserProfile({
                ...userProfile,
                topicMastery: updatedMastery,
                quizHistory: newHistory
            });
        } catch (e) {
            console.error("ML submission failed, using fallback", e);

            // Fallback to simple mastery calculation
            const currentMastery = userProfile.topicMastery[selectedSubtopic] || userProfile.topicMastery[selectedChapter] || 0;
            const quizPercentage = (correct / quizQuestions.length) * 100;
            const newMasteryScore = Math.round((currentMastery * 0.7) + (quizPercentage * 0.3));

            const updatedMastery = { ...userProfile.topicMastery };
            updatedMastery[selectedSubtopic] = newMasteryScore;
            updatedMastery[selectedChapter] = Math.max(updatedMastery[selectedChapter] || 0, newMasteryScore);

            const newHistory = [
                ...(userProfile.quizHistory || []),
                {
                    date: new Date().toLocaleDateString(),
                    score: quizPercentage,
                    totalQuestions: quizQuestions.length,
                    topicsCovered: [selectedSubtopic]
                }
            ];

            updateUserProfile({
                ...userProfile,
                topicMastery: updatedMastery,
                quizHistory: newHistory
            });
        }
    };

    const handleTimerExpire = () => {
        if (!showResults) {
            submitQuiz();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* RAG Sidebar */}
            <RagSidebar sources={ragSources} title="Quiz Knowledge Sources" />

            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-6">Topic Quizzes</h1>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Chapter</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300"
                                value={selectedChapter}
                                onChange={(e) => setSelectedChapter(e.target.value)}
                            >
                                {Object.keys(CALCULUS_TOPICS).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300"
                                value={selectedSubtopic}
                                onChange={(e) => setSelectedSubtopic(e.target.value)}
                            >
                                {CALCULUS_TOPICS[selectedChapter]?.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleGenerateQuiz} disabled={isLoading} className="w-full">
                                {isLoading ? "Generating Quiz..." : "New Quiz"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-10 mr-96">
                {quizQuestions.length > 0 && !showResults && (
                    <div className="flex justify-center mb-6">
                        <Timer
                            initialSeconds={900}
                            onExpire={handleTimerExpire}
                            storageKey="quiz-timer"
                        />
                    </div>
                )}

                {quizQuestions.length > 0 ? (
                    <div className="space-y-8 animate-fade-in">
                        {showResults && (
                            <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-indigo-100 text-center mb-8">
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Results</h2>
                                <div className="text-5xl font-bold text-indigo-600 mb-4">
                                    {score} / {quizQuestions.length}
                                </div>
                                <p className="text-slate-600 mb-6">Mastery updated for {selectedSubtopic}</p>
                                <div className="flex justify-center gap-4">
                                    <Button variant="secondary" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                                    <Button onClick={handleGenerateQuiz}>Try Another Quiz</Button>
                                </div>
                            </div>
                        )}

                        {quizQuestions.map((q, i) => (
                            <div key={i} className={`bg-white p-6 rounded-xl border ${showResults ? (answers[i] === q.correctAnswer ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') : 'border-slate-200'} shadow-sm`}>
                                <div className="flex justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">{i + 1}. {q.question}</h3>
                                    {showResults && (
                                        <span className={answers[i] === q.correctAnswer ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                            {answers[i] === q.correctAnswer ? 'Correct' : 'Incorrect'}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {q.options.map((opt: string, idx: number) => (
                                        <button
                                            key={idx}
                                            disabled={showResults}
                                            onClick={() => handleAnswerChange(i, opt)}
                                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${answers[i] === opt
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : showResults && opt === q.correctAnswer
                                                    ? 'bg-green-100 border-green-500 text-green-800'
                                                    : 'hover:bg-slate-50 border-slate-200'
                                                } ${showResults ? 'cursor-default' : ''}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>

                                {/* Hint Button */}
                                {!showResults && (
                                    <div className="mt-4">
                                        <button
                                            onClick={() => handleGetHint(i)}
                                            disabled={loadingHint === i}
                                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                        >
                                            <Lightbulb className="w-4 h-4" />
                                            {loadingHint === i ? 'Loading hint...' : hints[i] ? 'View Hint' : 'Get Hint'}
                                        </button>
                                    </div>
                                )}

                                {/* Hint Display */}
                                {hints[i] && (
                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-yellow-900 mb-1">Hint:</p>
                                                <p className="text-sm text-yellow-800">{hints[i]}</p>
                                                {hintSources[i] && hintSources[i].length > 0 && (
                                                    <p className="text-xs text-yellow-600 mt-2 italic">
                                                        Source: {hintSources[i][0].source} ({hintSources[i].length} reference{hintSources[i].length !== 1 ? 's' : ''})
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showResults && q.explanation && (
                                    <div className="mt-4 p-4 bg-white/50 rounded-lg text-sm text-slate-700">
                                        <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                )}
                            </div>
                        ))}

                        {!showResults && (
                            <Button
                                size="lg"
                                className="w-full"
                                disabled={Object.keys(answers).length < quizQuestions.length}
                                onClick={submitQuiz}
                            >
                                Submit Quiz
                            </Button>
                        )}
                    </div>
                ) : (
                    !isLoading && (
                        <div className="text-center py-20 text-slate-400">
                            <p className="text-lg">Select a topic and click "New Quiz" to begin.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default Quizzes;
