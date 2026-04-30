import { UCM_HOST, UCM_PORT, UCM_USERNAME, UCM_PASSWORD } from '$env/static/private';
import crypto from 'crypto';

const BASE_URL = `https://${UCM_HOST}:${UCM_PORT}`;

// ─── Auth cache ───────────────────────────────────────────────────────────────
let cachedCookie: string | null = null;
let cookieExpiresAt = 0;

async function ucmPost(body: object): Promise<any> {
    // 1. THIS IS CORRECT, THIS FUNCTION SERVERS AS THE "SEND MESSAGE TO UCM"
    const res = await fetch(`${BASE_URL}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}
// 2. THIS GETS THE CHALLENGE TOKEN
async function getChallenge(): Promise<string> {
    const data = await ucmPost({ //SEND THE CHALLENGE TO UCM 
        request: { 
            action: 'challenge', 
            user: UCM_USERNAME 
        }
    });
    return data.response?.challenge ?? '';
}

async function login(challenge: string): Promise<string> {
    const token = crypto.createHash('md5').update(challenge + UCM_PASSWORD).digest('hex');
    // 3 IF THE CHALLENGE PLUS PASSWORD IS RIGHT, THEN LOGIN
    const data = await ucmPost({ 
        request: { 
            action: 'login', 
            user: UCM_USERNAME, 
            token 
        } 
    });

    if (data.status !== 0){
        throw new Error('UCM login failed');
    }

    return data.response?.cookie ?? '';
}
//4. GET THE VALID COOKIE
export async function getValidCookie(): Promise<string> {
    const now = Date.now();
    if (cachedCookie && now < cookieExpiresAt) {
        return cachedCookie
    }; //if the cached cookie still valid, then dont change

    const challenge = await getChallenge(); //ask for the challenge for the cdr username
    const cookie = await login(challenge); // get the valid cookie 
    cachedCookie = cookie;
    cookieExpiresAt = now + 9 * 60 * 1000;
    return cookie;
}

// ─── CDR ──────────────────────────────────────────────────────────────────────
export interface CDRRecord {
    cdr: string;
    src: string;
    dst: string;
    start: string;         // "YYYY-MM-DD HH:MM:SS"
    answer: string | null;
    end: string;
    duration: number;
    billsec: number;
    disposition: string;
    userfield: string;     // "Inbound" | "Outbound" | "Internal" (or empty)
    src_trunk_name: string;
    dst_trunk_name: string;
    caller_name: string;
}

export type CallDirection = 'inbound' | 'outbound' | 'internal' | 'unknown';

export function getCallDirection(r: CDRRecord): CallDirection {
    const uf = r.userfield.trim().toLowerCase();
    if (uf === 'inbound')  return 'inbound';
    if (uf === 'outbound') return 'outbound';
    if (uf === 'internal') return 'internal';

    // Fallback: trunk analysis
    if (r.src_trunk_name) return 'inbound';
    if (r.dst_trunk_name) return 'outbound';

    return 'internal';
}

async function fetchCDRPage(params: {
    startTime: string;
    endTime: string;
    numRecords: number;
    offset: number;
}): Promise<CDRRecord[]> {
    const cookie = await getValidCookie();
    
    // New API: CDR via POST /api (same port 8089 as management, no legacy /cdrapi endpoint)
    const data = await ucmPost({
        request: {
            action:     'cdrapi',
            cookie,
            format:     'json',
            startTime:  params.startTime,
            endTime:    params.endTime,
            numRecords: params.numRecords,
            offset:     params.offset,
        }
    });

    const entries: any[] = data.cdr_root ?? [];

    return entries.map((entry) => {
        // response can be flat or nested under main_cdr
        const r = entry.main_cdr ?? entry;
        return {
            cdr:            r.cdr ?? r.uniqueid ?? '',
            src:            r.src            ?? '',
            dst:            r.dst            ?? '',
            start:          r.start          ?? '',
            answer:         r.answer         ?? null,
            end:            r.end            ?? '',
            duration:       Number(r.duration  ?? 0),
            billsec:        Number(r.billsec   ?? 0),
            disposition:    r.disposition    ?? '',
            userfield:      r.userfield      ?? '',
            src_trunk_name: r.src_trunk_name ?? '',
            dst_trunk_name: r.dst_trunk_name ?? '',
            caller_name:    r.caller_name    ?? '',
        } satisfies CDRRecord;
    });
}

/** Fetches all CDR records for the given period, paginating as needed. */
export async function fetchAllCDR(params: {
    startTime: string;
    endTime: string;
}): Promise<CDRRecord[]> {
    const PAGE = 1000;
    const all: CDRRecord[] = [];
    let offset = 0;
    let safetyCounter = 0;
    // Trava de segurança: máximo de 10 páginas (10.000 ligações)
    while (safetyCounter < 10) { 
        safetyCounter++;
        
        const batch = await fetchCDRPage({ ...params, numRecords: PAGE, offset });
        
        if (batch.length === 0) break;

        all.push(...batch);
        
        // Se a página vier com menos do que o limite que pedimos, chegamos ao fim
        if (batch.length < PAGE) {
            break;
        }
        
        offset += PAGE;
    }
    return all;
}
