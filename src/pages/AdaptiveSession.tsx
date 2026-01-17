import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile } from '../types';
import { sendMessageToTutor } from '../services/geminiService';
import { RagItem } from '../types';
import Button from '../components/Button';

interface AdaptiveSessionProps {
    userProfile: UserProfile;
}

const AdaptiveSession: React.FC<AdaptiveSessionProps> = ({ userProfile }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [retrievedDocs, setRetrievedDocs] = useState<RagItem[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initialMsg: ChatMessage = {
            id: 'welcome',
            role: 'model',
            text: `Hello ${userProfile.name}! I'm ready to help you with ${userProfile.subject}. Ask me a calculus question!`,
            timestamp: Date.now()
        };
        setMessages([initialMsg]);
    }, [userProfile]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Call Backend
            const { response, context } = await sendMessageToTutor(userMsg.text, messages, userProfile);

            // Update Context Panel
            if (context) {
                setRetrievedDocs(context);
            }

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "Sorry, I encountered an error connecting to the AI tutor.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            {/* Left: Chat Interface */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-slate-800">Adaptive Tutor</h2>
                        <p className="text-xs text-slate-500">Mode: {userProfile.difficultyLevel}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-slate-100 text-slate-800 rounded-bl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 rounded-2xl px-4 py-3 flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about derivatives, integrals, etc..."
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>Send</Button>
                    </div>
                </div>
            </div>

            {/* Right: Knowledge Engine Panel */}
            <div className="w-80 hidden md:flex flex-col gap-4">
                <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-lg mb-1">🧠 Knowledge Engine</h3>
                    <p className="text-xs text-indigo-200">RAG System Active</p>
                </div>

                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-y-auto">
                    <h4 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Context Retrieved</h4>

                    {retrievedDocs.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-8">
                            Start chatting to see retrieved concepts and videos here.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {retrievedDocs.map((doc, i) => (
                                <div key={i} className="text-xs border-l-2 border-indigo-500 pl-3 py-1">
                                    <p className="font-bold text-slate-800">{doc.topic} / {doc.subtopic}</p>
                                    <p className="text-slate-500 mb-1">{doc.content_type} • {doc.difficulty}</p>
                                    {doc.content_type === 'video' ? (
                                        <a
                                            href={doc.metadata?.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:underline block mt-1"
                                        >
                                            🎥 Watch Video
                                        </a>
                                    ) : (
                                        <p className="text-slate-600 line-clamp-3 italic">"{doc.content}"</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdaptiveSession;
