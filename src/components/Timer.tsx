import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerProps {
    initialSeconds?: number;
    onExpire: () => void;
    autoStart?: boolean;
    storageKey?: string;
}

const Timer: React.FC<TimerProps> = ({
    initialSeconds = 900, // 15 minutes default
    onExpire,
    autoStart = true,
    storageKey = 'quiz-timer'
}) => {
    const [secondsLeft, setSecondsLeft] = useState<number>(() => {
        // Try to restore from sessionStorage
        if (storageKey) {
            const saved = sessionStorage.getItem(storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
                const remaining = data.initialSeconds - elapsed;
                return remaining > 0 ? remaining : 0;
            }
        }
        return initialSeconds;
    });

    const [isRunning, setIsRunning] = useState(autoStart);
    const [hasExpired, setHasExpired] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Save timer state to sessionStorage
    useEffect(() => {
        if (storageKey && isRunning) {
            sessionStorage.setItem(storageKey, JSON.stringify({
                startTime: Date.now() - (initialSeconds - secondsLeft) * 1000,
                initialSeconds
            }));
        }
    }, [secondsLeft, isRunning, storageKey, initialSeconds]);

    useEffect(() => {
        if (isRunning && secondsLeft > 0) {
            intervalRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        setHasExpired(true);
                        if (storageKey) sessionStorage.removeItem(storageKey);
                        onExpire();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, secondsLeft, onExpire, storageKey]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getWarningLevel = (): 'normal' | 'warning' | 'urgent' => {
        if (secondsLeft <= 60) return 'urgent';
        if (secondsLeft <= 300) return 'warning';
        return 'normal';
    };

    const warningLevel = getWarningLevel();

    const colorClasses = {
        normal: 'bg-slate-100 text-slate-700 border-slate-300',
        warning: 'bg-yellow-50 text-yellow-800 border-yellow-400',
        urgent: 'bg-red-50 text-red-800 border-red-400 animate-pulse'
    };

    const iconColorClasses = {
        normal: 'text-slate-500',
        warning: 'text-yellow-600',
        urgent: 'text-red-600'
    };

    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-mono text-lg font-bold transition-all ${colorClasses[warningLevel]}`}>
            {warningLevel === 'urgent' ? (
                <AlertTriangle className={`w-5 h-5 ${iconColorClasses[warningLevel]}`} />
            ) : (
                <Clock className={`w-5 h-5 ${iconColorClasses[warningLevel]}`} />
            )}
            <span>{formatTime(secondsLeft)}</span>
            {warningLevel === 'warning' && (
                <span className="text-xs font-normal">(5 min left)</span>
            )}
            {warningLevel === 'urgent' && (
                <span className="text-xs font-normal">(Hurry!)</span>
            )}
        </div>
    );
};

export default Timer;
