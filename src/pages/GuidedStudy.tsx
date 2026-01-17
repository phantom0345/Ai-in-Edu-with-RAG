import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, RagSource } from '../types';
import { generateLearningChapter } from '../services/ragService';
import { CALCULUS_TOPICS } from '../constants/topics';
import Button from '../components/Button';
import RagSidebar from '../components/RagSidebar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface GuidedStudyProps {
    userProfile: UserProfile;
    updateUserProfile: (profile: UserProfile) => void;
}

const GuidedStudy: React.FC<GuidedStudyProps> = ({ userProfile, updateUserProfile }) => {
    const navigate = useNavigate();

    // Selection State
    const [selectedChapter, setSelectedChapter] = useState<string>('');
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');

    // Content State
    const [isLoading, setIsLoading] = useState(false);
    const [chapterContent, setChapterContent] = useState<any>(null);
    const [difficultyData, setDifficultyData] = useState<any[]>([]);
    const [ragSources, setRagSources] = useState<RagSource[]>([]);

    // Get weak topics (mastery < 70) - ONLY for topics that have been tested
    const getWeakTopics = () => {
        const weakTopics: Record<string, string[]> = {};

        Object.keys(CALCULUS_TOPICS).forEach(chapter => {
            const weakSubtopics = CALCULUS_TOPICS[chapter].filter(subtopic => {
                const mastery = userProfile.topicMastery[subtopic] || userProfile.topicMastery[chapter];

                // Only include if:
                // 1. Topic has been tested (mastery exists and is not undefined)
                // 2. AND score is below 70%
                return mastery !== undefined && mastery < 70;
            });

            if (weakSubtopics.length > 0) {
                weakTopics[chapter] = weakSubtopics;
            }
        });

        return weakTopics;
    };

    const weakTopics = getWeakTopics();
    const availableChapters = Object.keys(weakTopics);

    // Initialize selection with first weak topic
    useEffect(() => {
        if (availableChapters.length > 0 && !selectedChapter) {
            const firstChapter = availableChapters[0];
            setSelectedChapter(firstChapter);
            setSelectedSubtopic(weakTopics[firstChapter][0]);
        }
    }, []);

    // Load difficulty data for chart
    useEffect(() => {
        const data = Object.keys(userProfile.topicMastery || {}).map(topic => ({
            name: topic,
            score: userProfile.topicMastery[topic] || 0
        }));
        setDifficultyData(data);
    }, [userProfile]);

    const handleGenerateChapter = async () => {
        setIsLoading(true);
        setChapterContent(null);
        setRagSources([]);
        try {
            const data = await generateLearningChapter(selectedChapter, selectedSubtopic, userProfile.difficultyLevel);
            setChapterContent(data);
            // Extract RAG sources for sidebar
            if (data.rag_sources) {
                setRagSources(data.rag_sources);
            }
        } catch (e) {
            console.error("Failed to generate chapter", e);
        } finally {
            setIsLoading(false);
        }
    };

    const getDifficultyColor = (score: number) => {
        if (score < 40) return "#ef4444"; // Red
        if (score < 70) return "#eab308"; // Yellow
        return "#22c55e"; // Green
    };

    const getMasteryBadge = (chapter: string, subtopic: string) => {
        const mastery = userProfile.topicMastery[subtopic] || userProfile.topicMastery[chapter] || 0;
        if (mastery < 40) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 ml-2">Weak</span>;
        if (mastery < 70) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 ml-2">Needs Practice</span>;
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 ml-2">Strong</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* RAG Sidebar */}
            <RagSidebar sources={ragSources} title="Learning Resources" />

            {/* Header / Selection Area */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900">🎯 Guided Study</h1>
                        <p className="text-slate-600 mt-2">Personalized learning path focusing on your weak areas</p>
                    </div>

                    {availableChapters.length === 0 ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center shadow-sm">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-bold text-emerald-800">Great Progress!</h3>
                            <p className="text-emerald-700 mt-2 max-w-lg mx-auto font-medium">
                                Based on your quiz performance, you don't have any weak areas yet.
                            </p>
                            <p className="text-emerald-600 mt-3 max-w-lg mx-auto text-sm">
                                To get a complete picture of your strengths and areas for improvement, take more quizzes on different topics. The more you practice, the better we can personalize your learning path!
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    onClick={() => navigate('/quizzes')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    📝 Take More Quizzes
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/learner-hub')}
                                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                >
                                    📚 Explore All Topics
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Info Banner */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                                <p className="text-indigo-800 text-sm">
                                    <strong>📊 Personalized Path:</strong> Based on your quiz performance, we've identified {availableChapters.reduce((acc, ch) => acc + weakTopics[ch].length, 0)} topic{availableChapters.reduce((acc, ch) => acc + weakTopics[ch].length, 0) !== 1 ? 's' : ''} where you scored below 70%. Focus here to strengthen your foundation!
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Topic Selection */}
                                <div className="md:col-span-2 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Chapter</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                                                value={selectedChapter}
                                                onChange={(e) => {
                                                    setSelectedChapter(e.target.value);
                                                    setSelectedSubtopic(weakTopics[e.target.value][0]);
                                                }}
                                            >
                                                {availableChapters.map(chapter => (
                                                    <option key={chapter} value={chapter}>{chapter}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Topic</label>
                                            <select
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                                                value={selectedSubtopic}
                                                onChange={(e) => setSelectedSubtopic(e.target.value)}
                                            >
                                                {weakTopics[selectedChapter]?.map(sub => {
                                                    const mastery = userProfile.topicMastery[sub] || userProfile.topicMastery[selectedChapter] || 0;
                                                    const badge = mastery < 40 ? ' [Weak]' : mastery < 70 ? ' [Needs Practice]' : ' [Strong]';
                                                    return (
                                                        <option key={sub} value={sub}>
                                                            {sub}{badge}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                    <Button onClick={handleGenerateChapter} disabled={isLoading} className="w-full md:w-auto">
                                        {isLoading ? "Generating Personalized Chapter..." : "Start Focused Learning"}
                                    </Button>
                                </div>

                                {/* Difficulty Chart */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Weak Areas</h3>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={difficultyData.filter(d => d.score < 70)}>
                                                <XAxis dataKey="name" hide />
                                                <YAxis hide domain={[0, 100]} />
                                                <Tooltip />
                                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                                    {difficultyData.filter(d => d.score < 70).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.score)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-xs text-center text-slate-400 mt-2">Focus Areas</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-5xl mx-auto px-6 py-10 mr-96">
                {isLoading ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-100 animate-pulse">
                        <div className="animate-spin text-4xl mb-4 inline-block">⏳</div>
                        <h3 className="text-xl font-medium text-slate-700">Analyzing your profile & generating content...</h3>
                        <p className="text-slate-500 mt-2">Retrieving best resources for {selectedSubtopic}</p>
                    </div>
                ) : chapterContent ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* Video Section */}
                        {chapterContent.video_url && (
                            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl aspect-video mx-auto max-w-4xl border border-slate-800">
                                <iframe
                                    src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(selectedChapter + " " + selectedSubtopic)}`}
                                    className="w-full h-full"
                                    title="Recommended Video"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        {/* Theory Content */}
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200 prose prose-indigo max-w-none">
                            <h2 className="text-3xl font-bold text-slate-900 mb-6">{chapterContent.title}</h2>
                            <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-lg">
                                {chapterContent.content}
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex justify-end pt-6 border-t border-slate-200">
                            <Button
                                size="lg"
                                onClick={() => navigate('/quizzes', { state: { topic: selectedChapter, subtopic: selectedSubtopic } })}
                            >
                                Practice Quiz on {selectedSubtopic} →
                            </Button>
                        </div>
                    </div>
                ) : availableChapters.length > 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                        <div className="text-slate-300 text-6xl mb-4">📖</div>
                        <h3 className="text-xl font-medium text-slate-600">Ready to start?</h3>
                        <p className="text-slate-500 mt-2">Select one of your focus areas above to begin your personalized session.</p>
                        <Button
                            variant="outline"
                            className="mt-6"
                            onClick={handleGenerateChapter}
                            disabled={!selectedSubtopic}
                        >
                            Generate Study Material
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default GuidedStudy;
