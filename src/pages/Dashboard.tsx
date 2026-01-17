import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import Button from '../components/Button';
import { assessUserLevel } from '../services/ragService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, Award, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';

interface DashboardProps {
    userProfile: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ userProfile }) => {
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const getAssessment = async () => {
            setIsLoading(true);
            try {
                const res = await assessUserLevel(
                    userProfile.name,
                    userProfile.quizHistory,
                    userProfile.topicMastery
                );
                setAssessment(res);
            } catch (e) {
                console.error("Failed to get assessment", e);
            } finally {
                setIsLoading(false);
            }
        };
        getAssessment();
    }, [userProfile]);

    // Trend data
    const data = userProfile.quizHistory.length > 0
        ? userProfile.quizHistory.map((h, i) => ({ date: h.date, score: h.score }))
        : [
            { date: 'Day 1', score: 65 },
            { date: 'Day 2', score: 72 },
            { date: 'Day 3', score: 85 },
        ];

    const getLevelColor = (level: string) => {
        if (level === "Beginner") return "text-orange-600 bg-orange-50 border-orange-100";
        if (level === "Intermediate") return "text-indigo-600 bg-indigo-50 border-indigo-100";
        return "text-green-600 bg-green-50 border-green-100";
    };

    return (
        <div className="space-y-8 pb-10">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Welcome, {userProfile.name} 👋</h1>
                    <p className="text-slate-500 mt-1">Your personalized learning dashboard for {userProfile.subject}.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/learner-hub')}>Explore All</Button>
                    <Button onClick={() => navigate('/guided-study')}>Focused Study</Button>
                </div>
            </header>

            {/* Assessment & Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* ML User Level Card */}
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Award className="text-indigo-600 w-5 h-5" />
                            <h3 className="font-bold text-slate-800">ML Intelligence Profile</h3>
                        </div>
                        {assessment && (
                            <span className={`px-4 py-1 rounded-full text-xs font-bold border ${getLevelColor(assessment.level)}`}>
                                {assessment.level.toUpperCase()}
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-10"><div className="animate-spin">🌀</div></div>
                    ) : assessment ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Assessment Recommendation</p>
                                    <p className="text-slate-700 leading-relaxed font-medium">{assessment.recommendation}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                                        <p className="text-xs text-green-700 font-bold mb-1">Strengths</p>
                                        <p className="text-sm text-green-800">{assessment.strong_topics.length > 0 ? assessment.strong_topics[0] : 'None yet'}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                        <p className="text-xs text-red-700 font-bold mb-1">Focus Areas</p>
                                        <p className="text-sm text-red-800">{assessment.weak_topics.length > 0 ? assessment.weak_topics[0] : 'None yet'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-indigo-600 p-6 rounded-2xl text-white relative overflow-hidden">
                                <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
                                <div className="relative z-10">
                                    <p className="text-indigo-100 text-sm font-medium mb-1">Overall predicted mastery</p>
                                    <p className="text-4xl font-bold mb-4">{Math.round(assessment.avg_mastery)}%</p>
                                    <Button
                                        variant="secondary"
                                        className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
                                        onClick={() => navigate('/guided-study')}
                                    >
                                        Resume Focused Path
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 italic">No assessment data available yet. Complete more activities!</p>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="text-indigo-600 w-5 h-5" />
                            <h3 className="font-bold text-slate-800">Quick Stats</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Quizzes Taken</span>
                                <span className="font-bold text-slate-800">{userProfile.quizHistory.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Avg Score</span>
                                <span className="font-bold text-slate-800">
                                    {Math.round(userProfile.quizHistory.reduce((acc, h) => acc + h.score, 0) / (userProfile.quizHistory.length || 1))}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-slate-100">
                        <AlertCircle className="text-slate-400 w-4 h-4 mb-2" />
                        <p className="text-xs text-slate-500 leading-relaxed italic">
                            Your level is recalculated daily based on accuracy, time-to-answer, and hint usage.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mastery Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" /> Mastery Trend
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#4f46e5"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Topic Breakdown */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" /> Topic Breakdown
                    </h3>
                    <div className="space-y-5">
                        {Object.entries(userProfile.topicMastery).length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-slate-400 mb-4">No quiz data yet. Take quizzes to see your mastery!</p>
                                <Button variant="outline" size="sm" onClick={() => navigate('/quizzes')}>
                                    Start Quizzes
                                </Button>
                            </div>
                        ) : Object.entries(userProfile.topicMastery).slice(0, 5).map(([topic, score]) => (
                            <div key={topic}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600 font-medium">{topic}</span>
                                    <span className={`font-bold ${score < 70 ? 'text-orange-500' : 'text-indigo-600'}`}>{Math.round(score)}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${score < 70 ? 'bg-orange-400' : 'bg-indigo-500'}`}
                                        style={{ width: `${score}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <Button variant="outline" className="w-full text-indigo-600" onClick={() => navigate('/learner-hub')}>
                            View Full Mastery in Learner Hub
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
