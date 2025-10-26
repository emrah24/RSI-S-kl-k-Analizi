// Using a single, more stable proxy to avoid the complexity and unreliability of a fallback chain.
const PROXY_URL = 'https://cors.eu.org/';

const SPOT_BASE_URL = 'https://api.binance.com/api/v3';
const FUTURES_BASE_URL = 'https://fapi.binance.com/fapi/v1';
const FETCH_TIMEOUT = 20000; // 20 seconds

/**
 * A robust fetch function that uses a single proxy, with timeout and error handling.
 * @param targetUrl The Binance API URL to fetch.
 * @returns The parsed JSON data or null for non-critical errors.
 * @throws An error for critical failures like timeouts or network issues.
 */
async function fetchData<T>(targetUrl: string): Promise<T | null> {
    const proxiedUrl = `${PROXY_URL}${targetUrl}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
        const response = await fetch(proxiedUrl, { 
            signal: controller.signal,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                // Providing a generic origin can sometimes help with proxies
                'Origin': 'https://aistudio.google.com'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Proxy fetch failed for ${targetUrl.substring(0, 100)} with status ${response.status}: ${errorText.substring(0, 200)}`);
            throw new Error(`Data fetch failed with status: ${response.status}. The proxy may be down.`);
        }

        const data = await response.json();

        // Handle Binance's own API errors which are returned with a 200 OK status
        if (data && data.code && data.code < 0) {
             if(data.code === -1121) { // Invalid symbol, can happen with delisted pairs. Treat as a non-error.
                return null;
             }
             console.warn(`Binance API error for ${targetUrl.substring(0, 100)}...: ${data.msg}`);
             return null; // Treat other Binance API errors as non-fatal for individual kline fetches.
        }
        
        return data as T;

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error(`Request timed out for ${targetUrl.substring(0, 100)}`);
            throw new Error('Request timed out. The proxy or Binance API is not responding.');
        }
        // Re-throw other network errors to be caught by the main analysis logic
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}


// --- API Functions ---

export async function getSpotSymbols(): Promise<string[]> {
    const targetUrl = `${SPOT_BASE_URL}/exchangeInfo`;
    const data = await fetchData<{ symbols: { symbol: string, status: string }[] }>(targetUrl);
    
    if (!data || !data.symbols) {
        throw new Error("Could not retrieve market symbols from Binance Spot. The response was empty or invalid.");
    }
    
    return data.symbols
        .filter(s => s.symbol.endsWith('USDT') && s.status === 'TRADING' && !['UP', 'DOWN', 'BEAR', 'BULL'].some(x => s.symbol.includes(x)))
        .map(s => s.symbol);
}

export async function getFuturesSymbols(): Promise<string[]> {
    const targetUrl = `${FUTURES_BASE_URL}/exchangeInfo`;
    const data = await fetchData<{ symbols: { symbol: string, status: string }[] }>(targetUrl);

    if (!data || !data.symbols) {
        throw new Error("Could not retrieve market symbols from Binance Futures. The response was empty or invalid.");
    }
    
    return data.symbols
        .filter(s => s.symbol.endsWith('USDT') && s.status === 'TRADING')
        .map(s => s.symbol);
}

export async function getKlines(
    symbol: string,
    interval: string,
    limit: number,
    dataSource: 'SPOT' | 'FUTURES'
): Promise<any[] | null> {
    const baseUrl = dataSource === 'SPOT' ? SPOT_BASE_URL : FUTURES_BASE_URL;
    const targetUrl = `${baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    return await fetchData<any[]>(targetUrl);
}
