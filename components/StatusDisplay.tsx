
import React from 'react';
import { ProgressUpdate } from '../types';

interface StatusDisplayProps {
    progress: ProgressUpdate;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ progress }) => {
    return (
        <div className="w-full max-w-lg text-center">
            <p className="text-gray-400 mb-2 truncate">{progress.message}</p>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-cyan-600 h-2.5 rounded-full transition-all duration-300 ease-linear" 
                    style={{ width: `${progress.percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default StatusDisplay;
