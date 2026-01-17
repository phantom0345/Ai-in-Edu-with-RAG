import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile } from '../types';
import { LayoutDashboard, BookOpen, MessageSquare, Compass, LogOut } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    userProfile: UserProfile | null;
}

const Layout: React.FC<LayoutProps> = ({ children, userProfile }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // If not onboarded or no profile, just show children (e.g., landing/onboarding)
    if (!userProfile || !userProfile.isOnboarded) {
        return <div className="min-h-screen bg-slate-50 font-sans text-slate-900">{children}</div>;
    }

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Adaptive Session', path: '/session', icon: MessageSquare },
        { label: 'Guided Study', path: '/guided-study', icon: BookOpen },
        { label: 'Learner Hub', path: '/learner-hub', icon: Compass },
        { label: 'Topic Quizzes', path: '/quizzes', icon: Compass },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-10 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                        ClassMate AI
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                            >
                                <Icon size={20} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="px-4 py-3 bg-slate-50 rounded-xl mb-4">
                        <p className="text-sm font-bold text-slate-700">{userProfile.name}</p>
                        <p className="text-xs text-slate-500">{userProfile.grade} • {userProfile.difficultyLevel}</p>
                    </div>
                    <button
                        onClick={() => {
                            // Logout logic (clear local storage?)
                            localStorage.removeItem('userProfile');
                            window.location.href = '/';
                        }}
                        className="w-full flex items-center gap-2 text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm transition-colors"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                {children}
            </main>
        </div>
    );
};

export default Layout;
