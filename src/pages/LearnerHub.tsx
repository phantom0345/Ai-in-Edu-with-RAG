import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, RagSource } from '../types';
import { generateLearningChapter } from '../services/ragService';
import { CALCULUS_TOPICS } from '../constants/topics';
import Button from '../components/Button';
import RagSidebar from '../components/RagSidebar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LearnerHubProps {
    userProfile: UserProfile;
    updateUserProfile: (profile: UserProfile) => void;
}

const LearnerHub: React.FC<LearnerHubProps> = ({ userProfile, updateUserProfile }) => {
    const navigate = useNavigate();

    // Selection State - Always show all topics
    const [selectedChapter, setSelectedChapter] = useState<string>(Object.keys(CALCULUS_TOPICS)[0]);
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>(CALCULUS_TOPICS[Object.keys(CALCULUS_TOPICS)[0]][0]);

    // Content State
    const [isLoading, setIsLoading] = useState(false);
    const [chapterContent, setChapterContent] = useState<any>(null);
    const [difficultyData, setDifficultyData] = useState<any[]>([]);
    const [ragSources, setRagSources] = useState<RagSource[]>([]);

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

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* RAG Sidebar */}
            <RagSidebar sources={ragSources} title="Learning Resources" />

            {/* Header / Selection Area */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900">Learner Hub</h1>
                        <p className="text-slate-600 mt-2">Explore all topics and build comprehensive knowledge</p>
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
                                            setSelectedSubtopic(CALCULUS_TOPICS[e.target.value][0]);
                                        }}
                                    >
                                        {Object.keys(CALCULUS_TOPICS).map(chapter => (
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
                                        {CALCULUS_TOPICS[selectedChapter]?.map(sub => (
                                            <option key={sub} value={sub}>
                                                {sub}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <Button onClick={handleGenerateChapter} disabled={isLoading} className="w-full md:w-auto">
                                {isLoading ? "Generating Content..." : "Start Learning Session"}
                            </Button>
                        </div>

                        {/* Difficulty Chart */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Your Mastery Profile</h3>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={difficultyData}>
                                        <XAxis dataKey="name" hide />
                                        <YAxis hide domain={[0, 100]} />
                                        <Tooltip />
                                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                            {difficultyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.score)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-center text-slate-400 mt-2">Topic Mastery Levels</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-5xl mx-auto px-6 py-10 mr-96">
                {isLoading ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm text-center">
                        <div className="animate-spin text-4xl mb-4">🌀</div>
                        <h3 className="text-xl font-medium text-slate-700">Generating content...</h3>
                        <p className="text-slate-500">Retrieving best resources for {selectedSubtopic}</p>
                    </div>
                ) : chapterContent ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* Video Section */}
                        {chapterContent.video_url && (
                            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl aspect-video mx-auto max-w-4xl">
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
                                Take Quiz on {selectedSubtopic} →
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        <p className="text-lg">Select a topic above to begin your learning session.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LearnerHub;
