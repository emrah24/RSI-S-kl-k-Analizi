
import React from 'react';
import { RsiReportData, RsiEntity } from '../types';

const RsiCard: React.FC<{ entity: RsiEntity, type: 'overbought' | 'oversold' }> = ({ entity, type }) => {
    const isOverbought = type === 'overbought';
    
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/80 space-y-2 text-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-baseline space-x-2">
                    <span className="font-bold text-lg text-white">{String(entity.rank).padStart(2, '0')}. {entity.coin}</span>
                    {entity.indicator && <span className="text-xs font-mono py-0.5 px-1.5 bg-red-500/30 text-red-300 rounded">{entity.indicator}</span>}
                    {entity.badge && <span className={`text-xs font-mono py-0.5 px-1.5 ${isOverbought ? 'bg-red-500/30 text-red-300' : 'bg-blue-500/30 text-blue-300'} rounded`}>{entity.badge}</span>}
                </div>
                <span className="font-mono text-base">{entity.positionChange}</span>
            </div>
            <div className="text-gray-400 pl-1 space-y-1">
                <p>📊 <span className="font-mono text-cyan-300">{entity.timeframeStr}</span> = <b>{entity.count} times</b></p>
                <p>💡 {entity.warning}</p>
                {entity.priceChangeStr && <p className="font-mono text-xs">💰 {entity.priceChangeStr}</p>}
            </div>
        </div>
    );
};

const AutoAnalysisSection: React.FC<{ analysis: RsiReportData['autoAnalysis'], type: 'overbought' | 'oversold' }> = ({ analysis, type }) => {
    const leader = type === 'overbought' ? analysis.overboughtLeader : analysis.oversoldLeader;
    if (!leader) return null;
    const isOverbought = type === 'overbought';

    return (
        <div className={`p-4 rounded-lg border ${isOverbought ? 'bg-red-900/20 border-red-800/50' : 'bg-blue-900/20 border-blue-800/50'}`}>
            <h4 className={`font-bold text-lg mb-2 ${isOverbought ? 'text-red-300' : 'text-blue-300'}`}>
                {isOverbought ? '🔴 Overbought Leader:' : '🔵 Oversold Leader:'} {leader.coin}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                <li>{leader.count} timeframes in extreme zone</li>
                {leader.entryText && <li>{leader.entryText}</li>}
                <li><b>Comment:</b> {leader.comment}</li>
                {leader.priceComment && <li>💰 {leader.priceComment}</li>}
            </ul>
            {leader.others.length > 0 && (
                <div className="mt-3">
                    <h5 className="font-semibold text-gray-400 text-sm">Other notable coins:</h5>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {leader.others.map(o => (
                            <span key={o.coin} className="text-xs font-mono py-1 px-2 bg-gray-700 rounded-md">{o.badge} {o.coin} ({o.count} TF)</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const RsiFrequencyReport: React.FC<{ data: RsiReportData }> = ({ data }) => {
    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl p-4 md:p-6 space-y-6">
            <header className="border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">24-Hour RSI Frequency Analysis</h2>
                <p className="text-sm text-gray-400">Last updated: {new Date(data.lastUpdated).toLocaleString()}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                    <h3 className="font-bold text-lg text-red-400 mb-3">🔴 Overbought (RSI ≥ 70) - TOP 20</h3>
                    <div className="space-y-3">{data.overbought.map(o => <RsiCard key={o.coin} entity={o} type="overbought" />)}</div>
                </section>
                <section>
                    <h3 className="font-bold text-lg text-blue-400 mb-3">🔵 Oversold (RSI ≤ 30) - TOP 20</h3>
                    <div className="space-y-3">{data.oversold.map(o => <RsiCard key={o.coin} entity={o} type="oversold" />)}</div>
                </section>
            </div>
            
            <footer className="border-t border-gray-700 pt-4 space-y-4">
                <div>
                     <h3 className="font-bold text-lg text-white mb-3">💬 Automatic Analysis & Suggestions</h3>
                     <div className="space-y-4">
                        <AutoAnalysisSection analysis={data.autoAnalysis} type="overbought" />
                        <AutoAnalysisSection analysis={data.autoAnalysis} type="oversold" />
                     </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-200">📊 Statistics</h4>
                        <p>Total Tracked: {data.stats.totalTracked}</p>
                        <p>In Extreme Zones: {data.stats.totalExtreme}</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-200">📈 Market State: <span className="text-cyan-400">{data.marketCommentary.level}</span></h4>
                        <p>{data.marketCommentary.details}</p>
                    </div>
                </div>
                 <div className="text-center text-xs text-gray-500 pt-2">Next update around: {data.nextUpdate} UTC</div>
            </footer>
        </div>
    );
};

export default RsiFrequencyReport;
