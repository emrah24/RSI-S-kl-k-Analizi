
import React from 'react';

interface HeaderProps {
    onRunAnalysis: () => void;
    isLoading: boolean;
}

const Header: React.FC<HeaderProps> = ({ onRunAnalysis, isLoading }) => {
    return (
        <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700/50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">RSI Sıklık Analizi</h1>
                </div>
                <button
                    onClick={onRunAnalysis}
                    disabled={isLoading}
                    className="flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-75"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </>
                    ) : (
                       "Run Analysis"
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;
