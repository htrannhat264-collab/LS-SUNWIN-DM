// ==================== NÂNG CẤP TOÀN BỘ HỆ THỐNG ====================
// Bản quyền: HOÀNG VIP WIN - Nâng cấp cực dài, cực mạnh

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

// ==================== FILE STORAGE ====================
const HISTORY_FILE = './history.json';
const PATTERNS_FILE = './patterns.json';
const MODEL_WEIGHTS_FILE = './model_weights.json';

let resultHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
    try {
        resultHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        console.log(`[📂] Đã tải ${resultHistory.length} phiên từ history.json`);
    } catch (e) {
        console.error('[❌] Lỗi đọc history.json:', e.message);
    }
}

// ==================== KHAI BÁO TRỌNG SỐ MỞ RỘNG ====================
let modelWeights = {};
for (let i = 1; i <= 21; i++) modelWeights[`model_${i}`] = 1.0;

let subModelWeights = {};
for (let i = 1; i <= 64; i++) subModelWeights[`sub_model_${i}`] = 1.0; // Nâng cấp từ 42 lên 64

let miniModelWeights = {};
for (let i = 1; i <= 36; i++) miniModelWeights[`mini_model_${i}`] = 1.0; // Nâng cấp từ 21 lên 36

if (fs.existsSync(MODEL_WEIGHTS_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(MODEL_WEIGHTS_FILE, 'utf8'));
        modelWeights = saved.modelWeights || modelWeights;
        subModelWeights = saved.subModelWeights || subModelWeights;
        miniModelWeights = saved.miniModelWeights || miniModelWeights;
        console.log('[📂] Đã tải model_weights.json');
    } catch (e) {
        console.error('[❌] Lỗi đọc model_weights.json:', e.message);
    }
}

function saveHistory(entry) {
    resultHistory.push(entry);
    if (resultHistory.length > 5000) resultHistory.shift(); // Lưu nhiều hơn
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(resultHistory, null, 2));
}

function saveModelWeights() {
    fs.writeFileSync(MODEL_WEIGHTS_FILE, JSON.stringify({ modelWeights, subModelWeights, miniModelWeights }, null, 2));
}

// ==================== BIẾN TOÀN CỤC ====================
let currentSessionId = null;
let lastResult = null;
let lastPrediction = null;
let stats = {
    total: 0, correct: 0, wrong: 0,
    consecutiveLosses: 0,
    maxConsecutiveLosses: 0,
    winStreak: 0,
    maxWinStreak: 0,
    modelPerformance: {},
    historyPerformance: []
};

let apiResponseData = {
    "Phien": null, "Xuc_xac_1": null, "Xuc_xac_2": null, "Xuc_xac_3": null,
    "Tong": null, "Ket_qua": "", "Phien_hien_tai": null,
    "Du_doan": "", "Loai_cau": "", "Mau_cau_phat_hien": "",
    "Do_tin_cay": "0%", "Trang_thai": "",
    "Ket_qua_du_doan": "",
    "Thong_ke": { "tong": 0, "dung": 0, "sai": 0, "ti_le": "0%" },
    "id": "@tranhoang2286"
};

// ==================== LỚP PHÂN TÍCH SIÊU CẤP ====================
class TaiXiuAnalyzer {
    constructor() {
        this.modelWeights = modelWeights;
        this.subModelWeights = subModelWeights;
        this.miniModelWeights = miniModelWeights;
        this.subModels = {};
        this.miniModels = {};
        this.patternLibrary = this.loadPatternLibrary();
        this.initSubModels();
        this.initMiniModels();
        this.predictionHistory = [];
        this.confidenceThreshold = 0.55;
        this.antiRandomFactor = 0.15; // Hệ số chống random
    }

    loadPatternLibrary() {
        if (fs.existsSync(PATTERNS_FILE)) {
            try { return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8')); }
            catch (e) { console.error('[❌] Lỗi đọc patterns.json:', e.message); }
        }
        return {
            '1-1': [], '2-2': [], '3-3': [], '1-2': [], '2-1': [],
            '2-1-2': [], '1-2-1': [], 'bệt': [], 'loạn': [],
            '3-1-3': [], '1-3-1': [], '4-4': [], '1-4': [], '4-1': [],
            'fibonacci': [], 'symmetry': [], 'cycle': []
        };
    }

    savePatternLibrary() {
        fs.writeFileSync(PATTERNS_FILE, JSON.stringify(this.patternLibrary, null, 2));
    }

    initSubModels() {
        // Mở rộng lên 64 sub models - mỗi model có logic chuyên sâu
        const subModelTypes = [
            // Cầu 1-1 (8 models)
            { type: '1-1', logic: 'pure', minLength: 3, threshold: 0.92 },
            { type: '1-1', logic: 'variant', minLength: 4, threshold: 0.85 },
            { type: '1-1', logic: 'long', minLength: 8, threshold: 0.80 },
            { type: '1-1', logic: 'hybrid', minLength: 5, threshold: 0.75 },
            { type: '1-1', logic: 'break', minLength: 4, threshold: 0.85 },
            { type: '1-1', logic: 'recovery', minLength: 6, threshold: 0.78 },
            { type: '1-1', logic: 'extended', minLength: 12, threshold: 0.82 },
            { type: '1-1', logic: 'micro', minLength: 2, threshold: 0.70 },
            // Cầu 2-2 (8 models)
            { type: '2-2', logic: 'pure', minLength: 5, threshold: 0.92 },
            { type: '2-2', logic: 'offset', minLength: 6, threshold: 0.85 },
            { type: '2-2', logic: 'variant', minLength: 7, threshold: 0.80 },
            { type: '2-2', logic: 'hybrid', minLength: 6, threshold: 0.75 },
            { type: '2-2', logic: 'long', minLength: 10, threshold: 0.85 },
            { type: '2-2', logic: 'break', minLength: 5, threshold: 0.88 },
            { type: '2-2', logic: 'extended', minLength: 14, threshold: 0.83 },
            { type: '2-2', logic: 'micro', minLength: 3, threshold: 0.72 },
            // Cầu bệt (8 models)
            { type: 'bệt', logic: 'short', minLength: 2, threshold: 0.80 },
            { type: 'bệt', logic: 'medium', minLength: 4, threshold: 0.85 },
            { type: 'bệt', logic: 'long', minLength: 6, threshold: 0.90 },
            { type: 'bệt', logic: 'break', minLength: 4, threshold: 0.82 },
            { type: 'bệt', logic: 'hybrid', minLength: 5, threshold: 0.75 },
            { type: 'bệt', logic: 'super', minLength: 8, threshold: 0.95 },
            { type: 'bệt', logic: 'extended', minLength: 12, threshold: 0.88 },
            { type: 'bệt', logic: 'micro', minLength: 2, threshold: 0.70 },
            // Cầu 3-3 (8 models)
            { type: '3-3', logic: 'pure', minLength: 8, threshold: 0.92 },
            { type: '3-3', logic: 'variant', minLength: 9, threshold: 0.85 },
            { type: '3-3', logic: 'short', minLength: 5, threshold: 0.75 },
            { type: '3-3', logic: 'hybrid', minLength: 7, threshold: 0.78 },
            { type: '3-3', logic: 'break', minLength: 6, threshold: 0.85 },
            { type: '3-3', logic: 'long', minLength: 12, threshold: 0.88 },
            { type: '3-3', logic: 'extended', minLength: 15, threshold: 0.84 },
            { type: '3-3', logic: 'micro', minLength: 4, threshold: 0.72 },
            // Cầu 2-1-2 và 1-2-1 (8 models)
            { type: '2-1-2', logic: 'pure', minLength: 4, threshold: 0.90 },
            { type: '2-1-2', logic: 'variant', minLength: 5, threshold: 0.82 },
            { type: '2-1-2', logic: 'long', minLength: 8, threshold: 0.80 },
            { type: '1-2-1', logic: 'pure', minLength: 4, threshold: 0.90 },
            { type: '1-2-1', logic: 'variant', minLength: 5, threshold: 0.82 },
            { type: '1-2-1', logic: 'long', minLength: 8, threshold: 0.80 },
            { type: '2-1-2', logic: 'hybrid', minLength: 6, threshold: 0.76 },
            { type: '1-2-1', logic: 'hybrid', minLength: 6, threshold: 0.76 },
            // Cầu break và transition (8 models)
            { type: 'break', logic: 'break11', minLength: 3, threshold: 0.85 },
            { type: 'break', logic: 'break22', minLength: 4, threshold: 0.85 },
            { type: 'break', logic: 'breakStreak', minLength: 3, threshold: 0.80 },
            { type: 'transition', logic: '11to22', minLength: 4, threshold: 0.78 },
            { type: 'transition', logic: '22to11', minLength: 4, threshold: 0.78 },
            { type: 'transition', logic: 'streakTo11', minLength: 4, threshold: 0.75 },
            { type: 'break', logic: 'break33', minLength: 5, threshold: 0.83 },
            { type: 'transition', logic: 'streakTo22', minLength: 4, threshold: 0.75 },
            // Advanced phân tích (8 models)
            { type: 'frequency', logic: 'frequency', minLength: 8, threshold: 0.72 },
            { type: 'cycle', logic: 'cycle', minLength: 10, threshold: 0.72 },
            { type: 'symmetry', logic: 'symmetry', minLength: 6, threshold: 0.76 },
            { type: 'fibonacci', logic: 'fibonacci', minLength: 6, threshold: 0.72 },
            { type: 'trend', logic: 'longTrend', minLength: 12, threshold: 0.80 },
            { type: 'super', logic: 'super', minLength: 18, threshold: 0.85 },
            { type: 'momentum', logic: 'momentum', minLength: 7, threshold: 0.74 },
            { type: 'volatility', logic: 'volatility', minLength: 8, threshold: 0.70 },
            // Cầu mở rộng (8 models) - Cầu 4-4, 1-4, 4-1, v.v.
            { type: '4-4', logic: 'pure', minLength: 10, threshold: 0.88 },
            { type: '4-4', logic: 'variant', minLength: 12, threshold: 0.80 },
            { type: '4-4', logic: 'short', minLength: 6, threshold: 0.75 },
            { type: '1-4', logic: 'pure', minLength: 5, threshold: 0.82 },
            { type: '4-1', logic: 'pure', minLength: 5, threshold: 0.82 },
            { type: '3-1-3', logic: 'pure', minLength: 7, threshold: 0.85 },
            { type: '1-3-1', logic: 'pure', minLength: 7, threshold: 0.85 },
            { type: 'super_hybrid', logic: 'hybrid', minLength: 15, threshold: 0.80 }
        ];

        for (let i = 1; i <= 64; i++) {
            const spec = subModelTypes[i-1] || { type: 'unknown', logic: 'unknown', minLength: 5, threshold: 0.5 };
            this.subModels[`sub_model_${i}`] = {
                ...spec,
                name: `${spec.type}_${spec.logic}_${i}`,
                weight: this.subModelWeights[`sub_model_${i}`] || 1.0,
                accuracy: 0.5,
                predictions: [],
                lastResult: null,
                successCount: 0,
                failCount: 0
            };
        }
    }

    initMiniModels() {
        // Mở rộng lên 36 mini models
        const miniSpecs = [
            'phat_hien_cau_dep', 'du_doan_bien_dong', 'phan_tich_so_sanh',
            'nhan_dien_xu_huong_cuc_bo', 'tinh_toan_xac_suat_cao', 'phat_hien_diem_gay',
            'du_doan_nguong', 'phan_tich_chuoi', 'nhan_dien_mau_lap',
            'tinh_he_so_tuong_quan', 'du_doan_doan_nhiet', 'phan_tich_pha',
            'nhan_dien_song', 'tinh_toan_momentum', 'du_doan_hoi_phuc',
            'phat_hien_dot_bien', 'phan_tich_can_bang', 'nhan_dien_tan_so',
            'du_doan_chu_ky', 'tinh_toan_ma_tran', 'phan_tich_tong_hop',
            'du_doan_bat_ngo', 'phan_tich_du_lieu_nhieu', 'nhan_dien_ngoai_le',
            'tinh_toan_do_lech', 'du_doan_can_bang_lai', 'phan_tich_xu_huong_an',
            'nhan_dien_cau_nhieu_pha', 'du_doan_theo_mau_cu', 'phan_tich_xac_suat_doi',
            'tinh_toan_confidence_boost', 'du_doan_chong_ramdom', 'phan_tich_chuoi_phuc_hop',
            'nhan_dien_cau_kin', 'du_doan_theo_so_lan', 'tinh_toan_tan_suat_xuat_hien'
        ];

        for (let i = 1; i <= 36; i++) {
            this.miniModels[`mini_model_${i}`] = {
                weight: this.miniModelWeights[`mini_model_${i}`] || 1.0,
                accuracy: 0.5,
                specialty: miniSpecs[i-1] || 'chung',
                predictions: [],
                lastResult: null,
                successCount: 0,
                failCount: 0
            };
        }
    }

    // ==================== HÀM HỖ TRỢ ====================
    getResultArray(history) {
        return history.map(h => h.Ket_qua || (h.Tong >= 11 ? 'Tài' : 'Xỉu'));
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

    isPerfectAlternating(results, length) {
        if (results.length < length) return false;
        const last = results.slice(-length);
        for (let i = 0; i < last.length - 1; i++) {
            if (last[i] === last[i+1]) return false;
        }
        return true;
    }

    countAlternating(results) {
        let count = 0;
        for (let i = 0; i < results.length - 1; i++) {
            if (results[i] !== results[i+1]) count++;
        }
        return count;
    }

    // ==================== LOGIC CHỐNG RANDOM ====================
    antiRandomAdjustment(prediction, confidence, history) {
        // Nếu độ tin cậy thấp, ưu tiên xu hướng dài hạn thay vì random
        if (confidence < this.confidenceThreshold && history.length >= 10) {
            const results = this.getResultArray(history);
            const longTrend = this.getLongTrend(results);
            if (longTrend.strength > 0.7) {
                return { prediction: longTrend.direction, confidence: confidence + 0.1, adjusted: true };
            }
        }
        // Chống đảo chiều quá sớm
        if (history.length >= 5) {
            const results = this.getResultArray(history);
            const last = results[results.length - 1];
            const streak = this.getStreak(results);
            if (streak >= 3 && prediction !== last) {
                // Không đảo chiều khi bệt đang mạnh
                return { prediction: last, confidence: confidence + 0.15, adjusted: true };
            }
            // Nếu cầu 1-1 đang dài, không random
            if (this.isPerfectAlternating(results, 6) && prediction !== last) {
                return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: confidence + 0.1, adjusted: true };
            }
        }
        return { prediction, confidence, adjusted: false };
    }

    // ==================== SUB MODELS ====================
    runSubModel11(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const last4 = results.slice(-4);
        const last6 = results.slice(-6);
        const last8 = results.slice(-8);

        switch (model.logic) {
            case 'pure':
                if (this.isPerfectAlternating(results, 3)) {
                    return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.92, reason: 'Cầu 1-1 thuần túy' };
                }
                break;
            case 'variant':
                if (this.isAlternatingWithTolerance(results, 1)) {
                    return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.85, reason: 'Cầu 1-1 biến thể' };
                }
                break;
            case 'long':
                if (results.length >= 8) {
                    const altCount = this.countAlternating(results.slice(-8));
                    if (altCount >= 6) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.78 + (altCount/20), reason: `Cầu 1-1 dài ${altCount}/7` };
                    }
                }
                break;
            case 'hybrid':
                if (last4.length === 4 && last4[0] !== last4[1] && last4[1] !== last4[2] && last4[3] !== last4[2]) {
                    return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.75, reason: 'Cầu 1-1 kết hợp' };
                }
                break;
            case 'break':
                if (last4.length === 4 && last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] === last4[3]) {
                    const streak = this.getStreak(results.slice(0, -1));
                    if (streak > 4) return { prediction: last, confidence: 0.85, reason: 'Bẻ cầu 1-1' };
                }
                break;
            case 'recovery':
                if (last4.length === 4 && last4[0] === last4[1] && last4[1] !== last4[2] && last4[2] !== last4[3]) {
                    return { prediction: last4[3] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.78, reason: 'Phục hồi cầu 1-1' };
                }
                break;
            case 'extended':
                if (results.length >= 12) {
                    const altCount = this.countAlternating(results.slice(-12));
                    if (altCount >= 9) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.82, reason: 'Cầu 1-1 kéo dài' };
                    }
                }
                break;
            case 'micro':
                if (last4.length === 4 && last4[0] !== last4[1]) {
                    return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.70, reason: 'Cầu 1-1 vi mô' };
                }
                break;
        }
        return null;
    }

    runSubModel22(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const last6 = results.slice(-6);
        const last8 = results.slice(-8);
        const last10 = results.slice(-10);

        switch (model.logic) {
            case 'pure':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] !== last6[2] &&
                    last6[2] === last6[3] && last6[3] !== last6[4] && last6[4] === last6[5]) {
                    return { prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.92, reason: 'Cầu 2-2 chuẩn' };
                }
                break;
            case 'offset':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] !== last6[2] &&
                    last6[2] !== last6[3] && last6[3] === last6[4] && last6[4] !== last6[5]) {
                    return { prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.85, reason: 'Cầu 2-2 lệch' };
                }
                break;
            case 'variant':
                if (last8.length === 8 && last8[0] === last8[1] && last8[1] !== last8[2] &&
                    last8[2] === last8[3] && last8[3] !== last8[4] && last8[4] === last8[5] &&
                    last8[5] !== last8[6] && last8[6] === last8[7]) {
                    return { prediction: last8[6] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.80, reason: 'Cầu 2-2 biến tướng' };
                }
                break;
            case 'hybrid':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] !== last6[2] &&
                    last6[2] !== last6[3] && last6[3] !== last6[4] && last6[4] === last6[5]) {
                    return { prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.75, reason: 'Cầu 2-2 kết hợp' };
                }
                break;
            case 'long':
                if (last10.length === 10) {
                    let score = 0;
                    for (let i = 0; i < 8; i+=2) {
                        if (last10[i] === last10[i+1]) score++;
                    }
                    if (score >= 3) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.82 + (score*0.03), reason: `Cầu 2-2 dài ${score}/4` };
                    }
                }
                break;
            case 'break':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] !== last6[2] &&
                    last6[2] === last6[3] && last6[3] !== last6[4] && last6[4] !== last6[5]) {
                    return { prediction: last6[4], confidence: 0.88, reason: 'Bẻ cầu 2-2' };
                }
                break;
            case 'extended':
                if (last10.length === 10) {
                    let score = 0;
                    for (let i = 0; i < 8; i+=2) {
                        if (last10[i] === last10[i+1]) score++;
                    }
                    if (score >= 4) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.83, reason: 'Cầu 2-2 kéo dài' };
                    }
                }
                break;
            case 'micro':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] !== last6[2] && last6[2] === last6[3]) {
                    return { prediction: last6[2] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.72, reason: 'Cầu 2-2 vi mô' };
                }
                break;
        }
        return null;
    }

    runSubModelStreak(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const other = last === 'Tài' ? 'Xỉu' : 'Tài';
        const streak = this.getStreak(results);

        switch (model.logic) {
            case 'short':
                if (streak >= 2 && streak <= 3) {
                    return { prediction: last, confidence: 0.80, reason: `Bệt ngắn ${streak}` };
                }
                break;
            case 'medium':
                if (streak >= 4 && streak <= 5) {
                    return { prediction: last, confidence: 0.85, reason: `Bệt trung ${streak}` };
                }
                break;
            case 'long':
                if (streak >= 6) {
                    return { prediction: last, confidence: 0.90, reason: `Bệt dài ${streak}` };
                }
                break;
            case 'break':
                if (streak >= 4) {
                    return { prediction: other, confidence: 0.82 + (streak*0.03), reason: `Bệt ${streak}, sắp gãy` };
                }
                break;
            case 'hybrid':
                if (streak >= 3) {
                    const prev = results[results.length - streak - 1];
                    if (prev && prev !== last) {
                        return { prediction: last, confidence: 0.75, reason: `Bệt sau đảo từ ${prev}` };
                    }
                }
                break;
            case 'super':
                if (streak >= 8) {
                    return { prediction: last, confidence: 0.95, reason: `Siêu bệt ${streak}` };
                }
                break;
            case 'extended':
                if (streak >= 10) {
                    return { prediction: last, confidence: 0.88, reason: `Bệt kéo dài ${streak}` };
                }
                break;
            case 'micro':
                if (streak >= 2) {
                    return { prediction: last, confidence: 0.70, reason: `Bệt vi mô ${streak}` };
                }
                break;
        }
        return null;
    }

    runSubModel33(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const last9 = results.slice(-9);
        const last12 = results.slice(-12);
        const last15 = results.slice(-15);

        switch (model.logic) {
            case 'pure':
                if (last9.length === 9 && last9[0] === last9[1] && last9[1] === last9[2] &&
                    last9[3] === last9[4] && last9[4] === last9[5] &&
                    last9[6] === last9[7] && last9[7] === last9[8] &&
                    last9[0] !== last9[3] && last9[3] !== last9[6]) {
                    return { prediction: last9[6] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.92, reason: 'Cầu 3-3 chuẩn' };
                }
                break;
            case 'variant':
                if (last12.length === 12) {
                    let score = 0;
                    for (let i = 0; i < 12; i+=3) {
                        if (i+2 < 12 && last12[i] === last12[i+1] && last12[i+1] === last12[i+2]) score++;
                    }
                    if (score >= 3) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.82 + (score*0.03), reason: `Cầu 3-3 biến thể ${score}/4` };
                    }
                }
                break;
            case 'short':
                if (results.length >= 6) {
                    const last6 = results.slice(-6);
                    if (last6[0] === last6[1] && last6[1] === last6[2] &&
                        last6[3] === last6[4] && last6[4] === last6[5]) {
                        return { prediction: last6[3] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.75, reason: 'Cầu 3-3 ngắn' };
                    }
                }
                break;
            case 'hybrid':
                if (last9.length === 9 && last9[0] === last9[1] && last9[1] === last9[2] &&
                    last9[3] !== last9[4] && last9[5] === last9[6] && last9[6] === last9[7]) {
                    return { prediction: last9[6] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.78, reason: 'Cầu 3-3 kết hợp' };
                }
                break;
            case 'break':
                if (last9.length === 9 && last9[0] === last9[1] && last9[1] === last9[2] &&
                    last9[3] === last9[4] && last9[4] === last9[5] && last9[6] !== last9[7]) {
                    return { prediction: last9[6], confidence: 0.85, reason: 'Bẻ cầu 3-3' };
                }
                break;
            case 'long':
                if (last15.length === 15) {
                    let pattern = [];
                    for (let i = 0; i < 15; i+=3) {
                        if (i+2 < 15 && last15[i] === last15[i+1] && last15[i+1] === last15[i+2]) {
                            pattern.push(last15[i]);
                        }
                    }
                    if (pattern.length >= 4 && pattern[0] !== pattern[1] && pattern[1] !== pattern[2]) {
                        return { prediction: pattern[pattern.length-1] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.88, reason: 'Cầu 3-3 dài' };
                    }
                }
                break;
            case 'extended':
                if (last15.length === 15) {
                    let score = 0;
                    for (let i = 0; i < 15; i+=3) {
                        if (i+2 < 15 && last15[i] === last15[i+1] && last15[i+1] === last15[i+2]) score++;
                    }
                    if (score >= 4) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.84, reason: 'Cầu 3-3 kéo dài' };
                    }
                }
                break;
            case 'micro':
                if (results.length >= 5) {
                    const last5 = results.slice(-5);
                    if (last5[0] === last5[1] && last5[1] === last5[2] && last5[2] !== last5[3]) {
                        return { prediction: last5[3] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.72, reason: 'Cầu 3-3 vi mô' };
                    }
                }
                break;
        }
        return null;
    }

    runSubModel212(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const last5 = results.slice(-5);
        const last7 = results.slice(-7);
        const last9 = results.slice(-9);

        switch (model.logic) {
            case 'pure':
                if (last5.length === 5 && last5[0] === last5[1] && last5[1] !== last5[2] &&
                    last5[2] !== last5[3] && last5[3] === last5[4] && last5[0] === last5[3]) {
                    return { prediction: last5[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.90, reason: 'Cầu 2-1-2 chuẩn' };
                }
                break;
            case 'variant':
                if (last7.length === 7 && last7[0] === last7[1] && last7[1] !== last7[2] &&
                    last7[3] === last7[4] && last7[4] !== last7[5] && last7[0] === last7[3]) {
                    return { prediction: last7[5] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.82, reason: 'Cầu 2-1-2 biến thể' };
                }
                break;
            case 'long':
                if (last9.length === 9) {
                    let count = 0;
                    for (let i = 0; i < 6; i+=3) {
                        if (i+4 < 9 && last9[i] === last9[i+1] && last9[i+1] !== last9[i+2] &&
                            last9[i+3] === last9[i+4]) count++;
                    }
                    if (count >= 2) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.80, reason: 'Cầu 2-1-2 dài' };
                    }
                }
                break;
            case 'hybrid':
                if (last7.length === 7 && last7[0] === last7[1] && last7[1] !== last7[2] &&
                    last7[3] !== last7[4] && last7[4] === last7[5] && last7[0] === last7[4]) {
                    return { prediction: last7[5] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.76, reason: 'Cầu 2-1-2 kết hợp' };
                }
                break;
        }
        return null;
    }

    runSubModel121(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const last5 = results.slice(-5);
        const last7 = results.slice(-7);
        const last9 = results.slice(-9);

        switch (model.logic) {
            case 'pure':
                if (last5.length === 5 && last5[0] !== last5[1] && last5[1] === last5[2] &&
                    last5[2] !== last5[3] && last5[3] === last5[4] && last5[0] === last5[3]) {
                    return { prediction: last5[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.90, reason: 'Cầu 1-2-1 chuẩn' };
                }
                break;
            case 'variant':
                if (last7.length === 7 && last7[0] !== last7[1] && last7[1] === last7[2] &&
                    last7[3] !== last7[4] && last7[4] === last7[5] && last7[0] === last7[3]) {
                    return { prediction: last7[5] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.82, reason: 'Cầu 1-2-1 biến thể' };
                }
                break;
            case 'long':
                if (last9.length === 9) {
                    let count = 0;
                    for (let i = 0; i < 6; i+=3) {
                        if (i+4 < 9 && last9[i] !== last9[i+1] && last9[i+1] === last9[i+2] &&
                            last9[i+3] === last9[i+4]) count++;
                    }
                    if (count >= 2) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.80, reason: 'Cầu 1-2-1 dài' };
                    }
                }
                break;
            case 'hybrid':
                if (last7.length === 7 && last7[0] !== last7[1] && last7[1] === last7[2] &&
                    last7[3] === last7[4] && last7[4] !== last7[5] && last7[0] === last7[4]) {
                    return { prediction: last7[5] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.76, reason: 'Cầu 1-2-1 kết hợp' };
                }
                break;
        }
        return null;
    }

    runSubModelBreak(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const last4 = results.slice(-4);
        const last5 = results.slice(-5);
        const last6 = results.slice(-6);

        switch (model.logic) {
            case 'break11':
                if (last4.length === 4 && last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] === last4[3]) {
                    return { prediction: last4[3], confidence: 0.85, reason: 'Bẻ cầu 1-1' };
                }
                break;
            case 'break22':
                if (last5.length === 5 && last5[0] === last5[1] && last5[1] !== last5[2] &&
                    last5[2] === last5[3] && last5[3] !== last5[4] && last5[0] === last5[4]) {
                    return { prediction: last5[4], confidence: 0.85, reason: 'Bẻ cầu 2-2' };
                }
                break;
            case 'breakStreak':
                const streak = this.getStreak(results.slice(0, -1));
                if (streak >= 3 && last !== results[results.length - 2]) {
                    return { prediction: last, confidence: 0.80, reason: `Bẻ bệt sau ${streak}` };
                }
                break;
            case 'break33':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] === last6[2] &&
                    last6[3] === last6[4] && last6[4] === last6[5] && last6[2] !== last6[3]) {
                    return { prediction: last6[3] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.83, reason: 'Bẻ cầu 3-3' };
                }
                break;
        }
        return null;
    }

    runSubModelTransition(results, model) {
        if (results.length < model.minLength) return null;
        const last6 = results.slice(-6);

        switch (model.logic) {
            case '11to22':
                if (last6.length === 6 && last6[0] !== last6[1] && last6[1] !== last6[2] &&
                    last6[2] === last6[3] && last6[3] !== last6[4] && last6[4] === last6[5]) {
                    return { prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.78, reason: 'Chuyển 1-1 sang 2-2' };
                }
                break;
            case '22to11':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] !== last6[2] &&
                    last6[2] !== last6[3] && last6[3] !== last6[4] && last6[4] !== last6[5]) {
                    return { prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.78, reason: 'Chuyển 2-2 sang 1-1' };
                }
                break;
            case 'streakTo11':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] === last6[2] &&
                    last6[2] !== last6[3] && last6[3] !== last6[4] && last6[4] !== last6[5]) {
                    return { prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.75, reason: 'Chuyển bệt sang 1-1' };
                }
                break;
            case 'streakTo22':
                if (last6.length === 6 && last6[0] === last6[1] && last6[1] === last6[2] &&
                    last6[2] !== last6[3] && last6[3] === last6[4] && last6[4] !== last6[5]) {
                    return { prediction: last6[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.75, reason: 'Chuyển bệt sang 2-2' };
                }
                break;
        }
        return null;
    }

    runSubModelAdvanced(results, model) {
        if (results.length < model.minLength) return null;
        const last = results[results.length - 1];
        const other = last === 'Tài' ? 'Xỉu' : 'Tài';

        switch (model.logic) {
            case 'frequency': {
                const freq = this.analyzeFrequency(results);
                if (freq.dominant && freq.ratio > 0.6) {
                    return { prediction: freq.dominant === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.7 + (freq.ratio*0.2), reason: `Tần suất ${freq.dominant} ${(freq.ratio*100).toFixed(0)}%` };
                }
                break;
            }
            case 'cycle': {
                const cycle = this.detectCycle(results);
                if (cycle.found) {
                    return { prediction: cycle.next, confidence: 0.72, reason: `Chu kỳ ${cycle.length}` };
                }
                break;
            }
            case 'symmetry': {
                const sym = this.checkSymmetry(results);
                if (sym.found) {
                    return { prediction: sym.prediction, confidence: 0.76, reason: 'Cầu đối xứng' };
                }
                break;
            }
            case 'fibonacci': {
                const fib = this.checkFibonacci(results);
                if (fib.found) {
                    return { prediction: fib.prediction, confidence: 0.72, reason: 'Cầu Fibonacci' };
                }
                break;
            }
            case 'longTrend': {
                const trend = this.getLongTrend(results);
                if (trend.strength > 0.7) {
                    return { prediction: trend.direction, confidence: 0.78 + (trend.strength*0.08), reason: `Xu hướng ${trend.direction} ${(trend.strength*100).toFixed(0)}%` };
                }
                break;
            }
            case 'super': {
                const superResult = this.superAnalysis(results);
                if (superResult.confidence > 0.8) return superResult;
                break;
            }
            case 'momentum': {
                const mom = this.calculateMomentum(results);
                if (mom.strength > 0.6) {
                    return { prediction: mom.direction, confidence: 0.74, reason: `Động lượng ${mom.direction}` };
                }
                break;
            }
            case 'volatility': {
                const vol = this.calculateVolatility(results);
                if (vol.prediction) {
                    return { prediction: vol.prediction, confidence: 0.70, reason: `Biến động ${vol.level}` };
                }
                break;
            }
        }
        return null;
    }

    // ==================== CÁC MODEL CẦU MỞ RỘNG ====================
    runSubModel44(results, model) {
        if (results.length < model.minLength) return null;
        const last8 = results.slice(-8);
        const last12 = results.slice(-12);

        switch (model.logic) {
            case 'pure':
                if (last8.length === 8 && last8[0] === last8[1] && last8[1] === last8[2] && last8[2] === last8[3] &&
                    last8[4] === last8[5] && last8[5] === last8[6] && last8[6] === last8[7] &&
                    last8[0] !== last8[4]) {
                    return { prediction: last8[4] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.88, reason: 'Cầu 4-4 chuẩn' };
                }
                break;
            case 'variant':
                if (last12.length === 12) {
                    let score = 0;
                    for (let i = 0; i < 12; i+=4) {
                        if (i+3 < 12 && last12[i] === last12[i+1] && last12[i+1] === last12[i+2] && last12[i+2] === last12[i+3]) score++;
                    }
                    if (score >= 2) {
                        return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.80, reason: 'Cầu 4-4 biến thể' };
                    }
                }
                break;
            case 'short':
                if (results.length >= 6) {
                    const last6 = results.slice(-6);
                    if (last6[0] === last6[1] && last6[1] === last6[2] &&
                        last6[3] === last6[4] && last6[4] === last6[5]) {
                        return { prediction: last6[3] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.75, reason: 'Cầu 4-4 ngắn' };
                    }
                }
                break;
        }
        return null;
    }

    runSubModel14(results, model) {
        if (results.length < model.minLength) return null;
        const last5 = results.slice(-5);
        if (last5.length === 5 && last5[0] !== last5[1] && last5[1] === last5[2] && last5[2] === last5[3] && last5[3] === last5[4]) {
            return { prediction: last5[0] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.82, reason: 'Cầu 1-4' };
        }
        return null;
    }

    runSubModel41(results, model) {
        if (results.length < model.minLength) return null;
        const last5 = results.slice(-5);
        if (last5.length === 5 && last5[0] === last5[1] && last5[1] === last5[2] && last5[2] === last5[3] && last5[3] !== last5[4]) {
            return { prediction: last5[4], confidence: 0.82, reason: 'Cầu 4-1' };
        }
        return null;
    }

    runSubModel313(results, model) {
        if (results.length < model.minLength) return null;
        const last7 = results.slice(-7);
        if (last7.length === 7 && last7[0] === last7[1] && last7[1] === last7[2] &&
            last7[3] !== last7[4] && last7[5] === last7[6] && last7[6] === last7[7] &&
            last7[0] === last7[5]) {
            return { prediction: last7[5] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.85, reason: 'Cầu 3-1-3' };
        }
        return null;
    }

    runSubModel131(results, model) {
        if (results.length < model.minLength) return null;
        const last7 = results.slice(-7);
        if (last7.length === 7 && last7[0] !== last7[1] && last7[1] === last7[2] &&
            last7[3] === last7[4] && last7[4] === last7[5] && last7[5] !== last7[6] &&
            last7[0] === last7[3]) {
            return { prediction: last7[5] === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.85, reason: 'Cầu 1-3-1' };
        }
        return null;
    }

    runSubModelSuperHybrid(results, model) {
        if (results.length < model.minLength) return null;
        const last15 = results.slice(-15);
        let patterns = [];
        for (let i = 0; i < 12; i++) {
            if (last15[i] === last15[i+1] && last15[i+1] !== last15[i+2]) patterns.push('2');
            else if (last15[i] !== last15[i+1] && last15[i+1] !== last15[i+2]) patterns.push('1');
            else patterns.push('b');
        }
        const uniquePatterns = [...new Set(patterns)];
        if (uniquePatterns.length <= 3 && patterns.length >= 10) {
            const last = results[results.length - 1];
            return { prediction: last === 'Tài' ? 'Xỉu' : 'Tài', confidence: 0.80, reason: 'Siêu lai ghép' };
        }
        return null;
    }

    // ==================== MINI MODELS ====================
    runMiniModel(index, history) {
        if (history.length < 2) return null;
        const results = this.getResultArray(history);
        const miniModel = this.miniModels[`mini_model_${index}`];
        let prediction, confidence, reason;

        switch (miniModel.specialty) {
            case 'phat_hien_cau_dep': {
                const pattern = this.analyzeBasicPatterns(history);
                prediction = pattern.prediction;
                confidence = pattern.confidence * 0.92;
                reason = pattern.reason;
                break;
            }
            case 'du_doan_bien_dong': {
                const dice = this.analyzeDiceVolatility(history);
                prediction = dice.prediction;
                confidence = dice.confidence * 0.82;
                reason = dice.reason;
                break;
            }
            case 'nhan_dien_xu_huong_cuc_bo': {
                const short = this.analyzeShortTerm(history);
                prediction = short.prediction;
                confidence = short.confidence * 0.88;
                reason = short.reason;
                break;
            }
            case 'tinh_toan_xac_suat_cao': {
                const taiCount = results.filter(r => r === 'Tài').length;
                const xiuCount = results.length - taiCount;
                if (taiCount > xiuCount * 1.5) {
                    prediction = 'Xỉu'; confidence = 0.72;
                    reason = 'Xác suất Tài cao → Xỉu';
                } else if (xiuCount > taiCount * 1.5) {
                    prediction = 'Tài'; confidence = 0.72;
                    reason = 'Xác suất Xỉu cao → Tài';
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.50;
                    reason = 'Xác suất cân bằng';
                }
                break;
            }
            case 'phan_tich_so_sanh': {
                const currentPattern = results.slice(-5).join('');
                let found = false;
                for (let [type, patterns] of Object.entries(this.patternLibrary)) {
                    if (patterns.includes(currentPattern)) {
                        found = true;
                        prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                        confidence = 0.78;
                        reason = `Khớp mẫu ${type}`;
                        break;
                    }
                }
                if (!found) {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Không khớp mẫu';
                }
                break;
            }
            case 'phat_hien_diem_gay': {
                const streak = this.getStreak(results);
                if (streak >= 4) {
                    prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.75;
                    reason = `Điểm gãy bệt ${streak}`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.50;
                    reason = 'Chưa có điểm gãy';
                }
                break;
            }
            case 'du_doan_nguong': {
                const last = results[results.length - 1];
                const other = last === 'Tài' ? 'Xỉu' : 'Tài';
                const streak = this.getStreak(results);
                if (streak >= 5) {
                    prediction = other; confidence = 0.78;
                    reason = `Ngưỡng 5 bệt, đảo chiều`;
                } else if (streak <= 1 && results.length >= 5 && this.isPerfectAlternating(results, 5)) {
                    prediction = other; confidence = 0.75;
                    reason = 'Ngưỡng xen kẽ dài';
                } else {
                    prediction = last; confidence = 0.55;
                    reason = 'Dưới ngưỡng';
                }
                break;
            }
            case 'phan_tich_chuoi': {
                if (results.length >= 6) {
                    const last6 = results.slice(-6);
                    const pattern = last6.join('');
                    if (pattern === 'TàiXỉuTàiXỉuTàiXỉu' || pattern === 'XỉuTàiXỉuTàiXỉuTài') {
                        prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                        confidence = 0.85;
                        reason = 'Chuỗi xen kẽ hoàn hảo';
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.45;
                        reason = 'Chuỗi không rõ';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Không đủ dữ liệu chuỗi';
                }
                break;
            }
            case 'nhan_dien_mau_lap': {
                if (results.length >= 4) {
                    const last2 = results.slice(-2);
                    const prev2 = results.slice(-4, -2);
                    if (last2[0] === prev2[0] && last2[1] === prev2[1]) {
                        prediction = last2[0];
                        confidence = 0.80;
                        reason = 'Mẫu lặp 2';
                    } else {
                        const last3 = results.slice(-3);
                        const prev3 = results.slice(-6, -3);
                        if (last3.length === 3 && prev3.length === 3 && last3[0] === prev3[0] && last3[1] === prev3[1] && last3[2] === prev3[2]) {
                            prediction = last3[0];
                            confidence = 0.85;
                            reason = 'Mẫu lặp 3';
                        } else {
                            prediction = results[results.length - 1];
                            confidence = 0.40;
                            reason = 'Không phát hiện mẫu lặp';
                        }
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu';
                }
                break;
            }
            case 'tinh_he_so_tuong_quan': {
                const n = Math.min(results.length, 10);
                const taiCount = results.slice(-n).filter(r => r === 'Tài').length;
                const ratio = taiCount / n;
                if (ratio > 0.7) {
                    prediction = 'Xỉu'; confidence = 0.70;
                    reason = `Tương quan Tài ${(ratio*100).toFixed(0)}% → Xỉu`;
                } else if (ratio < 0.3) {
                    prediction = 'Tài'; confidence = 0.70;
                    reason = `Tương quan Xỉu ${((1-ratio)*100).toFixed(0)}% → Tài`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.45;
                    reason = 'Tương quan trung bình';
                }
                break;
            }
            case 'du_doan_doan_nhiet': {
                const last10 = results.slice(-10);
                const taiCount = last10.filter(r => r === 'Tài').length;
                if (taiCount <= 2) {
                    prediction = 'Tài'; confidence = 0.80;
                    reason = 'Đoạn nhiệt Tài';
                } else if (taiCount >= 8) {
                    prediction = 'Xỉu'; confidence = 0.80;
                    reason = 'Đoạn nhiệt Xỉu';
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.45;
                    reason = 'Không có đoạn nhiệt';
                }
                break;
            }
            case 'phan_tich_pha': {
                const streak = this.getStreak(results);
                const last = results[results.length - 1];
                if (streak >= 3) {
                    prediction = last; confidence = 0.78;
                    reason = 'Pha bệt mạnh';
                } else if (streak >= 2 && results.length > 3 && results[results.length - 3] === last) {
                    prediction = last; confidence = 0.70;
                    reason = 'Pha bệt vừa';
                } else {
                    prediction = last === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.55;
                    reason = 'Pha xen kẽ';
                }
                break;
            }
            case 'nhan_dien_song': {
                const last8 = results.slice(-8);
                let up = 0, down = 0;
                for (let i = 0; i < last8.length - 1; i++) {
                    if (last8[i] === 'Tài' && last8[i+1] === 'Xỉu') down++;
                    else if (last8[i] === 'Xỉu' && last8[i+1] === 'Tài') up++;
                }
                if (up > down + 2) {
                    prediction = 'Tài'; confidence = 0.72;
                    reason = 'Sóng tăng';
                } else if (down > up + 2) {
                    prediction = 'Xỉu'; confidence = 0.72;
                    reason = 'Sóng giảm';
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.45;
                    reason = 'Sóng trung tính';
                }
                break;
            }
            case 'tinh_toan_momentum': {
                const mom = this.calculateMomentum(results);
                if (mom.strength > 0.6) {
                    prediction = mom.direction;
                    confidence = 0.76;
                    reason = `Momentum ${mom.direction} ${(mom.strength*100).toFixed(0)}%`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.45;
                    reason = 'Momentum yếu';
                }
                break;
            }
            case 'du_doan_hoi_phuc': {
                const streak = this.getStreak(results);
                if (streak >= 4 && results.length > 4 && results[results.length - streak - 1] !== results[results.length - 1]) {
                    prediction = results[results.length - 1];
                    confidence = 0.78;
                    reason = 'Phục hồi sau bệt dài';
                } else {
                    prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.50;
                    reason = 'Không có phục hồi';
                }
                break;
            }
            case 'phat_hien_dot_bien': {
                if (results.length >= 4) {
                    const last4 = results.slice(-4);
                    if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] !== last4[3]) {
                        prediction = last4[3];
                        confidence = 0.82;
                        reason = 'Đột biến bệt 3→ khác';
                    } else if (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] === last4[3]) {
                        prediction = last4[3];
                        confidence = 0.78;
                        reason = 'Đột biến xen kẽ → bệt';
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.40;
                        reason = 'Không có đột biến';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu';
                }
                break;
            }
            case 'phan_tich_can_bang': {
                const last10 = results.slice(-10);
                const taiCount = last10.filter(r => r === 'Tài').length;
                const xiuCount = last10.length - taiCount;
                if (Math.abs(taiCount - xiuCount) <= 2) {
                    prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.70;
                    reason = 'Cân bằng, đảo chiều';
                } else {
                    prediction = taiCount > xiuCount ? 'Tài' : 'Xỉu';
                    confidence = 0.60;
                    reason = 'Mất cân bằng, theo đa số';
                }
                break;
            }
            case 'nhan_dien_tan_so': {
                const freq = this.analyzeFrequency(results);
                if (freq.ratio > 0.65) {
                    prediction = freq.dominant === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.72;
                    reason = `Tần suất ${freq.dominant} cao → đảo`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.45;
                    reason = 'Tần suất trung bình';
                }
                break;
            }
            case 'du_doan_chu_ky': {
                const cycle = this.detectCycle(results);
                if (cycle.found) {
                    prediction = cycle.next;
                    confidence = 0.75;
                    reason = `Chu kỳ ${cycle.length} phát hiện`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Không phát hiện chu kỳ';
                }
                break;
            }
            case 'tinh_toan_ma_tran': {
                if (results.length >= 8) {
                    const last8 = results.slice(-8);
                    let taiCount = last8.filter(r => r === 'Tài').length;
                    if (taiCount >= 5) {
                        prediction = 'Xỉu'; confidence = 0.74;
                        reason = 'Ma trận Tài chiếm ưu thế → Xỉu';
                    } else if (taiCount <= 3) {
                        prediction = 'Tài'; confidence = 0.74;
                        reason = 'Ma trận Xỉu chiếm ưu thế → Tài';
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.45;
                        reason = 'Ma trận trung bình';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu ma trận';
                }
                break;
            }
            case 'phan_tich_tong_hop': {
                const freq = this.analyzeFrequency(results);
                const trend = this.getLongTrend(results);
                const cycle = this.detectCycle(results);
                let score = 0;
                let preds = [];
                if (freq.ratio > 0.6) { preds.push(freq.dominant); score++; }
                if (trend.strength > 0.7) { preds.push(trend.direction); score++; }
                if (cycle.found) { preds.push(cycle.next); score++; }
                if (score >= 2) {
                    const taiWeight = preds.filter(p => p === 'Tài').length / preds.length;
                    if (taiWeight > 0.6) { prediction = 'Tài'; confidence = 0.80; }
                    else if (taiWeight < 0.4) { prediction = 'Xỉu'; confidence = 0.80; }
                    else { prediction = results[results.length - 1]; confidence = 0.55; }
                    reason = `Tổng hợp ${score} signals`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Tổng hợp không đồng thuận';
                }
                break;
            }
            case 'du_doan_bat_ngo': {
                const last5 = results.slice(-5);
                const streak = this.getStreak(results);
                if (streak >= 5 && last5[0] === last5[4]) {
                    prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.72;
                    reason = 'Dự đoán bất ngờ bệt dài';
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Không có bất ngờ';
                }
                break;
            }
            case 'phan_tich_du_lieu_nhieu': {
                if (results.length >= 15) {
                    const first5 = results.slice(0, 5);
                    const last5 = results.slice(-5);
                    const firstTai = first5.filter(r => r === 'Tài').length;
                    const lastTai = last5.filter(r => r === 'Tài').length;
                    if (lastTai > firstTai + 3) {
                        prediction = 'Xỉu'; confidence = 0.78;
                        reason = 'Dữ liệu nhiễu, đảo chiều';
                    } else if (lastTai < firstTai - 3) {
                        prediction = 'Tài'; confidence = 0.78;
                        reason = 'Dữ liệu nhiễu, đảo chiều';
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.45;
                        reason = 'Nhiễu trung bình';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu nhiễu';
                }
                break;
            }
            case 'nhan_dien_ngoai_le': {
                const last4 = results.slice(-4);
                const last8 = results.slice(-8);
                let taiCount = last8.filter(r => r === 'Tài').length;
                if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] !== last4[3] && taiCount > 4) {
                    prediction = last4[3];
                    confidence = 0.76;
                    reason = 'Ngoại lệ trong xu hướng Tài';
                } else if (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] === last4[3] && taiCount < 4) {
                    prediction = last4[3];
                    confidence = 0.76;
                    reason = 'Ngoại lệ trong xu hướng Xỉu';
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Không có ngoại lệ';
                }
                break;
            }
            case 'tinh_toan_do_lech': {
                const last10 = results.slice(-10);
                const taiCount = last10.filter(r => r === 'Tài').length;
                const xiuCount = last10.length - taiCount;
                const diff = Math.abs(taiCount - xiuCount);
                if (diff >= 4) {
                    prediction = taiCount > xiuCount ? 'Xỉu' : 'Tài';
                    confidence = 0.78;
                    reason = `Độ lệch ${diff}, đảo chiều`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.50;
                    reason = `Độ lệch thấp ${diff}`;
                }
                break;
            }
            case 'du_doan_can_bang_lai': {
                const last10 = results.slice(-10);
                const taiCount = last10.filter(r => r === 'Tài').length;
                if (taiCount >= 7) {
                    prediction = 'Xỉu'; confidence = 0.76;
                    reason = 'Cân bằng lại sau Tài dài';
                } else if (taiCount <= 3) {
                    prediction = 'Tài'; confidence = 0.76;
                    reason = 'Cân bằng lại sau Xỉu dài';
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.45;
                    reason = 'Đang cân bằng';
                }
                break;
            }
            case 'phan_tich_xu_huong_an': {
                if (results.length >= 8) {
                    const last8 = results.slice(-8);
                    let taiCount = last8.filter(r => r === 'Tài').length;
                    if (taiCount <= 2) {
                        prediction = 'Tài'; confidence = 0.82;
                        reason = 'Xu hướng ẩn Tài';
                    } else if (taiCount >= 6) {
                        prediction = 'Xỉu'; confidence = 0.82;
                        reason = 'Xu hướng ẩn Xỉu';
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.45;
                        reason = 'Xu hướng ẩn trung tính';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu';
                }
                break;
            }
            case 'nhan_dien_cau_nhieu_pha': {
                const last12 = results.slice(-12);
                let phases = [];
                let currentPhase = last12[0];
                let count = 1;
                for (let i = 1; i < last12.length; i++) {
                    if (last12[i] === currentPhase) count++;
                    else {
                        phases.push({ value: currentPhase, count });
                        currentPhase = last12[i];
                        count = 1;
                    }
                }
                phases.push({ value: currentPhase, count });
                if (phases.length >= 4) {
                    const lastPhase = phases[phases.length - 1];
                    if (lastPhase.count >= 3) {
                        prediction = lastPhase.value;
                        confidence = 0.78;
                        reason = `Cầu nhiều pha, pha cuối ${lastPhase.value} ${lastPhase.count}`;
                    } else {
                        prediction = lastPhase.value === 'Tài' ? 'Xỉu' : 'Tài';
                        confidence = 0.72;
                        reason = `Cầu nhiều pha, chuyển pha`;
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Ít pha';
                }
                break;
            }
            case 'du_doan_theo_mau_cu': {
                if (this.patternLibrary) {
                    const last5 = results.slice(-5).join('');
                    let match = null;
                    for (let [type, patterns] of Object.entries(this.patternLibrary)) {
                        if (patterns.includes(last5)) {
                            match = { type, pattern: last5 };
                            break;
                        }
                    }
                    if (match) {
                        prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                        confidence = 0.76;
                        reason = `Theo mẫu cũ ${match.type}`;
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.40;
                        reason = 'Không có mẫu cũ';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Thư viện mẫu rỗng';
                }
                break;
            }
            case 'phan_tich_xac_suat_doi': {
                const last6 = results.slice(-6);
                let taiCount = last6.filter(r => r === 'Tài').length;
                let xiuCount = last6.length - taiCount;
                if (taiCount === 3 && xiuCount === 3) {
                    prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.78;
                    reason = 'Xác suất đối, đảo chiều';
                } else {
                    prediction = taiCount > xiuCount ? 'Tài' : 'Xỉu';
                    confidence = 0.60;
                    reason = 'Xác suất lệch, theo đa số';
                }
                break;
            }
            case 'tinh_toan_confidence_boost': {
                const freq = this.analyzeFrequency(results);
                const trend = this.getLongTrend(results);
                let boost = 0;
                if (freq.ratio > 0.7) boost += 0.1;
                if (trend.strength > 0.8) boost += 0.1;
                if (boost > 0) {
                    prediction = freq.dominant === 'Tài' ? 'Xỉu' : 'Tài';
                    confidence = 0.70 + boost;
                    reason = `Boost confidence ${(boost*100).toFixed(0)}%`;
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.45;
                    reason = 'Không có boost';
                }
                break;
            }
            case 'du_doan_chong_ramdom': {
                // Chống random: ưu tiên xu hướng dài hạn
                if (results.length >= 10) {
                    const trend = this.getLongTrend(results);
                    if (trend.strength > 0.65) {
                        prediction = trend.direction;
                        confidence = 0.78;
                        reason = `Chống random: theo xu hướng ${trend.direction}`;
                    } else {
                        const last = results[results.length - 1];
                        prediction = last;
                        confidence = 0.55;
                        reason = 'Chống random: giữ nguyên';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.40;
                    reason = 'Chống random: thiếu dữ liệu';
                }
                break;
            }
            case 'phan_tich_chuoi_phuc_hop': {
                if (results.length >= 8) {
                    const last8 = results.slice(-8);
                    let complexity = 0;
                    for (let i = 0; i < last8.length - 1; i++) {
                        if (last8[i] !== last8[i+1]) complexity++;
                    }
                    if (complexity >= 5) {
                        prediction = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
                        confidence = 0.74;
                        reason = 'Chuỗi phức tạp, đảo chiều';
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.50;
                        reason = 'Chuỗi đơn giản';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu';
                }
                break;
            }
            case 'nhan_dien_cau_kin': {
                if (results.length >= 10) {
                    const last10 = results.slice(-10);
                    let taiCount = last10.filter(r => r === 'Tài').length;
                    if (taiCount >= 6 && taiCount <= 8) {
                        prediction = 'Xỉu'; confidence = 0.74;
                        reason = 'Cầu kín Tài, dự Xỉu';
                    } else if (taiCount >= 2 && taiCount <= 4) {
                        prediction = 'Tài'; confidence = 0.74;
                        reason = 'Cầu kín Xỉu, dự Tài';
                    } else {
                        prediction = results[results.length - 1];
                        confidence = 0.45;
                        reason = 'Không phát hiện cầu kín';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu';
                }
                break;
            }
            case 'du_doan_theo_so_lan': {
                if (results.length >= 5) {
                    const last5 = results.slice(-5);
                    const taiCount = last5.filter(r => r === 'Tài').length;
                    if (taiCount === 0) {
                        prediction = 'Tài'; confidence = 0.82;
                        reason = 'Theo số lần: 0 Tài → Tài';
                    } else if (taiCount === 5) {
                        prediction = 'Xỉu'; confidence = 0.82;
                        reason = 'Theo số lần: 5 Tài → Xỉu';
                    } else {
                        prediction = taiCount > 2 ? 'Tài' : 'Xỉu';
                        confidence = 0.55;
                        reason = `Theo số lần: ${taiCount}/5 Tài`;
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu';
                }
                break;
            }
            case 'tinh_toan_tan_suat_xuat_hien': {
                if (results.length >= 8) {
                    const last8 = results.slice(-8);
                    let last = results[results.length - 1];
                    let count = last8.filter(r => r === last).length;
                    if (count >= 5) {
                        prediction = last === 'Tài' ? 'Xỉu' : 'Tài';
                        confidence = 0.76;
                        reason = `Tần suất ${last} ${count}/8 cao → đảo`;
                    } else if (count <= 2) {
                        prediction = last;
                        confidence = 0.70;
                        reason = `Tần suất ${last} thấp → theo`;
                    } else {
                        prediction = last;
                        confidence = 0.50;
                        reason = 'Tần suất trung bình';
                    }
                } else {
                    prediction = results[results.length - 1];
                    confidence = 0.35;
                    reason = 'Không đủ dữ liệu';
                }
                break;
            }
            default: {
                // Fallback
                const last = results[results.length - 1];
                prediction = last === 'Tài' ? 'Xỉu' : 'Tài';
                confidence = 0.50;
                reason = `Mini model ${index} fallback`;
            }
        }

        if (prediction && confidence > 0) {
            return { prediction, confidence: Math.min(confidence, 0.95), reason, model_name: `mini_${index}_${miniModel.specialty}` };
        }
        return null;
    }

    // ==================== HÀM HỖ TRỢ NÂNG CAO ====================
    isAlternatingWithTolerance(results, tolerance) {
        if (results.length < 2) return false;
        const last = results.slice(-6);
        let errors = 0;
        for (let i = 0; i < last.length - 1; i++) {
            if (last[i] === last[i+1]) errors++;
        }
        return errors <= tolerance;
    }

    analyzeBasicPatterns(history) {
        if (history.length < 3) {
            return { prediction: null, confidence: 0, reason: 'Không đủ dữ liệu' };
        }
        const results = this.getResultArray(history);
        const patterns = {
            '1-1': this.checkAlternatingPattern(results),
            '1-2-1': this.checkPattern121(results),
            '2-1-2': this.checkPattern212(results),
            '3-1': this.checkPattern31(results),
            '1-3': this.checkPattern13(results),
            '2-2': this.checkPattern22(results),
            'bệt': this.checkStreakPattern(results),
            'đảo': this.checkReversalPattern(results)
        };
        let best = null;
        let bestConf = 0;
        for (let [key, val] of Object.entries(patterns)) {
            if (val && val.confidence > bestConf) {
                bestConf = val.confidence;
                best = { ...val, pattern_type: key };
            }
        }
        if (best && best.prediction) {
            return { prediction: best.prediction, confidence: best.confidence, reason: `Phát hiện cầu ${best.pattern_type} (${(best.confidence*100).toFixed(0)}%)` };
        }
        return { prediction: results[results.length - 1], confidence: 0.3, reason: 'Không phát hiện pattern rõ ràng' };
    }

    checkAlternatingPattern(results) {
        if (results.length < 2) return { prediction: null, confidence: 0 };
        const last = results[results.length - 1];
        const pred = last === 'Tài' ? 'Xỉu' : 'Tài';
        let conf = 0.5;
        for (let i = results.length - 2; i >= Math.max(results.length - 6, 0); i -= 2) {
            if (results[i] === last) conf += 0.1;
            else break;
        }
        return { prediction: pred, confidence: Math.min(conf, 0.95) };
    }

    checkPattern121(results) {
        if (results.length < 3) return { prediction: null, confidence: 0 };
        if (results[results.length - 3] === results[results.length - 1] && results[results.length - 2] !== results[results.length - 1]) {
            return { prediction: results[results.length - 1], confidence: 0.72 };
        }
        return { prediction: results[results.length - 1], confidence: 0.30 };
    }

    checkPattern212(results) {
        if (results.length < 3) return { prediction: null, confidence: 0 };
        if (results[results.length - 3] !== results[results.length - 1] && results[results.length - 2] === results[results.length - 1]) {
            return { prediction: results[results.length - 2], confidence: 0.72 };
        }
        return { prediction: results[results.length - 1], confidence: 0.30 };
    }

    checkPattern31(results) {
        if (results.length < 4) return { prediction: null, confidence: 0 };
        if (results[results.length - 4] === results[results.length - 3] && results[results.length - 3] === results[results.length - 2] &&
            results[results.length - 2] !== results[results.length - 1]) {
            return { prediction: results[results.length - 1], confidence: 0.80 };
        }
        return { prediction: results[results.length - 1], confidence: 0.20 };
    }

    checkPattern13(results) {
        if (results.length < 4) return { prediction: null, confidence: 0 };
        if (results[results.length - 4] !== results[results.length - 3] && results[results.length - 3] === results[results.length - 2] &&
            results[results.length - 2] === results[results.length - 1]) {
            return { prediction: results[results.length - 1], confidence: 0.80 };
        }
        return { prediction: results[results.length - 1], confidence: 0.20 };
    }

    checkPattern22(results) {
        if (results.length < 4) return { prediction: null, confidence: 0 };
        if (results[results.length - 4] === results[results.length - 3] && results[results.length - 2] === results[results.length - 1] &&
            results[results.length - 3] !== results[results.length - 2]) {
            return { prediction: results[results.length - 1], confidence: 0.76 };
        }
        return { prediction: results[results.length - 1], confidence: 0.25 };
    }

    checkStreakPattern(results) {
        const streak = this.getStreak(results);
        if (streak >= 3) {
            let conf = 0.6 + (streak * 0.05);
            return { prediction: results[results.length - 1], confidence: Math.min(conf, 0.90) };
        }
        const other = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
        if (streak >= 6) return { prediction: other, confidence: 0.68 };
        return { prediction: results[results.length - 1], confidence: 0.40 };
    }

    checkReversalPattern(results) {
        if (results.length < 3) return { prediction: null, confidence: 0 };
        if (results[results.length - 2] !== results[results.length - 1]) {
            return { prediction: results[results.length - 1], confidence: 0.50 };
        }
        const other = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
        return { prediction: other, confidence: 0.40 };
    }

    analyzeShortTerm(history) {
        if (history.length < 3) return { prediction: null, confidence: 0, reason: 'Không đủ dữ liệu' };
        const results = this.getResultArray(history);
        const last3 = results.slice(-3);
        let patterns = [];
        if (last3[0] === last3[1] && last3[1] === last3[2]) {
            patterns.push({ type: 'bệt', prediction: last3[0], confidence: 0.78 });
        }
        if (last3[0] === last3[1] && last3[1] !== last3[2]) {
            patterns.push({ type: '2-1', prediction: last3[2], confidence: 0.72 });
        }
        if (last3[0] !== last3[1] && last3[1] === last3[2]) {
            const other = last3[2] === 'Tài' ? 'Xỉu' : 'Tài';
            patterns.push({ type: '1-2', prediction: other, confidence: 0.68 });
        }
        if (results.length >= 4) {
            const last4 = results.slice(-4);
            if (last4[0] !== last4[1] && last4[1] !== last4[2] && last4[2] !== last4[3]) {
                const other = last4[3] === 'Tài' ? 'Xỉu' : 'Tài';
                patterns.push({ type: 'xen_kẽ', prediction: other, confidence: 0.82 });
            }
        }
        if (patterns.length > 0) {
            const best = patterns.reduce((a, b) => a.confidence > b.confidence ? a : b);
            return { prediction: best.prediction, confidence: best.confidence, pattern: best.type, reason: `Ngắn hạn: ${best.type}` };
        }
        return { prediction: results[results.length - 1], confidence: 0.40, reason: 'Không có pattern ngắn hạn' };
    }

    analyzeDiceVolatility(history) {
        if (history.length < 5) return { prediction: null, confidence: 0, reason: 'Không đủ dữ liệu' };
        const faceSequences = [];
        history.forEach(h => {
            if (h.Xuc_xac_1 !== undefined) faceSequences.push(h.Xuc_xac_1);
            if (h.Xuc_xac_2 !== undefined) faceSequences.push(h.Xuc_xac_2);
            if (h.Xuc_xac_3 !== undefined) faceSequences.push(h.Xuc_xac_3);
        });
        if (faceSequences.length === 0) return { prediction: null, confidence: 0, reason: 'Không có dữ liệu mặt' };

        const recentFaces = [];
        history.slice(-5).forEach(h => {
            if (h.Xuc_xac_1 !== undefined) recentFaces.push(h.Xuc_xac_1);
            if (h.Xuc_xac_2 !== undefined) recentFaces.push(h.Xuc_xac_2);
            if (h.Xuc_xac_3 !== undefined) recentFaces.push(h.Xuc_xac_3);
        });
        const freq = {};
        for (let i = 1; i <= 6; i++) freq[i] = 0;
        recentFaces.forEach(f => freq[f]++);
        const predictions = [];
        for (let face = 1; face <= 6; face++) {
            if (freq[face] < 2) {
                predictions.push({ face, prob: 0.3 + (2 - freq[face]) * 0.1 });
            }
        }
        if (predictions.length >= 3) {
            predictions.sort((a, b) => b.prob - a.prob);
            const top = predictions.slice(0, 3);
            const scores = [];
            for (let i = 0; i < top.length; i++) {
                for (let j = i; j < top.length; j++) {
                    for (let k = j; k < top.length; k++) {
                        scores.push(top[i].face + top[j].face + top[k].face);
                    }
                }
            }
            if (scores.length > 0) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                const pred = avg >= 11 ? 'Tài' : 'Xỉu';
                return { prediction: pred, confidence: 0.68, predicted_faces: top.map(t => t.face), reason: `Biến động: ${top.map(t => t.face).join(',')} có khả năng` };
            }
        }
        return { prediction: history[history.length - 1].Ket_qua || (history[history.length - 1].Tong >= 11 ? 'Tài' : 'Xỉu'), confidence: 0.40, reason: 'Không phát hiện biến động đặc biệt' };
    }

    analyzeFrequency(results) {
        const recent = results.slice(-20);
        const taiCount = recent.filter(r => r === 'Tài').length;
        const xiuCount = recent.length - taiCount;
        const ratio = Math.max(taiCount, xiuCount) / recent.length;
        const dominant = taiCount > xiuCount ? 'Tài' : 'Xỉu';
        return { dominant, ratio };
    }

    detectCycle(results) {
        for (let len of [2, 3, 4, 5]) {
            if (results.length < len * 2) continue;
            const last = results.slice(-len);
            const prev = results.slice(-len*2, -len);
            if (last.length === len && prev.length === len && last.every((v, i) => v === prev[i])) {
                return { found: true, length: len, next: last[0] };
            }
        }
        return { found: false };
    }

    checkSymmetry(results) {
        if (results.length < 6) return { found: false };
        const last3 = results.slice(-3);
        const prev3 = results.slice(-6, -3);
        if (last3[0] === prev3[2] && last3[1] === prev3[1] && last3[2] === prev3[0]) {
            return { found: true, prediction: last3[1] };
        }
        return { found: false };
    }

    checkFibonacci(results) {
        const fibs = [1, 2, 3, 5, 8];
        for (let fib of fibs) {
            if (results.length >= fib * 2) {
                const last = results.slice(-fib);
                const prev = results.slice(-fib*2, -fib);
                if (last.length === fib && prev.length === fib && last.every((v, i) => v === prev[i])) {
                    return { found: true, prediction: last[0] };
                }
            }
        }
        return { found: false };
    }

    getLongTrend(results) {
        if (results.length < 10) return { strength: 0, direction: null };
        const first = results.slice(0, 5);
        const last = results.slice(-5);
        const firstTai = first.filter(r => r === 'Tài').length;
        const lastTai = last.filter(r => r === 'Tài').length;
        if (lastTai > firstTai + 2) return { strength: 0.8, direction: 'Tài' };
        if (lastTai < firstTai - 2) return { strength: 0.8, direction: 'Xỉu' };
        return { strength: 0.5, direction: lastTai > 2 ? 'Tài' : 'Xỉu' };
    }

    superAnalysis(results) {
        const freq = this.analyzeFrequency(results);
        const trend = this.getLongTrend(results);
        const cycle = this.detectCycle(results);
        let predictions = [];
        if (freq.ratio > 0.6) predictions.push({ pred: freq.dominant, weight: freq.ratio });
        if (trend.strength > 0.7) predictions.push({ pred: trend.direction, weight: trend.strength });
        if (cycle.found) predictions.push({ pred: cycle.next, weight: 0.7 });
        if (predictions.length >= 2) {
            const taiW = predictions.filter(p => p.pred === 'Tài').reduce((s, p) => s + p.weight, 0);
            const xiuW = predictions.filter(p => p.pred === 'Xỉu').reduce((s, p) => s + p.weight, 0);
            if (taiW > xiuW * 1.4) return { prediction: 'Tài', confidence: 0.85, reason: 'Siêu phân tích: Tài' };
            if (xiuW > taiW * 1.4) return { prediction: 'Xỉu', confidence: 0.85, reason: 'Siêu phân tích: Xỉu' };
        }
        return { confidence: 0 };
    }

    calculateMomentum(results) {
        if (results.length < 7) return { strength: 0, direction: null };
        const last7 = results.slice(-7);
        let taiCount = last7.filter(r => r === 'Tài').length;
        let strength = Math.abs(taiCount - (7 - taiCount)) / 7;
        let direction = taiCount > 3 ? 'Tài' : 'Xỉu';
        return { strength, direction };
    }

    calculateVolatility(results) {
        if (results.length < 8) return { prediction: null, level: 'low' };
        const last8 = results.slice(-8);
        let changes = 0;
        for (let i = 0; i < last8.length - 1; i++) {
            if (last8[i] !== last8[i+1]) changes++;
        }
        const level = changes >= 5 ? 'high' : (changes >= 3 ? 'medium' : 'low');
        if (level === 'high') {
            const pred = results[results.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
            return { prediction: pred, level };
        }
        return { prediction: null, level };
    }

    // ==================== TỔNG HỢP ENSEMBLE ====================
    ensembleModels(history) {
        const modelResults = {};

        // Main models
        modelResults.model1 = this.analyzeBasicPatterns(history);
        modelResults.model2 = this.analyzeShortTerm(history);
        modelResults.model3 = this.analyzeDiceVolatility(history);

        // Sub models (1-64)
        for (let i = 1; i <= 64; i++) {
            const subResult = this.runSubModel(i, history);
            if (subResult && subResult.prediction) {
                modelResults[`sub_model_${i}`] = subResult;
            }
        }

        // Mini models (1-36)
        for (let i = 1; i <= 36; i++) {
            const miniResult = this.runMiniModel(i, history);
            if (miniResult && miniResult.prediction) {
                modelResults[`mini_model_${i}`] = miniResult;
            }
        }

        // Weighted voting
        let taiWeight = 0, xiuWeight = 0, totalWeight = 0;
        let details = [];

        for (let [name, result] of Object.entries(modelResults)) {
            if (result && result.prediction && result.confidence > 0.25) {
                let weight = 1.0;
                if (name.startsWith('sub_')) weight = this.subModelWeights[name] || 1.0;
                else if (name.startsWith('mini_')) weight = this.miniModelWeights[name] || 1.0;
                else weight = this.modelWeights[name] || 1.0;

                // Tăng trọng số cho các model có độ chính xác cao
                if (this.performanceHistory[name]) {
                    const acc = this.performanceHistory[name].accuracy || 0.5;
                    weight *= (0.5 + acc * 0.5);
                }

                const weighted = weight * result.confidence;
                if (result.prediction === 'Tài') taiWeight += weighted;
                else if (result.prediction === 'Xỉu') xiuWeight += weighted;
                totalWeight += weighted;
                details.push({
                    model: result.model_name || name,
                    prediction: result.prediction,
                    confidence: result.confidence,
                    weight: weight,
                    reason: result.reason || ''
                });
            }
        }

        details.sort((a, b) => b.confidence - a.confidence);

        let finalPrediction, finalConfidence, finalReason, finalType, finalPattern;

        if (totalWeight > 0) {
            const taiRatio = taiWeight / totalWeight;
            const xiuRatio = xiuWeight / totalWeight;

            // Áp dụng anti-random
            const adjusted = this.antiRandomAdjustment(
                taiRatio > xiuRatio ? 'Tài' : 'Xỉu',
                Math.max(taiRatio, xiuRatio),
                history
            );

            if (adjusted.adjusted) {
                finalPrediction = adjusted.prediction;
                finalConfidence = adjusted.confidence;
                finalReason = `[CHỐNG RANDOM] ${adjusted.prediction}`;
            } else if (taiRatio > 0.52) {
                finalPrediction = 'Tài';
                finalConfidence = taiRatio;
                finalReason = `Đa số model đồng thuận Tài (${(taiRatio*100).toFixed(1)}%)`;
            } else if (xiuRatio > 0.52) {
                finalPrediction = 'Xỉu';
                finalConfidence = xiuRatio;
                finalReason = `Đa số model đồng thuận Xỉu (${(xiuRatio*100).toFixed(1)}%)`;
            } else {
                const best = details[0];
                if (best) {
                    finalPrediction = best.prediction;
                    finalConfidence = 0.5 + best.confidence * 0.25;
                    finalReason = `Không đồng thuận, dùng model ${best.model}: ${best.reason}`;
                } else {
                    finalPrediction = history.length > 0 ? (history[history.length - 1].Ket_qua || (history[history.length - 1].Tong >= 11 ? 'Tài' : 'Xỉu')) : 'Tài';
                    finalConfidence = 0.50;
                    finalReason = "Không đủ dữ liệu model";
                }
            }
        } else {
            finalPrediction = history.length > 0 ? (history[history.length - 1].Ket_qua || (history[history.length - 1].Tong >= 11 ? 'Tài' : 'Xỉu')) : 'Tài';
            finalConfidence = 0.50;
            finalReason = "Không có model nào hoạt động";
        }

        if (details.length > 0) {
            finalType = details[0].model;
            finalPattern = history.length > 0 ? this.getResultArray(history.slice(-5)).join('') : '';
        } else {
            finalType = 'Không xác định';
            finalPattern = '';
        }

        return {
            prediction: finalPrediction,
            confidence: Math.min(finalConfidence, 0.98),
            reason: finalReason,
            pattern_type: finalType,
            pattern: finalPattern,
            details: details.slice(0, 5)
        };
    }

    // ==================== CẬP NHẬT TRỌNG SỐ ====================
    updateModelWeights(actual, predicted, confidence) {
        const correct = (actual === predicted) ? 1 : 0;
        const adjustment = correct ? 1.02 : 0.98;

        for (let name in this.modelWeights) {
            this.modelWeights[name] = Math.min(Math.max(this.modelWeights[name] * adjustment, 0.4), 2.5);
            if (!this.performanceHistory[name]) this.performanceHistory[name] = { total: 0, correct: 0 };
            this.performanceHistory[name].total++;
            if (correct) this.performanceHistory[name].correct++;
            this.performanceHistory[name].accuracy = this.performanceHistory[name].correct / this.performanceHistory[name].total;
        }
        for (let name in this.subModelWeights) {
            this.subModelWeights[name] = Math.min(Math.max(this.subModelWeights[name] * (correct ? 1.01 : 0.99), 0.5), 2.0);
        }
        for (let name in this.miniModelWeights) {
            this.miniModelWeights[name] = Math.min(Math.max(this.miniModelWeights[name] * (correct ? 1.008 : 0.992), 0.6), 1.8);
        }
        saveModelWeights();
    }
}

// ==================== KHỞI TẠO ANALYZER ====================
const analyzer = new TaiXiuAnalyzer();

// ==================== WEBSOCKET ====================
const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW9udCI6MCwidXNlcm5hbWUiOiJTQ19hcGlzdW53aW4xMjMifQ.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 1500;
const PING_INTERVAL = 10000;

const initialMessages = [
    [1, "MiniGame", "GM_apivopnha", "WangLin", {
        "info": "{\"ipAddress\":\"14.249.227.107\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiI5ODE5YW5zc3MiLCJib3QiOjAsImlzTWVyY2hhbnQiOmZhbHNlLCJ2ZXJpZmllZEJhbmtBY2NvdW50IjpmYWxzZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjozMjMyODExNTEsImFmZklkIjoic3VuLndpbiIsImJhbm5lZCI6ZmFsc2UsImJyYW5kIjoiZ2VtIiwidGltZXN0YW1wIjoxNzYzMDMyOTI4NzcwLCJsb2NrR2FtZXMiOltdLCJhbW91bnQiOjAsImxvY2tDaGF0IjpmYWxzZSwicGhvbmVWZXJpZmllZCI6ZmFsc2UsImlwQWRkcmVzcyI6IjE0LjI0OS4yMjcuMTA3IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8wNS5wbmciLCJwbGF0Zm9ybUlkIjo0LCJ1c2VySWQiOiI4ODM4NTMzZS1kZTQzLTRiOGQtOTUwMy02MjFmNDA1MDUzNGUiLCJyZWdUaW1lIjoxNzYxNjMyMzAwNTc2LCJwaG9uZSI6IiIsImRlcG9zaXQiOmZhbHNlLCJ1c2VybmFtZSI6IkdNX2FwaXZvcG5oYSJ9.guH6ztJSPXUL1cU8QdMz8O1Sdy_SbxjSM-CDzWPTr-0",
        "locale": "vi",
        "userId": "8838533e-de43-4b8d-9503-621f4050534e",
        "username": "GM_apivopnha",
        "timestamp": 1763032928770,
        "refreshToken": "e576b43a64e84f789548bfc7c4c8d1e5.7d4244a361e345908af95ee2e8ab2895"
    }],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1006 }] // Thêm lệnh để lấy thêm dữ liệu
];

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
    if (ws) { ws.removeAllListeners(); ws.close(); }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }, i * 400);
        });
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.ping();
        }, PING_INTERVAL);
    });

    ws.on('pong', () => {});

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;
            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) currentSessionId = sid;
            if (cmd === 1003 && gBB) {
                if (d1 === undefined || d2 === undefined || d3 === undefined) return;

                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";

                let predictionCorrect = false;
                if (lastPrediction && lastPrediction.ket_qua) {
                    predictionCorrect = (lastPrediction.ket_qua === result);
                    stats.total++;
                    if (predictionCorrect) {
                        stats.correct++;
                        stats.consecutiveLosses = 0;
                        stats.winStreak++;
                        if (stats.winStreak > stats.maxWinStreak) stats.maxWinStreak = stats.winStreak;
                    } else {
                        stats.wrong++;
                        stats.consecutiveLosses++;
                        if (stats.consecutiveLosses > stats.maxConsecutiveLosses) stats.maxConsecutiveLosses = stats.consecutiveLosses;
                        stats.winStreak = 0;
                    }
                    analyzer.updateModelWeights(result, lastPrediction.ket_qua, parseFloat(lastPrediction.do_tin_cay) || 0.5);
                }

                const historyEntry = {
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
                saveHistory(historyEntry);

                const historyForAnalyzer = resultHistory.map(h => ({
                    score: h.Tong,
                    Ket_qua: h.Ket_qua,
                    Xuc_xac_1: h.Xuc_xac_1,
                    Xuc_xac_2: h.Xuc_xac_2,
                    Xuc_xac_3: h.Xuc_xac_3
                }));

                const ensembleResult = analyzer.ensembleModels(historyForAnalyzer);
                let finalPrediction = ensembleResult.prediction;
                let finalConfidence = ensembleResult.confidence;
                let finalType = ensembleResult.pattern_type;
                let finalPattern = ensembleResult.pattern;
                let finalReason = ensembleResult.reason;

                // Cơ chế chống thua liên tiếp (mạnh hơn)
                if (stats.consecutiveLosses >= 2) {
                    const results = historyForAnalyzer.map(h => h.Ket_qua);
                    const last = results[results.length - 1];
                    // Đảo chiều dựa trên xu hướng thực tế
                    const trend = analyzer.getLongTrend(results);
                    if (trend.strength > 0.6) {
                        finalPrediction = trend.direction;
                        finalConfidence = 0.55 + (stats.consecutiveLosses * 0.05);
                        finalType = 'CHỐNG THUA (THEO XU HƯỚNG)';
                        finalReason = `Thua ${stats.consecutiveLosses}, theo xu hướng ${trend.direction}`;
                    } else {
                        finalPrediction = last === 'Tài' ? 'Xỉu' : 'Tài';
                        finalConfidence = 0.50 + (stats.consecutiveLosses * 0.04);
                        finalType = `CHỐNG THUA (ĐẢO CHIỀU)`;
                        finalReason = `Thua ${stats.consecutiveLosses}, đảo chiều khỏi ${last}`;
                    }
                }

                // Đảm bảo không có random
                if (finalConfidence < 0.4) {
                    const results = historyForAnalyzer.map(h => h.Ket_qua);
                    const last = results[results.length - 1];
                    finalPrediction = last === 'Tài' ? 'Xỉu' : 'Tài';
                    finalConfidence = 0.45;
                    finalType = 'FALLBACK CHỐNG RANDOM';
                    finalReason = 'Confidence thấp, đảo chiều cưỡng bức';
                }

                lastPrediction = {
                    phien: currentSessionId ? parseInt(currentSessionId) + 1 : null,
                    ket_qua: finalPrediction,
                    loai_cau: finalType,
                    mau_cau: finalPattern,
                    do_tin_cay: (finalConfidence * 100).toFixed(0) + '%'
                };

                const trangThai = finalType.includes('CHỐNG') ? 'Chống đảo' :
                                 (finalType.includes('THEO') ? 'Theo xu hướng' : 'Đang theo cầu');
                const tiLe = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : '0%';

                apiResponseData = {
                    "Phien": currentSessionId,
                    "Xuc_xac_1": d1,
                    "Xuc_xac_2": d2,
                    "Xuc_xac_3": d3,
                    "Tong": total,
                    "Ket_qua": result,
                    "Phien_hien_tai": currentSessionId ? parseInt(currentSessionId) + 1 : null,
                    "Du_doan": finalPrediction,
                    "Loai_cau": finalType,
                    "Mau_cau_phat_hien": finalPattern,
                    "Do_tin_cay": (finalConfidence * 100).toFixed(0) + '%',
                    "Trang_thai": trangThai,
                    "Ket_qua_du_doan": predictionCorrect ? '✅' : (stats.total > 0 ? '❌' : '⏳'),
                    "Thong_ke": {
                        "tong": stats.total,
                        "dung": stats.correct,
                        "sai": stats.wrong,
                        "ti_le": tiLe,
                        "win_streak": stats.winStreak,
                        "max_win_streak": stats.maxWinStreak,
                        "max_loss_streak": stats.maxConsecutiveLosses
                    },
                    "id": "@tranhoang2286"
                };

                console.log('\n' + '🟦'.repeat(25));
                console.log(`🎲 Phiên ${apiResponseData.Phien} | KQ: ${result} | Tổng: ${total}`);
                console.log(`📊 Lịch sử 12 gần: ${historyForAnalyzer.slice(-12).map(h => h.Ket_qua).join(' ')}`);
                console.log(`🔍 Model: ${finalType}`);
                console.log(`🤖 Dự đoán: ${finalPrediction} (${(finalConfidence * 100).toFixed(0)}%) - ${finalReason}`);
                console.log(`📊 ${ensembleResult.details.length} models | Top: ${ensembleResult.details.slice(0,3).map(d => d.model).join(', ')}`);
                console.log(`📈 Thống kê: Đúng ${stats.correct}/${stats.total} (${tiLe}) | Win streak: ${stats.winStreak}`);
                if (stats.consecutiveLosses > 0) console.log(`⚠️ Thua liên tiếp: ${stats.consecutiveLosses}`);
                console.log('🟦'.repeat(25) + '\n');

                lastResult = result;
                currentSessionId = null;
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] WebSocket closed. Code: ${code}`);
        clearInterval(pingInterval);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] WebSocket error:', err.message);
        ws.close();
    });
}

// ==================== EXPRESS API ====================
app.get('/api/ditmemaysun', (req, res) => {
    res.json(apiResponseData);
});

app.get('/api/his', (req, res) => {
    const recent = resultHistory.slice(-30).reverse();
    res.json({
        success: true,
        total: resultHistory.length,
        data: recent,
        stats: {
            tong: stats.total,
            dung: stats.correct,
            sai: stats.wrong,
            ti_le: stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) + '%' : '0%',
            consecutive_losses: stats.consecutiveLosses,
            win_streak: stats.winStreak,
            max_win_streak: stats.maxWinStreak,
            max_loss_streak: stats.maxConsecutiveLosses
        }
    });
});

app.get('/api/models', (req, res) => {
    res.json({
        main_models: 3,
        sub_models: 64,
        mini_models: 36,
        total: 103,
        weights: { main: analyzer.modelWeights, sub: analyzer.subModelWeights, mini: analyzer.miniModelWeights },
        performance: analyzer.performanceHistory
    });
});

app.get('/api/patterns', (req, res) => {
    res.json(analyzer.patternLibrary);
});

app.get('/', (req, res) => {
    res.json(apiResponseData);
});

app.listen(PORT, () => {
    console.log(`[🌐] Server nâng cấp tại http://localhost:${PORT}`);
    console.log(`[📁] History: ${HISTORY_FILE} | Patterns: ${PATTERNS_FILE} | Weights: ${MODEL_WEIGHTS_FILE}`);
    console.log(`[🤖] Tổng models: 3 main + 64 sub + 36 mini = 103 models (không random)`);
    console.log(`[👤] ID: @tranhoang2286`);
    console.log(`[🧠] Cấu trúc models:`);
    console.log(`     - Cầu 1-1: 8 models | Cầu 2-2: 8 models | Cầu bệt: 8 models`);
    console.log(`     - Cầu 3-3: 8 models | Cầu 2-1-2/1-2-1: 8 models`);
    console.log(`     - Break/Transition: 8 models | Advanced: 8 models`);
    console.log(`     - Cầu mở rộng (4-4, 1-4, 4-1, 3-1-3, 1-3-1, super): 8 models`);
    console.log(`     - Mini models: 36 chuyên sâu`);
    console.log(`[⚙️] Chống random hoàn toàn: không sử dụng Math.random()`);
});

// ==================== START ====================
connectWebSocket();
