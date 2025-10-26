
import { getFuturesSymbols, getKlines } from './binanceService';
import { 
    CoinTrackingData, 
    BreakoutRawData, 
    AnalysisResult, 
    RsiReportData,
    ProgressUpdate,
    BreakoutOpportunity,
    RsiEntity
} from '../types';

const INITIAL_COIN_TRACKING_DATA: CoinTrackingData = {
    appearances: {},
    last_seen: {},
    first_prices: {},
    coin_types: {},
    current_prices: {},
    trend_entries: {},
    last_rsi_states: {},
};

/**
 * Runs a list of promise-returning functions with a specified concurrency limit.
 * @param tasks An array of functions that each return a Promise.
 * @param limit The maximum number of tasks to run concurrently.
 * @returns A promise that resolves when all tasks have completed.
 */
async function limitConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<void> {
    const activePromises: Promise<void>[] = [];
    let taskIndex = 0;

    for (let i = 0; i < limit; i++) {
        activePromises.push(runNext());
    }

    async function runNext(): Promise<void> {
        if (taskIndex >= tasks.length) {
            return;
        }
        const currentTaskIndex = taskIndex++;
        const task = tasks[currentTaskIndex];
        
        try {
            await task();
        } catch (error) {
            // Log the error for the specific task but don't stop the entire batch
            console.error(`A task for symbol index ${currentTaskIndex} failed:`, error);
        }
        
        await runNext();
    }

    await Promise.all(activePromises);
}

// --- Technical Analysis ---
function calculateRsi(prices: number[], period: number = 14): number | null {
    if (prices.length < period) return null;
    
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
        const delta = prices[i] - prices[i - 1];
        if (i <= period) {
            if (delta > 0) {
                gains += delta;
            } else {
                losses -= delta;
            }
        }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
        const delta = prices[i] - prices[i - 1];
        if (delta > 0) {
            avgGain = (avgGain * (period - 1) + delta) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgLoss = (avgLoss * (period - 1) - delta) / period;
            avgGain = (avgGain * (period - 1)) / period;
        }
    }

    if (avgLoss === 0) {
        return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return rsi;
}


// --- Main Analysis Orchestration ---
export async function performFullAnalysis(
    onProgress: (update: ProgressUpdate) => void,
    lastPositions: Record<string, Record<string, number>>
): Promise<AnalysisResult> {
    
    let coinTracking: CoinTrackingData = JSON.parse(JSON.stringify(INITIAL_COIN_TRACKING_DATA));
    let breakoutRawData: BreakoutRawData = {};

    onProgress({ message: 'Fetching all Futures market symbols...', percentage: 5 });

    const futuresSymbols = await getFuturesSymbols();
    
    if (!futuresSymbols || futuresSymbols.length === 0) {
        throw new Error("Could not fetch symbols from Binance Futures. Analysis cannot continue.");
    }
    
    const symbolsToScan = futuresSymbols;
    const totalSymbols = symbolsToScan.length;

    const timeframes = {
        '15m': { interval: '15m', limit: 100 },
        '1h': { interval: '1h', limit: 100 },
        '4h': { interval: '4h', limit: 100 },
        '8h': { interval: '8h', limit: 100 },
        '12h': { interval: '12h', limit: 100 },
        '1d': { interval: '1d', limit: 100 },
    };

    const processSymbol = async (symbol: string, index: number) => {
        const dataSource = 'FUTURES';
        const currentTime = new Date();
        breakoutRawData[symbol] = { rsi_1h: null, rsi_4h: null, price_4h_change: null, price_12h_change: null, volume_multiplier: null };

        // 1. General RSI Frequency Data
        for (const [tfName, tfParams] of Object.entries(timeframes)) {
            const klines = await getKlines(symbol, tfParams.interval, tfParams.limit, dataSource);
            if (klines && klines.length > 14) {
                const closePrices = klines.map(k => parseFloat(k[4]));
                const rsi = calculateRsi(closePrices);
                const currentPrice = closePrices[closePrices.length - 1];
                if (rsi !== null && !isNaN(rsi)) {
                    updateCoinTracking(coinTracking, symbol, tfName, rsi, currentTime, currentPrice, dataSource);
                }
            }
        }

        // 2. Breakout Hunter Data
        try {
            // 1h Data
            const klines1h = await getKlines(symbol, '1h', 24, dataSource);
            if (klines1h && klines1h.length >= 14) {
                const prices1h = klines1h.map(k => parseFloat(k[4]));
                const volumes1h = klines1h.map(k => parseFloat(k[5]));
                breakoutRawData[symbol].rsi_1h = calculateRsi(prices1h);
                if (volumes1h.length >= 24) {
                    const currentVolume = volumes1h[volumes1h.length - 1];
                    const avgVolume = volumes1h.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes1h.length - 1);
                    breakoutRawData[symbol].volume_multiplier = avgVolume > 0 ? currentVolume / avgVolume : 0;
                }
            }
            // 4h Data
            const klines4h = await getKlines(symbol, '4h', 24, dataSource);
            if (klines4h && klines4h.length >= 2) {
                 const prices4h = klines4h.map(k => parseFloat(k[4]));
                 if(prices4h.length >= 14) breakoutRawData[symbol].rsi_4h = calculateRsi(prices4h);
                 const priceNow = prices4h[prices4h.length - 1];
                 const price4hAgo = prices4h[prices4h.length - 2];
                 breakoutRawData[symbol].price_4h_change = price4hAgo > 0 ? ((priceNow - price4hAgo) / price4hAgo) * 100 : 0;
            }
            // 12h Data
            const klines12h = await getKlines(symbol, '12h', 24, dataSource);
            if (klines12h && klines12h.length >= 2) {
                 const prices12h = klines12h.map(k => parseFloat(k[4]));
                 const priceNow = prices12h[prices12h.length - 1];
                 const price12hAgo = prices12h[prices12h.length - 2];
                 breakoutRawData[symbol].price_12h_change = price12hAgo > 0 ? ((priceNow - price12hAgo) / price12hAgo) * 100 : 0;
            }
        } catch (e) {
            // Ignore errors for individual symbols in breakout hunter section
            console.warn(`Could not process breakout data for ${symbol}:`, e)
        }

        onProgress({
            message: `Scanning... ${symbol}`,
            percentage: 10 + (80 * (index + 1) / totalSymbols),
        });
    };

    const tasks = symbolsToScan.map((symbol, index) => () => processSymbol(symbol, index));
    // Use a concurrency limiter to avoid overwhelming the proxy service
    await limitConcurrency(tasks, 15);

    onProgress({ message: 'Analyzing data...', percentage: 90 });
    const breakoutOpportunities = analyzeBreakoutOpportunities(breakoutRawData, coinTracking);

    onProgress({ message: 'Generating reports...', percentage: 95 });
    const rsiReport = generateTrackingReport(coinTracking, lastPositions);
    
    return { rsiReport, breakoutOpportunities };
}

// --- Data Update Logic ---
function updateCoinTracking(
    ct: CoinTrackingData, coin: string, timeframe: string, rsi_value: number, 
    current_time: Date, current_price: number, coin_type: 'SPOT' | 'FUTURES'
) {
    if (!ct.appearances[coin]) {
        const tfs = ['15m', '1h', '4h', '8h', '12h', '1d'];
        ct.appearances[coin] = {
            overbought: { count: 0, timeframes: Object.fromEntries(tfs.map(tf => [tf, 0])) },
            oversold: { count: 0, timeframes: Object.fromEntries(tfs.map(tf => [tf, 0])) }
        };
        ct.first_prices[coin] = { overbought: null, oversold: null };
        ct.trend_entries[coin] = { overbought_entries: 0, oversold_entries: 0 };
        ct.last_rsi_states[coin] = {};
    }

    ct.current_prices[coin] = current_price;
    ct.coin_types[coin] = coin_type;
    trackTrendEntry(ct, coin, timeframe, rsi_value);

    if (rsi_value >= 70) {
        ct.appearances[coin].overbought.count++;
        ct.appearances[coin].overbought.timeframes[timeframe]++;
        if (ct.first_prices[coin].overbought === null) {
            ct.first_prices[coin].overbought = current_price;
        }
    } else if (rsi_value <= 30) {
        ct.appearances[coin].oversold.count++;
        ct.appearances[coin].oversold.timeframes[timeframe]++;
        if (ct.first_prices[coin].oversold === null) {
            ct.first_prices[coin].oversold = current_price;
        }
    }
    ct.last_seen[coin] = current_time;
}

function trackTrendEntry(ct: CoinTrackingData, coin: string, timeframe: string, rsi_value: number) {
    const last_state = ct.last_rsi_states[coin][timeframe] || 'normal';
    let current_state: 'overbought' | 'oversold' | 'normal' = 'normal';

    if (rsi_value >= 70) {
        current_state = 'overbought';
        if (last_state !== 'overbought') {
            ct.trend_entries[coin].overbought_entries++;
        }
    } else if (rsi_value <= 30) {
        current_state = 'oversold';
        if (last_state !== 'oversold') {
            ct.trend_entries[coin].oversold_entries++;
        }
    }
    ct.last_rsi_states[coin][timeframe] = current_state;
}

// --- Breakout Hunter Analysis ---
function analyzeBreakoutOpportunities(raw_data: BreakoutRawData, ct: CoinTrackingData): BreakoutOpportunity[] {
    const opportunities: BreakoutOpportunity[] = [];
    for (const [symbol, data] of Object.entries(raw_data)) {
        const { rsi_1h, rsi_4h, price_4h_change, price_12h_change, volume_multiplier } = data;
        const current_price = ct.current_prices[symbol];

        if (!rsi_1h || !rsi_4h || price_4h_change === null || price_12h_change === null || !current_price || volume_multiplier === null) continue;

        const is_dip_position = (35 <= rsi_4h && rsi_4h <= 65);
        const is_strong_momentum = (price_4h_change > 1.0);
        const is_volume_confirm = (volume_multiplier >= 0.5);

        if (is_dip_position && is_strong_momentum && is_volume_confirm) {
            let total_score = 50;
            total_score += Math.min(price_4h_change * 8, 40);
            total_score += Math.max(0, 50 - rsi_4h) * 1.5;
            total_score += Math.min(volume_multiplier * 5, 20);
            if (price_12h_change < 0) total_score += 10;
            if (rsi_1h >= 65) total_score += 10;
            
            let tag = "⚖️ DÜŞÜK", recommendation = "⚠️ İZLE";
            if (total_score >= 100) {
                tag = "🔥 GÜÇLÜ";
                recommendation = "🚀 İLK PULLBACK'TE GİRİŞ";
            } else if (total_score >= 75) {
                tag = "⚡ ORTA";
                recommendation = "⚡ YAKINDAN TAKİP";
            }

            opportunities.push({
                symbol, score: Math.round(total_score), price: current_price,
                rsi_1h, rsi_4h, price_4h_change, price_12h_change, volume_multiplier,
                tag, recommendation
            });
        }
    }
    return opportunities.sort((a, b) => b.score - a.score).slice(0, 10);
}


// --- RSI Frequency Report Generation ---
function generateTrackingReport(ct: CoinTrackingData, lastPositions: Record<string, Record<string, number>>): RsiReportData {
    const currentPositions: Record<string, Record<string, number>> = { overbought: {}, oversold: {} };
    const overboughtList = Object.entries(ct.appearances)
        .filter(([, d]) => d.overbought.count > 0)
        .sort(([, a], [, b]) => b.overbought.count - a.overbought.count);
    
    const oversoldList = Object.entries(ct.appearances)
        .filter(([, d]) => d.oversold.count > 0)
        .sort(([, a], [, b]) => b.oversold.count - a.oversold.count);

    const formatEntity = (
        [coin, data]: [string, any], 
        index: number, 
        type: 'overbought' | 'oversold'
    ): RsiEntity => {
        const rank = index + 1;
        currentPositions[type][coin] = rank;
        const lastRank = lastPositions[type]?.[coin];
        let positionChange = "🆕";
        let comment = type === 'overbought' ? "✨ YENİ GİRİŞ" : "✨ YENİ GİRİŞ";
        if (lastRank !== undefined) {
            const diff = lastRank - rank;
            if (diff > 0) {
                positionChange = type === 'overbought' ? `⬆️+${diff}` : `⬇️+${diff}`;
                comment = type === 'overbought' ? "🚨 ZİRVE YAKLAŞIYOR" : "📈 TOPARLANMA";
            } else if (diff < 0) {
                positionChange = type === 'overbought' ? `⬇️${diff}` : `⬆️${diff}`;
                comment = type === 'overbought' ? "⚠️ GÜÇ KAYBI" : "💎 DİP YAKLAŞIYOR";
            } else {
                positionChange = "➡️";
                comment = "⚖️ STABİL";
            }
        }
        
        const typeData = data[type];
        const tf_str = Object.entries(typeData.timeframes)
            .filter(([, c]) => (c as number) > 0)
            .map(([tf, c]) => `${tf}(${c})`)
            .join(" | ");

        const entry_count = ct.trend_entries[coin]?.[`${type}_entries`] ?? 0;
        let badge = "";
        if (type === 'overbought') {
            if (entry_count >= 3) badge = `🔥×${entry_count}`;
            else if (entry_count >= 2) badge = `⚡×${entry_count}`;
        } else {
            if (entry_count >= 3) badge = `💎×${entry_count}`;
            else if (entry_count >= 2) badge = `🔹×${entry_count}`;
        }

        let priceChangeStr = "";
        const cp = ct.current_prices[coin];
        const fp = ct.first_prices[coin]?.[type];
        if (cp && fp) {
            const pc = ((cp - fp) / fp) * 100;
            const pce = pc >= 0 ? "📈" : "📉";
            priceChangeStr = `${fp.toFixed(6)} → ${cp.toFixed(6)} ${pce} ${pc.toFixed(2)}%`;
        }

        return {
            rank, coin,
            indicator: ct.coin_types[coin] === 'FUTURES' ? "F" : "",
            badge, positionChange,
            warning: comment,
            timeframeStr: tf_str,
            count: typeData.count,
            priceChangeStr,
        };
    };

    const overbought = overboughtList.slice(0, 20).map((item, i) => formatEntity(item, i, 'overbought'));
    const oversold = oversoldList.slice(0, 20).map((item, i) => formatEntity(item, i, 'oversold'));
    
    // Auto Analysis
    let autoAnalysis: RsiReportData['autoAnalysis'] = {};
    if (overboughtList.length > 0) {
        const top_ob = overboughtList[0];
        const coin = top_ob[0];
        const data = top_ob[1].overbought;
        const entries = ct.trend_entries[coin]?.overbought_entries ?? 0;
        let entryText = "", comment = "";
        if (entries >= 3) { entryText = `🔥 ${entries}× TRENDING GİRİŞİ!`; comment = "Çok güçlü SHORT fırsatı. Kar alma zamanı."; }
        else if (entries >= 2) { entryText = `⚡ ${entries}× trending girişi`; comment = "Güçlü SHORT sinyali. Momentum kırılması yakın."; }
        else { comment = "İlk trending girişi. Daha fazla TF'ye yayılırsa short düşünülebilir."; }
        
        let priceComment = "";
        const cp = ct.current_prices[coin]; const fp = ct.first_prices[coin]?.overbought;
        if(cp && fp) {
            const pc = ((cp - fp) / fp) * 100;
            priceComment = pc > 0 ? `İlk yakalamadan +${pc.toFixed(2)}% yükselmiş - Zirve yakın!` : `Fiyat düşüyor (${pc.toFixed(2)}%) - Momentum kırılıyor.`;
        }

        autoAnalysis.overboughtLeader = {
            coin, count: data.count, entryText, comment, priceComment,
            others: overboughtList.slice(1, 4).map(([c, d]) => {
                const e = ct.trend_entries[c]?.overbought_entries ?? 0;
                return { coin: c, count: d.overbought.count, badge: e >= 3 ? "🔥" : e >= 2 ? "⚡" : "👀" };
            })
        };
    }
     if (oversoldList.length > 0) {
        const top_os = oversoldList[0];
        const coin = top_os[0];
        const data = top_os[1].oversold;
        const entries = ct.trend_entries[coin]?.oversold_entries ?? 0;
        let entryText = "", comment = "";
        if (entries >= 3) { entryText = `💎 ${entries}× TRENDING GİRİŞİ!`; comment = "Çok güçlü LONG fırsatı. Dipten toplanabilir."; }
        else if (entries >= 2) { entryText = `🔹 ${entries}× trending girişi`; comment = "Güçlü LONG sinyali. Toparlanma yakın."; }
        else { comment = "İlk trending girişi. Daha fazla TF'ye yayılırsa long düşünülebilir."; }
        
        let priceComment = "";
        const cp = ct.current_prices[coin]; const fp = ct.first_prices[coin]?.oversold;
        if(cp && fp) {
            const pc = ((cp - fp) / fp) * 100;
            priceComment = pc < 0 ? `İlk yakalamadan ${Math.abs(pc).toFixed(2)}% düşmüş - Dip yakın!` : `Fiyat yükseliyor (+${pc.toFixed(2)}%) - Toparlanma başladı.`;
        }
        autoAnalysis.oversoldLeader = {
            coin, count: data.count, entryText, comment, priceComment,
            others: oversoldList.slice(1, 4).map(([c, d]) => {
                const e = ct.trend_entries[c]?.oversold_entries ?? 0;
                return { coin: c, count: d.oversold.count, badge: e >= 3 ? "💎" : e >= 2 ? "🔹" : "👀" };
            })
        };
    }

    const totalExtreme = overboughtList.length + oversoldList.length;
    let marketCommentary;
    if (totalExtreme > 50) marketCommentary = { level: "ÇOK HAREKETLİ!", details: `Volatilite yüksek. Fırsatlar çok ama risk de yüksek! (${totalExtreme} coin)` };
    else if (totalExtreme > 20) marketCommentary = { level: "ORTA SEVİYE", details: `Fırsatlar için BTC ve ETH'nin yönünü kontrol edin. (${totalExtreme} coin)` };
    else marketCommentary = { level: "SAKİN", details: `Düşük volatilite. Bekle-gör uygun olabilir. (${totalExtreme} coin)` };

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(now.getHours() + 1, 59, 0, 0);

    return {
        overbought,
        oversold,
        stats: { totalTracked: Object.keys(ct.appearances).length, totalExtreme },
        marketCommentary,
        autoAnalysis,
        lastUpdated: now.toUTCString(),
        nextUpdate: nextRun.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        currentPositions
    };
}