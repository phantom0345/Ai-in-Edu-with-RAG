import React, { useState } from 'react';
import { RagSource } from '../types';
import RagSourceCard from './RagSourceCard';
import { Database, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface RagSidebarProps {
    sources: RagSource[];
    title?: string;
    maxSources?: number;
}

const RagSidebar: React.FC<RagSidebarProps> = ({
    sources,
    title = "Retrieved Knowledge",
    maxSources = 10
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!sources || sources.length === 0) {
        return null;
    }

    const displaySources = sources.slice(0, maxSources);

    return (
        <div className={`fixed right-0 top-20 h-[calc(100vh-5rem)] bg-slate-50 border-l border-slate-200 shadow-lg transition-all duration-300 z-40 ${isCollapsed ? 'w-12' : 'w-80 md:w-96'
            }`}>
            {/* Collapse/Expand Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -left-10 top-4 bg-indigo-600 text-white p-2 rounded-l-lg hover:bg-indigo-700 transition-colors shadow-md"
                title={isCollapsed ? "Show RAG Sources" : "Hide RAG Sources"}
            >
                {isCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            {!isCollapsed && (
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-md">
                        <div className="flex items-center gap-2 mb-2">
                            <Database className="w-5 h-5" />
                            <h3 className="font-bold text-lg">{title}</h3>
                        </div>
                        <p className="text-xs text-indigo-100 flex items-start gap-1">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>These sources were retrieved from the knowledge base to generate this content</span>
                        </p>
                    </div>

                    {/* Source Count */}
                    <div className="px-4 py-2 bg-white border-b border-slate-200">
                        <p className="text-sm text-slate-600">
                            <span className="font-semibold text-indigo-600">{displaySources.length}</span> source{displaySources.length !== 1 ? 's' : ''} retrieved
                            {sources.length > maxSources && (
                                <span className="text-xs text-slate-500 ml-1">(showing top {maxSources})</span>
                            )}
                        </p>
                    </div>

                    {/* Sources List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {displaySources.map((source, index) => (
                            <RagSourceCard key={source.id || index} source={source} index={index} />
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-white border-t border-slate-200">
                        <p className="text-xs text-center text-slate-500">
                            🔍 Transparency: All content is RAG-powered
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RagSidebar;
