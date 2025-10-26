
import React from 'react';
import { BreakoutOpportunity } from '../types';

const OpportunityCard: React.FC<{ opp: BreakoutOpportunity, rank: number }> = ({ opp, rank }) => {
    const isPositive4h = opp.price_4h_change >= 0;
    const isPositive12h = opp.price_12h_change >= 0;

    const getMomentumText = () => {
        if (opp.price_12h_change < 0) {
            return `Dip recovery +${opp.price_4h_change.toFixed(1)}% momentum`;
        }
        return `${opp.price_4h_change.toFixed(1)}% momentum`;
    };

    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/80 space-y-2 text-sm">
            <div className="flex justify-between items-start">
                <div>
                    <span className="font-bold text-lg text-white">{String(rank).padStart(2, '0')}. {opp.symbol}</span>
                    <p className="text-xs text-gray-400">Score: {opp.score}</p>
                </div>
                <span className="text-base font-semibold">{opp.tag}</span>
            </div>
            <div className="pl-1 text-gray-300">
                <p className="font-mono">💰 ${opp.price.toPrecision(5)}</p>
                <div className="grid grid-cols-2 gap-x-4 text-xs font-mono mt-1">
                    <p>📊 RSI 1h: <span className="text-cyan-300">{opp.rsi_1h.toFixed(1)}</span></p>
                    <p>📊 RSI 4h: <span className="text-cyan-300">{opp.rsi_4h.toFixed(1)}</span></p>
                    <p>📈 4h: <span className={isPositive4h ? 'text-green-400' : 'text-red-400'}>{opp.price_4h_change.toFixed(2)}%</span></p>
                    <p>📈 12h: <span className={isPositive12h ? 'text-green-400' : 'text-red-400'}>{opp.price_12h_change.toFixed(2)}%</span></p>
                </div>
                <p className="mt-2 text-xs">🎯 Volume: <span className="font-semibold">{opp.volume_multiplier.toFixed(1)}x</span> vs 23h avg</p>
            </div>
            <div className="!mt-3 pt-2 border-t border-gray-700/50 text-center">
                 <p className="text-xs text-amber-300">💡 {getMomentumText()}</p>
                 <p className="font-bold text-cyan-400 text-base">{opp.recommendation}</p>
            </div>
        </div>
    );
};


const BreakoutHunterReport: React.FC<{ opportunities: BreakoutOpportunity[] }> = ({ opportunities }) => {
    if (opportunities.length === 0) {
        return (
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6">
                 <h2 className="text-xl font-bold text-white mb-2">🎯 Breakout Hunter</h2>
                 <div className="text-center py-10">
                    <p className="text-gray-400">No strong dip-buying opportunities found in this scan.</p>
                 </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl p-4 md:p-6 space-y-4 sticky top-28">
            <header>
                <h2 className="text-xl font-bold text-white">🎯 Breakout Hunter</h2>
                <p className="text-sm text-gray-400">Top {opportunities.length} dip-buying opportunities found.</p>
            </header>
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2">
                {opportunities.map((opp, index) => (
                    <OpportunityCard key={opp.symbol} opp={opp} rank={index + 1} />
                ))}
            </div>
            <footer className="text-center text-xs text-amber-500 pt-2 border-t border-gray-700">
                ⚠️ Always use a stop-loss! This is not financial advice.
            </footer>
        </div>
    );
};

export default BreakoutHunterReport;
