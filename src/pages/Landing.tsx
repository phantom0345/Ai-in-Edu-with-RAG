import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const Landing: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center text-white p-6">
            <div className="max-w-3xl text-center space-y-8">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-cyan-200">
                    ClassMate AI
                </h1>
                <p className="text-xl md:text-2xl text-indigo-100/80 leading-relaxed">
                    Your intelligent, adaptive calculus tutor. <br />
                    Master concepts with personalized guidance, real-time feedback, and RAG-powered study plans.
                </p>
                <div className="flex gap-4 justify-center pt-8">
                    <Button
                        size="lg"
                        onClick={() => navigate('/onboarding')}
                        className="bg-white text-indigo-900 hover:bg-indigo-50"
                    >
                        Get Started
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Landing;
