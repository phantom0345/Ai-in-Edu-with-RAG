import React, { useState } from 'react';
import { RagSource } from '../types';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface RagSourceCardProps {
    source: RagSource;
    index: number;
}

const RagSourceCard: React.FC<RagSourceCardProps> = ({ source, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getContentTypeColor = (type: string): string => {
        const colors: Record<string, string> = {
            explanation: 'bg-blue-100 text-blue-800',
            example: 'bg-green-100 text-green-800',
            hint: 'bg-yellow-100 text-yellow-800',
            summary: 'bg-purple-100 text-purple-800',
            video: 'bg-red-100 text-red-800',
            mistake: 'bg-orange-100 text-orange-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    const getScoreColor = (score: number): string => {
        if (score > 0.8) return 'text-green-600';
        if (score > 0.5) return 'text-yellow-600';
        return 'text-slate-500';
    };

    const truncateContent = (content: string, maxLength: number = 120): string => {
        if (!content) return 'No content available';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    // Safety check for content
    const safeContent = source.content || 'No content available';
    const hasLongContent = safeContent.length > 120;

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-700">Source #{index + 1}</span>
                </div>
                {source.score !== undefined && (
                    <span className={`text-xs font-semibold ${getScoreColor(source.score)}`}>
                        {(source.score * 100).toFixed(0)}%
                    </span>
                )}
            </div>

            {/* Topic Badges */}
            <div className="flex flex-wrap gap-1 mb-2">
                {source.topic && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        {source.topic}
                    </span>
                )}
                {source.subtopic && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {source.subtopic}
                    </span>
                )}
                {source.content_type && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getContentTypeColor(source.content_type)}`}>
                        {source.content_type}
                    </span>
                )}
            </div>

            {/* Content Preview */}
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {isExpanded ? safeContent : truncateContent(safeContent)}
            </p>

            {/* Expand/Collapse Button */}
            {hasLongContent && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3 h-3" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3" />
                            Show more
                        </>
                    )}
                </button>
            )}

            {/* Source Attribution */}
            {source.source && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400 italic">From: {source.source}</p>
                </div>
            )}
        </div>
    );
};

export default RagSourceCard;
