const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;
const BASE_DIR = process.env.RENDER ? '/tmp' : '.';

// ================================================================
// ========== FILE STORAGE ==========
// ================================================================
const HISTORY_FILE = path.join(BASE_DIR, 'history.json');
const PREDICTIONS_FILE = path.join(BASE_DIR, 'predictions.json');
const PATTERNS_FILE = path.join(BASE_DIR, 'patterns.json');
const WEIGHTS_FILE = path.join(BASE_DIR, 'weights.json');
const SUNWIN_HISTORY_FILE = path.join(BASE_DIR, 'sunwin_history.json');
const TRAILS_HISTORY_FILE = path.join(BASE_DIR, 'trails_history.json');

function readFile(file, def) {
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (e) {
        console.error('Lỗi đọc file:', e.message);
    }
    return def;
}

function writeFile(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Lỗi ghi file:', e.message);
        return false;
    }
}

// Load dữ liệu
let gameHistory = readFile(HISTORY_FILE, []);
let predictionHistory = readFile(PREDICTIONS_FILE, []);
let patternLibrary = readFile(PATTERNS_FILE, {});
let modelWeights = readFile(WEIGHTS_FILE, {});
let sunwinHistory = readFile(SUNWIN_HISTORY_FILE, []);
let trailsHistory = readFile(TRAILS_HISTORY_FILE, []);

console.log(`📁 Game History: ${gameHistory.length} phiên`);
console.log(`📁 Sunwin History: ${sunwinHistory.length} phiên`);
console.log(`📁 Trails History: ${trailsHistory.length} phiên`);

// ================================================================
// ========== DETERMINISTIC ENGINE - 100% NO RANDOM ==========
// ================================================================
class DeterministicEngine {
    constructor(seed = 'SUNWIN_ULTIMATE_2024') {
        this.seed = seed;
        this.counter = 0;
        this.cache = new Map();
        console.log('🔒 DETERMINISTIC ENGINE - 100% NO RANDOM');
    }
    
    hash(input) {
        return crypto.createHash('sha256').update(String(input)).digest('hex');
    }
    
    next(seed = null) {
        const val = seed || this.seed + this.counter++;
        const key = `next_${val}`;
        if (this.cache.has(key)) return this.cache.get(key);
        const num = parseInt(this.hash(val).slice(0, 8), 16) / 0xFFFFFFFF;
        this.cache.set(key, num);
        return num;
    }
}

const det = new DeterministicEngine();

// ================================================================
// ========== ALGORITHM 1: SUNWIN ALGORITHM ==========
// ================================================================
class SunwinAlgorithm {
    constructor() {
        this.history = sunwinHistory;
        this.apiUrl = 'https://ls-sunwin-dm.onrender.com/api/ditmemaysun';
        this.name = 'SUNWIN';
        this.weights = {
            pattern: 1.0,
            frequency: 1.0,
            cycle: 1.0,
            streak: 1.0,
            markov: 1.0,
            bayesian: 1.0,
            momentum: 1.0,
            volatility: 1.0,
            trend: 1.0
        };
        this.lastUpdate = null;
        console.log(`🧠 ${this.name} ALGORITHM INITIALIZED`);
    }

    async loadHistory() {
        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (data && data.Phien) {
                const entry = {
                    phien: data.Phien,
                    Xuc_xac_1: data.Xuc_xac_1,
                    Xuc_xac_2: data.Xuc_xac_2,
                    Xuc_xac_3: data.Xuc_xac_3,
                    Tong: data.Tong,
                    Ketqua: data.Ket_qua
                };
                
                const exists = this.history.some(h => h.phien === entry.phien);
                if (!exists) {
                    this.history.push(entry);
                    writeFile(SUNWIN_HISTORY_FILE, this.history);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error(`❌ ${this.name} lỗi:`, error.message);
            return false;
        }
    }

    getResultArray(history) {
        return history.map(h => h.Ketqua || h.Ket_qua || (h.Tong >= 11 ? 'Tài' : 'Xỉu'));
    }

    getStreak(results) {
        if (!results || results.length === 0) return 0;
        const last = results[results.length - 1];
        let streak = 1;
        for (let i = results.length - 2; i >= 0; i--) {
            if (results[i] === last) streak++;
            else break;
        }
        return streak;
    }

    detectCycles(results) {
        const cycles = [];
        for (let len = 2; len <= 15; len++) {
            if (results.length < len * 2) continue;
            let matches = 0;
            for (let i = len; i < results.length; i++) {
                if (results[i] === results[i - len]) matches++;
            }
            const ratio = matches / (results.length - len);
            if (ratio > 0.6) {
                cycles.push({ length: len, strength: ratio, next: results[results.length - len] });
            }
        }
        cycles.sort((a, b) => b.strength - a.strength);
        return cycles.slice(0, 5);
    }

    detectPatterns(results) {
        const patterns = [];
        const last = results[results.length - 1];
        
        if (results.length >= 4) {
            const last4 = results.slice(-4);
            if (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] !== last4[3]) {
                patterns.push({ type: '1-1', confidence: 0.85, prediction: last4[3] === 'Tài' ? 'Xỉu' : 'Tài', desc: 'Xen kẽ 1-1' });
            }
        }
        
        if (results.length >= 6) {
            const last6 = results.slice(-6);
            if (last6[0] === last6[1] && last6[1] !== last6[2] &&
                last6[2] === last6[3] && last6[3] !== last6[4] &&
                last6[4] === last6[5]) {
                patterns.push({ type: '2-2', confidence: 0.8, prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', desc: 'Cặp 2-2' });
            }
        }
        
        const streak = this.getStreak(results);
        if (streak >= 3) {
            patterns.push({ type: 'bệt', confidence: 0.5 + streak * 0.05, prediction: last, desc: `Bệt ${streak} phiên` });
        }
        
        patterns.sort((a, b) => b.confidence - a.confidence);
        return patterns.slice(0, 5);
    }

    markovChain(results, order = 2) {
        if (results.length < order + 2) return null;
        const states = {};
        for (let i = order; i < results.length - 1; i++) {
            const state = results.slice(i - order, i).join('');
            const next = results[i];
            if (!states[state]) states[state] = { Tài: 0, Xỉu: 0 };
            states[state][next]++;
        }
        const currentState = results.slice(-order).join('');
        if (!states[currentState]) return null;
        const total = states[currentState].Tài + states[currentState].Xỉu;
        if (total === 0) return null;
        return {
            prediction: states[currentState].Tài > states[currentState].Xỉu ? 'Tài' : 'Xỉu',
            confidence: Math.max(states[currentState].Tài, states[currentState].Xỉu) / total
        };
    }

    bayesianInference(results) {
        if (results.length < 10) return null;
        const taiCount = results.filter(r => r === 'Tài').length;
        const xiuCount = results.length - taiCount;
        const posteriorTai = taiCount / results.length;
        const posteriorXiu = xiuCount / results.length;
        return {
            prediction: posteriorTai > posteriorXiu ? 'Tài' : 'Xỉu',
            confidence: Math.max(posteriorTai, posteriorXiu)
        };
    }

    analyzeFrequency(results) {
        const recent = results.slice(-30);
        const tai = recent.filter(r => r === 'Tài').length;
        const xiu = recent.length - tai;
        const total = recent.length || 1;
        return {
            tai, xiu, total,
            taiRatio: tai / total,
            xiuRatio: xiu / total,
            dominant: tai > xiu ? 'Tài' : 'Xỉu',
            ratio: Math.max(tai, xiu) / total
        };
    }

    predict(history) {
        let results = this.getResultArray(this.history);
        if (history && history.length > results.length) {
            results = this.getResultArray(history);
        }
        if (results.length < 3) {
            return { prediction: 'Xỉu', confidence: 0.5, type: `${this.name}-INIT`, detail: 'Chưa đủ dữ liệu' };
        }

        const methods = [];
        const freq = this.analyzeFrequency(results);
        if (freq.ratio > 0.55) {
            methods.push({
                method: 'frequency',
                prediction: freq.dominant === 'Tài' ? 'Xỉu' : 'Tài',
                confidence: 0.5 + (freq.ratio - 0.5) * 0.8,
                reason: `${freq.dominant} ${(freq.ratio*100).toFixed(1)}%`
            });
        }

        const patterns = this.detectPatterns(results);
        if (patterns.length > 0) {
            const best = patterns[0];
            methods.push({ method: 'pattern', prediction: best.prediction, confidence: best.confidence, reason: best.desc });
        }

        const cycles = this.detectCycles(results);
        if (cycles.length > 0) {
            const best = cycles[0];
            methods.push({
                method: 'cycle',
                prediction: best.next === 'Tài' ? 'Xỉu' : 'Tài',
                confidence: 0.5 + best.strength * 0.3,
                reason: `Chu kỳ ${best.length}`
            });
        }

        const markov = this.markovChain(results);
        if (markov && markov.confidence > 0.55) {
            methods.push({ method: 'markov', prediction: markov.prediction, confidence: markov.confidence, reason: 'Markov' });
        }

        const bayes = this.bayesianInference(results);
        if (bayes && bayes.confidence > 0.55) {
            methods.push({ method: 'bayesian', prediction: bayes.prediction, confidence: bayes.confidence, reason: 'Bayesian' });
        }

        let taiWeight = 0, xiuWeight = 0, totalWeight = 0;
        const details = [];
        for (const method of methods) {
            const weight = method.confidence * (this.weights[method.method] || 1.0);
            if (method.prediction === 'Tài') taiWeight += weight;
            else xiuWeight += weight;
            totalWeight += weight;
            details.push({ method: method.method, prediction: method.prediction, confidence: method.confidence, reason: method.reason });
        }

        if (totalWeight === 0) {
            const last = results[results.length - 1];
            return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.5, type: `${this.name}-FALLBACK`, detail: 'Không đủ tín hiệu' };
        }

        const finalPred = taiWeight > xiuWeight ? 'Tài' : 'Xỉu';
        const finalConf = Math.max(taiWeight, xiuWeight) / totalWeight;
        const consensus = details.filter(d => d.prediction === finalPred).length;
        const boost = Math.min(consensus * 0.03, 0.15);

        let type = `${this.name}-ENSEMBLE`;
        let detail = `${details.length} methods`;
        if (patterns.length > 0) {
            const best = patterns[0];
            type = `${this.name}-${best.type.toUpperCase()}`;
            detail = best.desc;
        }
        const streak = this.getStreak(results);
        if (streak >= 4) {
            type = `${this.name}-ANTI-STREAK`;
            detail = `Đảo bệt ${streak}`;
        }

        return {
            prediction: finalPred,
            confidence: Math.min(finalConf + boost, 0.95),
            type: type,
            detail: detail,
            details: details.slice(0, 5),
            totalMethods: details.length,
            history_count: this.history.length,
            source: this.name
        };
    }
}

// ================================================================
// ========== ALGORITHM 2: TRAILS ALGORITHM ==========
// ================================================================
class TrailsAlgorithm {
    constructor() {
        this.history = trailsHistory;
        this.apiUrl = 'https://trails-wish-motel-legacy.trycloudflare.com/api/tx';
        this.name = 'TRAILS';
        this.weights = {
            pattern: 1.0,
            frequency: 1.0,
            cycle: 1.0,
            streak: 1.0,
            markov: 1.0,
            bayesian: 1.0,
            momentum: 1.0,
            volatility: 1.0,
            trend: 1.0,
            quantum: 1.0
        };
        this.lastUpdate = null;
        console.log(`🧠 ${this.name} ALGORITHM INITIALIZED`);
    }

    async loadHistory() {
        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (data && data.phien) {
                const entry = {
                    phien: data.phien,
                    Xuc_xac_1: data.xuc_xac_1,
                    Xuc_xac_2: data.xuc_xac_2,
                    Xuc_xac_3: data.xuc_xac_3,
                    Tong: data.tong,
                    Ketqua: data.ket_qua,
                    thoi_gian: data.thoi_gian
                };
                
                const exists = this.history.some(h => h.phien === entry.phien);
                if (!exists) {
                    this.history.push(entry);
                    writeFile(TRAILS_HISTORY_FILE, this.history);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error(`❌ ${this.name} lỗi:`, error.message);
            return false;
        }
    }

    getResultArray(history) {
        return history.map(h => h.Ketqua || h.Ket_qua || (h.Tong >= 11 ? 'Tài' : 'Xỉu'));
    }

    getStreak(results) {
        if (!results || results.length === 0) return 0;
        const last = results[results.length - 1];
        let streak = 1;
        for (let i = results.length - 2; i >= 0; i--) {
            if (results[i] === last) streak++;
            else break;
        }
        return streak;
    }

    getScoreArray(history) {
        return history.map(h => h.Tong || 0);
    }

    analyzeQuantum(results) {
        if (results.length < 5) return { prediction: null, confidence: 0 };
        // Quantum superposition: phân tích cả trạng thái Tài và Xỉu cùng lúc
        const taiCount = results.filter(r => r === 'Tài').length;
        const xiuCount = results.length - taiCount;
        const total = results.length;
        const probTai = taiCount / total;
        const probXiu = xiuCount / total;
        const entanglement = Math.abs(probTai - probXiu);
        return {
            taiProb: probTai,
            xiuProb: probXiu,
            prediction: probTai > probXiu ? 'Tài' : 'Xỉu',
            confidence: 0.5 + entanglement * 0.4,
            entanglement: entanglement
        };
    }

    analyzeVolatility(results) {
        if (results.length < 5) return { volatility: 0, prediction: null };
        let changes = 0;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) changes++;
        }
        const volatility = changes / (results.length - 1);
        const last = results[results.length - 1];
        return {
            volatility: volatility,
            prediction: volatility > 0.5 ? (last === 'Tài' ? 'Xỉu' : 'Tài') : last,
            confidence: 0.5 + volatility * 0.3
        };
    }

    analyzeMomentum(results) {
        if (results.length < 10) return { momentum: 0, strength: 0, prediction: null };
        const recent = results.slice(-10);
        const taiCount = recent.filter(r => r === 'Tài').length;
        const momentum = (taiCount / 10 - 0.5) * 2;
        const strength = Math.abs(momentum);
        return {
            momentum: momentum,
            strength: strength,
            prediction: momentum > 0.2 ? 'Xỉu' : (momentum < -0.2 ? 'Tài' : null),
            confidence: 0.5 + strength * 0.3
        };
    }

    analyzeTrend(results) {
        if (results.length < 15) return { trend: 0, strength: 0, prediction: null };
        const segments = Math.floor(results.length / 5);
        let trend = 0;
        for (let i = 0; i < segments - 1; i++) {
            const seg1 = results.slice(i*5, (i+1)*5);
            const seg2 = results.slice((i+1)*5, (i+2)*5);
            const tai1 = seg1.filter(r => r === 'Tài').length;
            const tai2 = seg2.filter(r => r === 'Tài').length;
            trend += (tai2 - tai1);
        }
        const strength = Math.min(Math.abs(trend) / 5, 1);
        const direction = trend > 0 ? 'Tài' : 'Xỉu';
        return {
            trend: trend / (segments - 1 || 1),
            strength: strength,
            direction: direction,
            prediction: strength > 0.4 ? (direction === 'Tài' ? 'Xỉu' : 'Tài') : null,
            confidence: 0.5 + strength * 0.3
        };
    }

    detectPatterns(results) {
        const patterns = [];
        const last = results[results.length - 1];
        
        if (results.length >= 4) {
            const last4 = results.slice(-4);
            if (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] !== last4[3]) {
                patterns.push({ type: '1-1', confidence: 0.85, prediction: last4[3] === 'Tài' ? 'Xỉu' : 'Tài', desc: 'Xen kẽ 1-1' });
            }
        }
        
        if (results.length >= 6) {
            const last6 = results.slice(-6);
            if (last6[0] === last6[1] && last6[1] !== last6[2] &&
                last6[2] === last6[3] && last6[3] !== last6[4] &&
                last6[4] === last6[5]) {
                patterns.push({ type: '2-2', confidence: 0.8, prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', desc: 'Cặp 2-2' });
            }
        }
        
        if (results.length >= 9) {
            const last9 = results.slice(-9);
            if (last9[0] === last9[1] && last9[1] === last9[2] &&
                last9[3] === last9[4] && last9[4] === last9[5] &&
                last9[6] === last9[7] && last9[7] === last9[8] &&
                last9[0] !== last9[3] && last9[3] !== last9[6]) {
                patterns.push({ type: '3-3', confidence: 0.9, prediction: last9[6] === 'Tài' ? 'Xỉu' : 'Tài', desc: 'Cặp 3-3' });
            }
        }
        
        const streak = this.getStreak(results);
        if (streak >= 3) {
            patterns.push({ type: 'bệt', confidence: 0.5 + streak * 0.05, prediction: last, desc: `Bệt ${streak}` });
        }
        
        patterns.sort((a, b) => b.confidence - a.confidence);
        return patterns.slice(0, 5);
    }

    predict(history) {
        let results = this.getResultArray(this.history);
        if (history && history.length > results.length) {
            results = this.getResultArray(history);
        }
        if (results.length < 3) {
            return { prediction: 'Xỉu', confidence: 0.5, type: `${this.name}-INIT`, detail: 'Chưa đủ dữ liệu' };
        }

        const methods = [];
        const freq = this.analyzeFrequency(results);
        if (freq.ratio > 0.55) {
            methods.push({
                method: 'frequency',
                prediction: freq.dominant === 'Tài' ? 'Xỉu' : 'Tài',
                confidence: 0.5 + (freq.ratio - 0.5) * 0.8,
                reason: `${freq.dominant} ${(freq.ratio*100).toFixed(1)}%`
            });
        }

        const patterns = this.detectPatterns(results);
        if (patterns.length > 0) {
            const best = patterns[0];
            methods.push({ method: 'pattern', prediction: best.prediction, confidence: best.confidence, reason: best.desc });
        }

        // Quantum analysis
        const quantum = this.analyzeQuantum(results);
        if (quantum.confidence > 0.6) {
            methods.push({ method: 'quantum', prediction: quantum.prediction, confidence: quantum.confidence, reason: `Lượng tử ${(quantum.entanglement*100).toFixed(0)}%` });
        }

        // Volatility
        const vol = this.analyzeVolatility(results);
        if (vol.confidence > 0.6) {
            methods.push({ method: 'volatility', prediction: vol.prediction, confidence: vol.confidence, reason: `Biến động ${(vol.volatility*100).toFixed(0)}%` });
        }

        // Momentum
        const mom = this.analyzeMomentum(results);
        if (mom.prediction && mom.confidence > 0.6) {
            methods.push({ method: 'momentum', prediction: mom.prediction, confidence: mom.confidence, reason: `Momentum ${(mom.momentum*100).toFixed(0)}%` });
        }

        // Trend
        const trend = this.analyzeTrend(results);
        if (trend.prediction && trend.confidence > 0.6) {
            methods.push({ method: 'trend', prediction: trend.prediction, confidence: trend.confidence, reason: `Trend ${trend.direction}` });
        }

        // Markov
        const markov = this.markovChain(results);
        if (markov && markov.confidence > 0.55) {
            methods.push({ method: 'markov', prediction: markov.prediction, confidence: markov.confidence, reason: 'Markov' });
        }

        let taiWeight = 0, xiuWeight = 0, totalWeight = 0;
        const details = [];
        for (const method of methods) {
            const weight = method.confidence * (this.weights[method.method] || 1.0);
            if (method.prediction === 'Tài') taiWeight += weight;
            else xiuWeight += weight;
            totalWeight += weight;
            details.push({ method: method.method, prediction: method.prediction, confidence: method.confidence, reason: method.reason });
        }

        if (totalWeight === 0) {
            const last = results[results.length - 1];
            return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.5, type: `${this.name}-FALLBACK`, detail: 'Không đủ tín hiệu' };
        }

        const finalPred = taiWeight > xiuWeight ? 'Tài' : 'Xỉu';
        const finalConf = Math.max(taiWeight, xiuWeight) / totalWeight;
        const consensus = details.filter(d => d.prediction === finalPred).length;
        const boost = Math.min(consensus * 0.03, 0.15);

        let type = `${this.name}-ENSEMBLE`;
        let detail = `${details.length} methods`;
        if (patterns.length > 0) {
            const best = patterns[0];
            type = `${this.name}-${best.type.toUpperCase()}`;
            detail = best.desc;
        }
        const streak = this.getStreak(results);
        if (streak >= 4) {
            type = `${this.name}-ANTI-STREAK`;
            detail = `Đảo bệt ${streak}`;
        }

        return {
            prediction: finalPred,
            confidence: Math.min(finalConf + boost, 0.95),
            type: type,
            detail: detail,
            details: details.slice(0, 5),
            totalMethods: details.length,
            history_count: this.history.length,
            source: this.name
        };
    }

    analyzeFrequency(results) {
        const recent = results.slice(-30);
        const tai = recent.filter(r => r === 'Tài').length;
        const xiu = recent.length - tai;
        const total = recent.length || 1;
        return {
            tai, xiu, total,
            taiRatio: tai / total,
            xiuRatio: xiu / total,
            dominant: tai > xiu ? 'Tài' : 'Xỉu',
            ratio: Math.max(tai, xiu) / total
        };
    }

    markovChain(results, order = 2) {
        if (results.length < order + 2) return null;
        const states = {};
        for (let i = order; i < results.length - 1; i++) {
            const state = results.slice(i - order, i).join('');
            const next = results[i];
            if (!states[state]) states[state] = { Tài: 0, Xỉu: 0 };
            states[state][next]++;
        }
        const currentState = results.slice(-order).join('');
        if (!states[currentState]) return null;
        const total = states[currentState].Tài + states[currentState].Xỉu;
        if (total === 0) return null;
        return {
            prediction: states[currentState].Tài > states[currentState].Xỉu ? 'Tài' : 'Xỉu',
            confidence: Math.max(states[currentState].Tài, states[currentState].Xỉu) / total
        };
    }
}

// ================================================================
// ========== KHỞI TẠO CÁC ALGORITHM ==========
// ================================================================
const sunwinAlgo = new SunwinAlgorithm();
const trailsAlgo = new TrailsAlgorithm();

// ================================================================
// ========== AUTO LOAD TỪ CÁC API ==========
// ================================================================
async function autoLoadAll() {
    console.log('🔄 Đang tải từ tất cả API...');
    
    // Load từ Sunwin
    const sunwinLoaded = await sunwinAlgo.loadHistory();
    if (sunwinLoaded) console.log(`✅ SUNWIN: Đã tải phiên mới`);
    
    // Load từ Trails
    const trailsLoaded = await trailsAlgo.loadHistory();
    if (trailsLoaded) console.log(`✅ TRAILS: Đã tải phiên mới`);
    
    // Lên lịch tải tự động mỗi 20 giây
    setInterval(async () => {
        const s = await sunwinAlgo.loadHistory();
        const t = await trailsAlgo.loadHistory();
        if (s || t) {
            console.log(`🔄 Cập nhật: SUNWIN=${s ? '✅' : '⏩'} TRAILS=${t ? '✅' : '⏩'}`);
        }
    }, 20000);
}

// ================================================================
// ========== ENSEMBLE COMBINED ==========
// ================================================================
function ensemblePredict(history) {
    const sunwinPred = sunwinAlgo.predict(history);
    const trailsPred = trailsAlgo.predict(history);
    
    // Weighted vote between algorithms
    let taiWeight = 0, xiuWeight = 0;
    const details = [];
    
    const algos = [
        { pred: sunwinPred, weight: 1.2 },
        { pred: trailsPred, weight: 1.0 }
    ];
    
    for (const algo of algos) {
        if (algo.pred && algo.pred.prediction) {
            const w = algo.pred.confidence * algo.weight;
            if (algo.pred.prediction === 'Tài') taiWeight += w;
            else xiuWeight += w;
            details.push({
                source: algo.pred.source || 'unknown',
                prediction: algo.pred.prediction,
                confidence: algo.pred.confidence,
                type: algo.pred.type,
                detail: algo.pred.detail
            });
        }
    }
    
    if (taiWeight + xiuWeight === 0) {
        return { prediction: 'Xỉu', confidence: 0.5, type: 'ENSEMBLE-FALLBACK', detail: 'Không có dữ liệu' };
    }
    
    const finalPred = taiWeight > xiuWeight ? 'Tài' : 'Xỉu';
    const finalConf = Math.max(taiWeight, xiuWeight) / (taiWeight + xiuWeight);
    const boost = Math.min(details.length * 0.05, 0.15);
    
    return {
        prediction: finalPred,
        confidence: Math.min(finalConf + boost, 0.95),
        type: 'ENSEMBLE-SUPER',
        detail: `${details.length} algorithms`,
        details: details,
        sunwin: sunwinPred,
        trails: trailsPred,
        totalAlgorithms: 2,
        sunwin_count: sunwinAlgo.history.length,
        trails_count: trailsAlgo.history.length
    };
}

// ================================================================
// ========== GLOBAL VARIABLES ==========
// ================================================================
let currentSessionId = null;
let lastPrediction = null;
let wsConnected = false;

let stats = {
    total: 0,
    correct: 0,
    wrong: 0,
    consecutiveLosses: 0,
    streak: 0,
    bestStreak: 0,
    totalTai: 0,
    totalXiu: 0,
    byAlgorithm: {}
};

let apiResponseData = {
    "Phien": null,
    "Xuc_xac_1": null,
    "Xuc_xac_2": null,
    "Xuc_xac_3": null,
    "Tong": null,
    "Ket_qua": "",
    "Phien_hien_tai": null,
    "Du_doan": "",
    "Loai_cau": "",
    "Mau_cau_phat_hien": "",
    "Do_tin_cay": "0%",
    "Trang_thai": "",
    "Ket_qua_du_doan": "",
    "Thong_ke": {
        "tong": 0,
        "dung": 0,
        "sai": 0,
        "ti_le": "0%",
        "streak": 0,
        "best_streak": 0
    },
    "id": "@tranhoang2286"
};

// ================================================================
// ========== WEBSOCKET ==========
// ================================================================
const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;

const initialMessages = [
    [
        1,
        "MiniGame",
        "GM_apivopnha",
        "WangLin",
        {
            "info": "{\"ipAddress\":\"14.249.227.107\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiI5ODE5YW5zc3MiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMjMyODExNTEsImFmZklkIjoic3VuLndpbiIsImJhbm5lZCI6ZmFsc2UsImJyYW5kIjoiZ2VtIiwidGltZXN0YW1wIjoxNzYzMDMyOTI4NzcwLCJsb2NrR2FtZXMiOltdLCJhbW91bnQiOjAsImxvY2tDaGF0IjpmYWxzZSwicGhvbmVWZXJpZmllZCI6ZmFsc2UsImlwQWRkcmVzcyI6IjE0LjI0OS4yMjcuMTA3IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wNS5wbmciLCJwbGF0Zm9ybUlkIjo0LCJ1c2VySWQiOiI4ODM4NTMzZS1kZTQzLTRiOGQtOTUwMy02MjFmNDA1MDUzNGUiLCJyZWdUaW1lIjoxNzYxNjMyMzAwNTc2LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2FwaXZvcG5oYSJ9.guH6ztJSPXUL1cU8QdMz8O1Sdy_SbxjSM-CDzWPTr-0\",\"locale\":\"vi\",\"userId\":\"8838533e-de43-4b8d-9503-621f4050534e\",\"username\":\"GM_apivopnha\",\"timestamp\":1763032928770,\"refreshToken\":\"e576b43a64e84f789548bfc7c4c8d1e5.7d4244a361e345908af95ee2e8ab2895\"}",
            "signature": "45EF4B318C883862C36E1B189A1DF5465EBB60CB602BA05FAD8FCBFCD6E0DA8CB3CE65333EDD79A2BB4ABFCE326ED5525C7D971D9DEDB5A17A72764287FFE6F62CBC2DF8A04CD8EFF8D0D5AE27046947ADE45E62E644111EFDE96A74FEC635A97861A425FF2B5732D74F41176703CA10CFEED67D0745FF15EAC1065E1C8BCBFA"
        }
    ],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }

    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        wsConnected = true;
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(msg));
                }
            }, i * 600);
        });

        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        }, PING_INTERVAL);
    });

    ws.on('pong', () => {});

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;
            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";

                if (result === 'Tài') stats.totalTai++;
                else stats.totalXiu++;

                let predictionCorrect = false;
                if (lastPrediction && lastPrediction.ket_qua) {
                    predictionCorrect = (lastPrediction.ket_qua === result);
                    
                    stats.total++;
                    if (predictionCorrect) {
                        stats.correct++;
                        stats.consecutiveLosses = 0;
                        stats.streak++;
                        if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
                    } else {
                        stats.wrong++;
                        stats.consecutiveLosses++;
                        stats.streak = 0;
                    }
                    
                    // Update weights cho cả 2 algorithms
                    sunwinAlgo.weights.frequency = Math.min(sunwinAlgo.weights.frequency * (predictionCorrect ? 1.01 : 0.99), 2.0);
                    trailsAlgo.weights.quantum = Math.min(trailsAlgo.weights.quantum * (predictionCorrect ? 1.01 : 0.99), 2.0);
                }

                // Lưu lịch sử game
                const gameEntry = {
                    phien: currentSessionId,
                    Xuc_xac_1: d1,
                    Xuc_xac_2: d2,
                    Xuc_xac_3: d3,
                    Tong: total,
                    Ket_qua: result,
                    du_doan: lastPrediction ? lastPrediction.ket_qua : null,
                    loai_cau: lastPrediction ? lastPrediction.loai_cau : null,
                    do_tin_cay: lastPrediction ? lastPrediction.do_tin_cay : null,
                    thoi_gian: new Date().toISOString()
                };
                gameHistory.push(gameEntry);
                if (gameHistory.length > 2000) gameHistory.shift();
                writeFile(HISTORY_FILE, gameHistory);

                // Dự đoán từ ENSEMBLE
                const ensemblePred = ensemblePredict(gameHistory);
                
                let finalPred = ensemblePred.prediction;
                let finalConf = ensemblePred.confidence;
                let finalType = ensemblePred.type || 'AI';
                let finalDetail = ensemblePred.detail || '';
                
                // Chống đảo
                if (stats.consecutiveLosses >= 3) {
                    finalPred = finalPred === 'Tài' ? 'Xỉu' : 'Tài';
                    finalConf = Math.min(0.4 + stats.consecutiveLosses * 0.02, 0.6);
                    finalType = `CHỐNG ĐẢO (${stats.consecutiveLosses})`;
                    finalDetail = `Thua ${stats.consecutiveLosses} liên tiếp`;
                }

                // Lưu lịch sử dự đoán
                const predEntry = {
                    phien: currentSessionId ? parseInt(currentSessionId) + 1 : null,
                    prediction: finalPred,
                    confidence: finalConf,
                    type: finalType,
                    detail: finalDetail,
                    sunwin_count: sunwinAlgo.history.length,
                    trails_count: trailsAlgo.history.length,
                    actual: null,
                    thoi_gian: new Date().toISOString()
                };
                predictionHistory.push(predEntry);
                if (predictionHistory.length > 2000) predictionHistory.shift();
                writeFile(PREDICTIONS_FILE, predictionHistory);

                lastPrediction = {
                    phien: currentSessionId ? parseInt(currentSessionId) + 1 : null,
                    ket_qua: finalPred,
                    loai_cau: finalType,
                    mau_cau: finalDetail,
                    do_tin_cay: (finalConf * 100).toFixed(0) + '%'
                };

                const tiLe = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : '0%';

                apiResponseData = {
                    "Phien": currentSessionId,
                    "Xuc_xac_1": d1,
                    "Xuc_xac_2": d2,
                    "Xuc_xac_3": d3,
                    "Tong": total,
                    "Ket_qua": result,
                    "Phien_hien_tai": currentSessionId ? parseInt(currentSessionId) + 1 : null,
                    "Du_doan": finalPred,
                    "Loai_cau": finalType,
                    "Mau_cau_phat_hien": finalDetail,
                    "Do_tin_cay": (finalConf * 100).toFixed(0) + '%',
                    "Trang_thai": stats.consecutiveLosses >= 3 ? 'Chống đảo' : `ENSEMBLE (SUNWIN:${sunwinAlgo.history.length}, TRAILS:${trailsAlgo.history.length})`,
                    "Ket_qua_du_doan": predictionCorrect ? '✅' : (stats.total > 0 ? '❌' : ''),
                    "Thong_ke": {
                        "tong": stats.total,
                        "dung": stats.correct,
                        "sai": stats.wrong,
                        "ti_le": tiLe,
                        "streak": stats.streak,
                        "best_streak": stats.bestStreak
                    },
                    "id": "@tranhoang2286"
                };

                console.log('\n' + '='.repeat(60));
                console.log(`🎲 PHIÊN ${currentSessionId}`);
                console.log(`🎯 Xúc xắc: ${d1} | ${d2} | ${d3}  |  Tổng: ${total}  |  KQ: ${result}`);
                console.log(`🤖 Dự đoán: ${finalPred} (${(finalConf * 100).toFixed(0)}%) | ${predictionCorrect ? '✅' : '❌'}`);
                console.log(`📊 Loại cầu: ${finalType} | ${finalDetail}`);
                console.log(`📊 SUNWIN: ${sunwinAlgo.history.length} phiên | TRAILS: ${trailsAlgo.history.length} phiên`);
                if (ensemblePred.details) {
                    console.log(`   🔍 ${ensemblePred.details.map(d => `${d.source}(${(d.confidence*100).toFixed(0)}%)`).join(', ')}`);
                }
                console.log(`📈 Thống kê: ${stats.correct}/${stats.total} (${tiLe}) | Streak: ${stats.streak}`);
                if (stats.consecutiveLosses > 0) console.log(`⚠️ Thua liên tiếp: ${stats.consecutiveLosses}`);
                console.log('='.repeat(60) + '\n');

                currentSessionId = null;
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] WebSocket closed. Code: ${code}`);
        wsConnected = false;
        clearInterval(pingInterval);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] WebSocket error:', err.message);
        wsConnected = false;
        ws.close();
    });
}

// ================================================================
// ========== API ENDPOINTS ==========
// ================================================================

app.get('/api/ditmemaysun', (req, res) => {
    res.json(apiResponseData);
});

app.get('/api/his', (req, res) => {
    const recent = gameHistory.slice(-50).reverse();
    res.json({
        success: true,
        total: gameHistory.length,
        data: recent,
        stats: {
            tong: stats.total,
            dung: stats.correct,
            sai: stats.wrong,
            ti_le: stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : '0%',
            consecutive_losses: stats.consecutiveLosses,
            streak: stats.streak,
            best_streak: stats.bestStreak
        }
    });
});

app.get('/api/predictions', (req, res) => {
    const recent = predictionHistory.slice(-50).reverse();
    res.json({
        success: true,
        total: predictionHistory.length,
        data: recent,
        stats: {
            tong: stats.total,
            dung: stats.correct,
            sai: stats.wrong,
            ti_le: stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : '0%'
        }
    });
});

app.get('/api/sunwin', (req, res) => {
    const pred = sunwinAlgo.predict(gameHistory);
    res.json({
        success: true,
        algorithm: 'SUNWIN',
        prediction: pred,
        history_count: sunwinAlgo.history.length,
        api_url: sunwinAlgo.apiUrl
    });
});

app.get('/api/trails', (req, res) => {
    const pred = trailsAlgo.predict(gameHistory);
    res.json({
        success: true,
        algorithm: 'TRAILS',
        prediction: pred,
        history_count: trailsAlgo.history.length,
        api_url: trailsAlgo.apiUrl
    });
});

app.get('/api/ensemble', (req, res) => {
    const pred = ensemblePredict(gameHistory);
    res.json({
        success: true,
        prediction: pred,
        algorithms: {
            sunwin: { count: sunwinAlgo.history.length, url: sunwinAlgo.apiUrl },
            trails: { count: trailsAlgo.history.length, url: trailsAlgo.apiUrl }
        }
    });
});

app.post('/api/sunwin/load', async (req, res) => {
    const loaded = await sunwinAlgo.loadHistory();
    res.json({
        success: loaded,
        total: sunwinAlgo.history.length,
        message: loaded ? 'Đã tải phiên mới' : 'Không có phiên mới'
    });
});

app.post('/api/trails/load', async (req, res) => {
    const loaded = await trailsAlgo.loadHistory();
    res.json({
        success: loaded,
        total: trailsAlgo.history.length,
        message: loaded ? 'Đã tải phiên mới' : 'Không có phiên mới'
    });
});

app.get('/api/stats', (req, res) => {
    res.json({
        game: {
            total: stats.total,
            correct: stats.correct,
            wrong: stats.wrong,
            rate: stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : '0%',
            consecutiveLosses: stats.consecutiveLosses,
            streak: stats.streak,
            bestStreak: stats.bestStreak
        },
        history: {
            game: gameHistory.length,
            predictions: predictionHistory.length,
            sunwin: sunwinAlgo.history.length,
            trails: trailsAlgo.history.length
        },
        algorithms: {
            sunwin: { weights: sunwinAlgo.weights },
            trails: { weights: trailsAlgo.weights }
        }
    });
});

app.post('/api/manual', (req, res) => {
    const { pred, conf, type, detail } = req.body;
    
    if (!pred || !['Tài', 'Xỉu'].includes(pred)) {
        return res.status(400).json({ error: 'pred phải là Tài hoặc Xỉu' });
    }
    
    const confidence = conf || 0.6;
    const predictionType = type || 'MANUAL';
    const detailStr = detail || '';
    
    lastPrediction = {
        phien: Date.now() + 1,
        ket_qua: pred,
        loai_cau: `MANUAL: ${predictionType}`,
        mau_cau: detailStr,
        do_tin_cay: (confidence * 100).toFixed(0) + '%'
    };
    
    apiResponseData.Du_doan = pred;
    apiResponseData.Loai_cau = `MANUAL: ${predictionType}`;
    apiResponseData.Mau_cau_phat_hien = detailStr;
    apiResponseData.Do_tin_cay = (confidence * 100).toFixed(0) + '%';
    apiResponseData.Trang_thai = 'MANUAL';
    
    res.json({ 
        success: true, 
        prediction: pred, 
        confidence: confidence,
        message: `Đã set dự đoán: ${pred} (${(confidence * 100).toFixed(0)}%)`
    });
});

app.post('/api/clear', (req, res) => {
    gameHistory = [];
    predictionHistory = [];
    stats = { total: 0, correct: 0, wrong: 0, consecutiveLosses: 0, streak: 0, bestStreak: 0, totalTai: 0, totalXiu: 0 };
    writeFile(HISTORY_FILE, []);
    writeFile(PREDICTIONS_FILE, []);
    res.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu' });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        game: gameHistory.length,
        predictions: predictionHistory.length,
        sunwin: sunwinAlgo.history.length,
        trails: trailsAlgo.history.length,
        stats: stats.total
    });
});

app.get('/ping', (req, res) => res.send('pong'));

app.get('/', (req, res) => {
    const tiLe = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : '0%';
    res.json({
        name: "🎲 SUNWIN TX - DUAL ALGORITHM",
        author: "@tranhoang2286",
        version: "10.0 - 2 ALGORITHMS",
        deterministic: "🔒 100% NO RANDOM",
        algorithms: {
            sunwin: {
                url: sunwinAlgo.apiUrl,
                history: sunwinAlgo.history.length,
                methods: ['pattern', 'frequency', 'cycle', 'streak', 'markov', 'bayesian']
            },
            trails: {
                url: trailsAlgo.apiUrl,
                history: trailsAlgo.history.length,
                methods: ['pattern', 'frequency', 'quantum', 'volatility', 'momentum', 'trend', 'markov']
            }
        },
        stats: {
            tong: stats.total,
            dung: stats.correct,
            sai: stats.wrong,
            ti_le: tiLe,
            streak: stats.streak,
            best_streak: stats.bestStreak
        },
        endpoints: {
            "GET /api/ditmemaysun": "Dữ liệu hiện tại",
            "GET /api/sunwin": "Dự đoán từ SUNWIN",
            "GET /api/trails": "Dự đoán từ TRAILS",
            "GET /api/ensemble": "Dự đoán kết hợp",
            "POST /api/sunwin/load": "Tải SUNWIN",
            "POST /api/trails/load": "Tải TRAILS"
        }
    });
});

// ================================================================
// ========== START ==========
// ================================================================
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎲 SUNWIN TX - DUAL ALGORITHM SYSTEM`);
    console.log(`👤 Author: @tranhoang2286`);
    console.log(`🔒 Deterministic: 100% NO RANDOM`);
    console.log(`📊 Algorithms: SUNWIN + TRAILS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`🔗 SUNWIN: ${sunwinAlgo.apiUrl}`);
    console.log(`🔗 TRAILS: ${trailsAlgo.apiUrl}`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`📁 SUNWIN History: ${sunwinAlgo.history.length} phiên`);
    console.log(`📁 TRAILS History: ${trailsAlgo.history.length} phiên`);
    console.log(`📊 Stats: ${stats.correct}/${stats.total}`);
    console.log(`🔄 WebSocket: Connecting...`);
    console.log(`${'='.repeat(60)}\n`);
    
    connectWebSocket();
    await autoLoadAll();
});

module.exports = app;
