import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProfile, Page } from './types';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import AdaptiveSession from './pages/AdaptiveSession';
import Quizzes from './pages/Quizzes';
import GuidedStudy from './pages/GuidedStudy';
import LearnerHub from './pages/LearnerHub';
import Layout from './components/Layout';

const App: React.FC = () => {
    // Persistent profile state could be loaded from localStorage or backend
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Mock initial load/check
    useEffect(() => {
        const stored = localStorage.getItem('userProfile');
        if (stored) {
            setUserProfile(JSON.parse(stored));
        }
    }, []);

    const handleUpdateProfile = (profile: UserProfile) => {
        setUserProfile(profile);
        localStorage.setItem('userProfile', JSON.stringify(profile));
    };

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Layout userProfile={userProfile}>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route
                        path="/onboarding"
                        element={
                            userProfile?.isOnboarded
                                ? <Navigate to="/dashboard" />
                                : <Onboarding updateUserProfile={handleUpdateProfile} />
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            userProfile?.isOnboarded
                                ? <Dashboard userProfile={userProfile} />
                                : <Navigate to="/onboarding" />
                        }
                    />
                    <Route
                        path="/session"
                        element={
                            userProfile?.isOnboarded
                                ? <AdaptiveSession userProfile={userProfile} />
                                : <Navigate to="/onboarding" />
                        }
                    />
                    <Route
                        path="/quizzes"
                        element={
                            userProfile?.isOnboarded
                                ? <Quizzes userProfile={userProfile} updateUserProfile={handleUpdateProfile} />
                                : <Navigate to="/onboarding" />
                        }
                    />
                    <Route
                        path="/guided-study"
                        element={
                            userProfile?.isOnboarded
                                ? <GuidedStudy userProfile={userProfile} updateUserProfile={handleUpdateProfile} />
                                : <Navigate to="/onboarding" />
                        }
                    />
                    <Route
                        path="/learner-hub"
                        element={
                            userProfile?.isOnboarded
                                ? <LearnerHub userProfile={userProfile} updateUserProfile={handleUpdateProfile} />
                                : <Navigate to="/onboarding" />
                        }
                    />
                </Routes>
            </Layout>
        </Router>
    );
};

export default App;
