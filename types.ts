
export interface Kline {
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closeTime: number;
    quoteAssetVolume: string;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: string;
    takerBuyQuoteAssetVolume: string;
    ignore: string;
}

export interface TimeframeData {
    count: number;
    timeframes: Record<string, number>;
}

export interface CoinAppearance {
    overbought: TimeframeData;
    oversold: TimeframeData;
}

export interface CoinTrackingData {
    appearances: Record<string, CoinAppearance>;
    last_seen: Record<string, Date>;
    first_prices: Record<string, { overbought: number | null; oversold: number | null; }>;
    coin_types: Record<string, 'SPOT' | 'FUTURES'>;
    current_prices: Record<string, number>;
    trend_entries: Record<string, { overbought_entries: number; oversold_entries: number; }>;
    last_rsi_states: Record<string, Record<string, 'overbought' | 'oversold' | 'normal'>>;
}

export interface BreakoutRawData {
    [symbol: string]: {
        rsi_1h: number | null;
        rsi_4h: number | null;
        price_4h_change: number | null;
        price_12h_change: number | null;
        volume_multiplier: number | null;
    }
}

export interface BreakoutOpportunity {
    symbol: string;
    score: number;
    price: number;
    rsi_1h: number;
    rsi_4h: number;
    price_4h_change: number;
    price_12h_change: number;
    volume_multiplier: number;
    tag: string;
    recommendation: string;
}

export interface RsiEntity {
    rank: number;
    coin: string;
    indicator: string;
    badge: string;
    positionChange: string;
    warning: string;
    timeframeStr: string;
    count: number;
    priceChangeStr: string;
}

export interface RsiReportData {
    overbought: RsiEntity[];
    oversold: RsiEntity[];
    stats: {
        totalTracked: number;
        totalExtreme: number;
    };
    marketCommentary: {
        level: string;
        details: string;
    };
    autoAnalysis: {
        overboughtLeader?: {
            coin: string;
            count: number;
            entryText: string;
            comment: string;
            priceComment: string;
            others: { badge: string; coin: string; count: number }[];
        };
        oversoldLeader?: {
            coin: string;
            count: number;
            entryText: string;
            comment: string;
            priceComment: string;
            others: { badge: string; coin: string; count: number }[];
        };
    };
    lastUpdated: string;
    nextUpdate: string;
    currentPositions: Record<string, Record<string, number>>;
}


export interface AnalysisResult {
    rsiReport: RsiReportData;
    breakoutOpportunities: BreakoutOpportunity[];
}

export interface ProgressUpdate {
    message: string;
    percentage: number;
}
