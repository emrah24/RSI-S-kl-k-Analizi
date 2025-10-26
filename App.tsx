
import React, { useState, useCallback, useRef } from 'react';
import { AnalysisResult, ProgressUpdate } from './types';
import { performFullAnalysis } from './services/analysisService';
import Header from './components/Header';
import Loader from './components/Loader';
import RsiFrequencyReport from './components/RsiFrequencyReport';
import BreakoutHunterReport from './components/BreakoutHunterReport';
import StatusDisplay from './components/StatusDisplay';

const App: React.FC = () => {
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<ProgressUpdate>({ message: 'Ready to start', percentage: 0 });

    const lastPositionsRef = useRef<Record<string, Record<string, number>>>({});

    const handleRunAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setProgress({ message: 'Initializing...', percentage: 0 });

        try {
            const results = await performFullAnalysis(
                (update) => setProgress(update),
                lastPositionsRef.current
            );
            setAnalysisResult(results);
            lastPositionsRef.current = results.rsiReport.currentPositions; // Save for next run
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setProgress({ message: 'Analysis complete', percentage: 100 });
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <Header onRunAnalysis={handleRunAnalysis} isLoading={isLoading} />
            
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader />
                        <StatusDisplay progress={progress} />
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                        <h3 className="font-bold">Analysis Failed</h3>
                        <p>{error}</p>
                    </div>
                )}
                
                {analysisResult && !isLoading && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        <div className="lg:col-span-2">
                           <RsiFrequencyReport data={analysisResult.rsiReport} />
                        </div>
                        <div className="lg:col-span-1">
                            <BreakoutHunterReport opportunities={analysisResult.breakoutOpportunities} />
                        </div>
                    </div>
                )}

                {!isLoading && !analysisResult && !error && (
                     <div className="text-center py-20">
                        <h2 className="text-3xl font-bold text-gray-400 mb-4">RSI Frequency Analysis</h2>
                        <p className="text-gray-500">Click "Run Analysis" to scan the market for opportunities.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
