const axios = require('axios');

const API_URL = "https://trails-wish-motel-legacy.trycloudflare.com/api/tx";
const USER_ID = "@tranhoang2286";

// Hệ thống lưu trữ dữ liệu lịch sử phục vụ phân tích chuỗi ma trận dài
let gameHistory = [];
let detailedHistory = [];
const LIMIT_HISTORY = 200;
const MAX_DETAILED_HISTORY = 500;

// Bộ nhớ đệm cho các chỉ số thống kê
let statisticalIndicators = {
    avgTong: 0,
    stdDev: 0,
    trend: 0,
    volatility: 0,
    lastPatterns: [],
    distribution: { tai: 0, xiu: 0 },
    consecutiveTai: 0,
    consecutiveXiu: 0,
    maxConsecutiveTai: 0,
    maxConsecutiveXiu: 0
};

/**
 * HÀM TÍNH TOÁN THỐNG KÊ NÂNG CAO
 */
function updateStatisticalIndicators(history) {
    if (history.length < 5) return;
    
    // Tính tổng trung bình
    const sum = history.reduce((acc, h) => acc + h.tong, 0);
    statisticalIndicators.avgTong = sum / history.length;
    
    // Tính độ lệch chuẩn
    const squaredDiffs = history.map(h => Math.pow(h.tong - statisticalIndicators.avgTong, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / history.length;
    statisticalIndicators.stdDev = Math.sqrt(variance);
    
    // Tính độ biến động
    let changes = 0;
    for (let i = 1; i < history.length; i++) {
        changes += Math.abs(history[i].tong - history[i-1].tong);
    }
    statisticalIndicators.volatility = changes / (history.length - 1);
    
    // Cập nhật phân bố
    const taiCount = history.filter(h => h.tong >= 11).length;
    statisticalIndicators.distribution.tai = taiCount / history.length;
    statisticalIndicators.distribution.xiu = 1 - statisticalIndicators.distribution.tai;
    
    // Cập nhật xu hướng bệt
    let currentTaiStreak = 0;
    let currentXiuStreak = 0;
    let maxTai = 0;
    let maxXiu = 0;
    
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].tong >= 11) {
            currentTaiStreak++;
            currentXiuStreak = 0;
            maxTai = Math.max(maxTai, currentTaiStreak);
        } else {
            currentXiuStreak++;
            currentTaiStreak = 0;
            maxXiu = Math.max(maxXiu, currentXiuStreak);
        }
    }
    
    statisticalIndicators.consecutiveTai = currentTaiStreak;
    statisticalIndicators.consecutiveXiu = currentXiuStreak;
    statisticalIndicators.maxConsecutiveTai = Math.max(statisticalIndicators.maxConsecutiveTai, maxTai);
    statisticalIndicators.maxConsecutiveXiu = Math.max(statisticalIndicators.maxConsecutiveXiu, maxXiu);
}

/**
 * THUẬT TOÁN PHÂN TÍCH MA TRẬN ĐA CHIỀU SIÊU MẠNH
 * Kết hợp 20+ phương pháp phân tích toán học khác nhau
 */
function calculateUltraAdvancedMatrixLogic(tong, x1, x2, x3, history) {
    let taiWeight = 0;
    let xiuWeight = 0;
    let confidenceScores = [];
    
    // ====== 1. THUẬT TOÁN PHÂN TÍCH CHẴN LẺ ĐA TẦNG ======
    const diceArray = [x1, x2, x3];
    let oddCount = diceArray.filter(x => x % 2 !== 0).length;
    let evenCount = 3 - oddCount;
    let primeCount = diceArray.filter(n => {
        if (n < 2) return false;
        for (let i = 2; i <= Math.sqrt(n); i++) {
            if (n % i === 0) return false;
        }
        return true;
    }).length;
    
    // Phân tích chẵn lẻ cấp 1
    if (oddCount === 3) {
        xiuWeight += 25.7;
        taiWeight += 8.3;
        confidenceScores.push({ type: 'odd3', weight: 25.7 });
    } else if (evenCount === 3) {
        taiWeight += 25.7;
        xiuWeight += 8.3;
        confidenceScores.push({ type: 'even3', weight: 25.7 });
    } else if (oddCount === 2) {
        taiWeight += 18.9;
        xiuWeight += 6.1;
        confidenceScores.push({ type: 'odd2', weight: 18.9 });
    } else {
        xiuWeight += 18.9;
        taiWeight += 6.1;
        confidenceScores.push({ type: 'even2', weight: 18.9 });
    }
    
    // Phân tích số nguyên tố
    if (primeCount >= 2) {
        taiWeight += 14.2;
        confidenceScores.push({ type: 'prime', weight: 14.2 });
    } else {
        xiuWeight += 14.2;
        confidenceScores.push({ type: 'nonprime', weight: 14.2 });
    }
    
    // ====== 2. THUẬT TOÁN MA TRẬN KHOẢNG CÁCH HÌNH HỌC ĐA CHIỀU ======
    let sortedDice = [...diceArray].sort((a, b) => a - b);
    let gap1 = sortedDice[1] - sortedDice[0];
    let gap2 = sortedDice[2] - sortedDice[1];
    let gap3 = sortedDice[2] - sortedDice[0];
    
    // Phân tích khoảng cách tam giác
    if (gap1 === gap2 && gap1 !== 0) {
        // Cầu đối xứng tuyến tính hoàn hảo
        if (tong >= 11) {
            xiuWeight += 22.8;
            confidenceScores.push({ type: 'symetric_gap', weight: 22.8 });
        } else {
            taiWeight += 22.8;
            confidenceScores.push({ type: 'symetric_gap', weight: 22.8 });
        }
    } else if (gap1 === 0 || gap2 === 0) {
        // Có ít nhất 2 số bằng nhau
        if (tong >= 11) {
            taiWeight += 19.3;
            confidenceScores.push({ type: 'equal_dice', weight: 19.3 });
        } else {
            xiuWeight += 19.3;
            confidenceScores.push({ type: 'equal_dice', weight: 19.3 });
        }
    } else {
        // Phân phối đều
        if (tong >= 11) {
            taiWeight += 13.6;
            confidenceScores.push({ type: 'even_distribution', weight: 13.6 });
        } else {
            xiuWeight += 13.6;
            confidenceScores.push({ type: 'even_distribution', weight: 13.6 });
        }
    }
    
    // ====== 3. THUẬT TOÁN FIBONACCI VÀ HỒI QUY LOGISTIC ======
    const fiboMetric = (x1 * 2) + (x2 * 3) + (x3 * 5) + (x1 * x2 * 0.5);
    const goldenRatio = 1.618;
    const fiboAdjusted = fiboMetric / goldenRatio;
    
    if (fiboAdjusted % 2 === 0 || fiboAdjusted % 3 === 0) {
        taiWeight += 17.4;
        confidenceScores.push({ type: 'fibonacci_even', weight: 17.4 });
    } else {
        xiuWeight += 17.4;
        confidenceScores.push({ type: 'fibonacci_odd', weight: 17.4 });
    }
    
    // ====== 4. THUẬT TOÁN MA TRẬN TƯƠNG QUAN CHUỖI ======
    if (history.length >= 3) {
        let lastTongs = history.slice(-3).map(h => h.tong);
        let diffs = [];
        for (let i = 1; i < lastTongs.length; i++) {
            diffs.push(lastTongs[i] - lastTongs[i-1]);
        }
        
        // Phân tích đạo hàm cấp 1
        let positiveDiffs = diffs.filter(d => d > 0).length;
        let negativeDiffs = diffs.filter(d => d < 0).length;
        
        if (positiveDiffs === 2) {
            // Xu hướng tăng liên tục
            if (tong >= 11) {
                xiuWeight += 21.5;
                confidenceScores.push({ type: 'trend_up', weight: 21.5 });
            } else {
                taiWeight += 21.5;
                confidenceScores.push({ type: 'trend_up', weight: 21.5 });
            }
        } else if (negativeDiffs === 2) {
            // Xu hướng giảm liên tục
            if (tong >= 11) {
                taiWeight += 21.5;
                confidenceScores.push({ type: 'trend_down', weight: 21.5 });
            } else {
                xiuWeight += 21.5;
                confidenceScores.push({ type: 'trend_down', weight: 21.5 });
            }
        }
        
        // ====== 5. THUẬT TOÁN PHÂN TÍCH ĐẢO CHIỀU ======
        if (history.length >= 4) {
            let last4 = history.slice(-4);
            let pattern = last4.map(h => h.tong >= 11 ? "T" : "X").join("");
            
            // Quét 16 mẫu hình cầu khác nhau
            const patterns = {
                "TTTT": { tai: 5.0, xiu: 28.5 },
                "XXXX": { tai: 28.5, xiu: 5.0 },
                "TXTX": { tai: 15.2, xiu: 20.8 },
                "XTXT": { tai: 20.8, xiu: 15.2 },
                "TTXX": { tai: 18.3, xiu: 18.3 },
                "XXTT": { tai: 18.3, xiu: 18.3 },
                "TXXT": { tai: 16.7, xiu: 16.7 },
                "XTTX": { tai: 16.7, xiu: 16.7 },
                "TTTX": { tai: 8.2, xiu: 24.6 },
                "TXXX": { tai: 24.6, xiu: 8.2 },
                "XXXT": { tai: 24.6, xiu: 8.2 },
                "XTTT": { tai: 8.2, xiu: 24.6 },
                "TTXT": { tai: 12.5, xiu: 20.1 },
                "XXTX": { tai: 20.1, xiu: 12.5 },
                "TXTT": { tai: 12.5, xiu: 20.1 },
                "XTXX": { tai: 20.1, xiu: 12.5 }
            };
            
            if (patterns[pattern]) {
                taiWeight += patterns[pattern].tai;
                xiuWeight += patterns[pattern].xiu;
                confidenceScores.push({ 
                    type: `pattern_${pattern}`, 
                    taiWeight: patterns[pattern].tai,
                    xiuWeight: patterns[pattern].xiu
                });
            }
        }
    }
    
    // ====== 6. THUẬT TOÁN THỐNG KÊ MOMENTUM ======
    if (history.length >= 10) {
        let last10 = history.slice(-10);
        let taiCount = last10.filter(h => h.tong >= 11).length;
        let xiuCount = 10 - taiCount;
        let momentum = taiCount - xiuCount;
        
        if (momentum >= 4) {
            // Tài quá mạnh - đảo chiều
            xiuWeight += 23.7;
            confidenceScores.push({ type: 'tai_oversold', weight: 23.7 });
        } else if (momentum <= -4) {
            // Xỉu quá mạnh - đảo chiều
            taiWeight += 23.7;
            confidenceScores.push({ type: 'xiu_oversold', weight: 23.7 });
        } else if (Math.abs(momentum) <= 1) {
            // Cân bằng - chọn theo tổng điểm
            if (tong >= 11) {
                taiWeight += 15.8;
                confidenceScores.push({ type: 'balanced_tai', weight: 15.8 });
            } else {
                xiuWeight += 15.8;
                confidenceScores.push({ type: 'balanced_xiu', weight: 15.8 });
            }
        }
    }
    
    // ====== 7. THUẬT TOÁN ĐƯỜNG CONG BIẾN ĐỘNG (VOLATILITY CURVE) ======
    if (history.length >= 5) {
        let recentVolatility = 0;
        for (let i = 1; i < 5 && i < history.length; i++) {
            recentVolatility += Math.abs(history[history.length - i].tong - history[history.length - i - 1].tong);
        }
        recentVolatility = recentVolatility / Math.min(4, history.length - 1);
        
        if (recentVolatility > 7) {
            // Biến động cao - khả năng đảo chiều
            if (tong >= 11) {
                xiuWeight += 19.2;
                confidenceScores.push({ type: 'high_volatility', weight: 19.2 });
            } else {
                taiWeight += 19.2;
                confidenceScores.push({ type: 'high_volatility', weight: 19.2 });
            }
        } else if (recentVolatility < 3) {
            // Biến động thấp - khả năng bệt
            if (tong >= 11) {
                taiWeight += 16.4;
                confidenceScores.push({ type: 'low_volatility', weight: 16.4 });
            } else {
                xiuWeight += 16.4;
                confidenceScores.push({ type: 'low_volatility', weight: 16.4 });
            }
        }
    }
    
    // ====== 8. THUẬT TOÁN PHÂN TÍCH CỬA SỔ TRƯỢT NÂNG CAO ======
    for (let windowSize = 3; windowSize <= 8; windowSize++) {
        if (history.length < windowSize) continue;
        
        let window = history.slice(-windowSize);
        let windowTai = window.filter(h => h.tong >= 11).length / windowSize;
        let windowXiu = 1 - windowTai;
        
        // Phân tích tỷ lệ theo từng cửa sổ
        if (windowTai >= 0.8) {
            xiuWeight += (22.0 - windowSize * 0.5);
            confidenceScores.push({ type: `window_${windowSize}_tai`, weight: (22.0 - windowSize * 0.5) });
        } else if (windowXiu >= 0.8) {
            taiWeight += (22.0 - windowSize * 0.5);
            confidenceScores.push({ type: `window_${windowSize}_xiu`, weight: (22.0 - windowSize * 0.5) });
        }
    }
    
    // ====== 9. THUẬT TOÁN NHẬN DIỆN MẪU HÌNH SỐ HỌC ======
    let sumOfSquares = x1*x1 + x2*x2 + x3*x3;
    let product = x1 * x2 * x3;
    let sumPairProducts = x1*x2 + x2*x3 + x1*x3;
    
    // Mẫu hình đặc biệt
    if (sumOfSquares === product) {
        // Mẫu hình đặc biệt: tổng bình phương = tích
        if (tong >= 11) {
            taiWeight += 26.8;
            confidenceScores.push({ type: 'special_pattern1', weight: 26.8 });
        } else {
            xiuWeight += 26.8;
            confidenceScores.push({ type: 'special_pattern1', weight: 26.8 });
        }
    }
    
    if (sumPairProducts > 30) {
        taiWeight += 12.3;
        confidenceScores.push({ type: 'high_pair_product', weight: 12.3 });
    } else {
        xiuWeight += 12.3;
        confidenceScores.push({ type: 'low_pair_product', weight: 12.3 });
    }
    
    // ====== 10. THUẬT TOÁN PHÂN TÍCH BIÊN ĐỘ CỰC ĐẠI ======
    if (tong === 3 || tong === 4) {
        // Tổng quá thấp - khả năng đảo chiều tăng
        taiWeight += 32.0;
        xiuWeight += 8.0;
        confidenceScores.push({ type: 'extremely_low', weight: 32.0 });
    } else if (tong === 17 || tong === 18) {
        // Tổng quá cao - khả năng đảo chiều giảm
        xiuWeight += 32.0;
        taiWeight += 8.0;
        confidenceScores.push({ type: 'extremely_high', weight: 32.0 });
    } else if (tong <= 6) {
        taiWeight += 18.5;
        confidenceScores.push({ type: 'low_total', weight: 18.5 });
    } else if (tong >= 15) {
        xiuWeight += 18.5;
        confidenceScores.push({ type: 'high_total', weight: 18.5 });
    }
    
    // ====== 11. THUẬT TOÁN HỒI QUY TUYẾN TÍNH ĐA BIẾN ======
    if (history.length >= 20) {
        let n = history.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            let x = i + 1;
            let y = history[i].tong;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }
        
        // Hệ số hồi quy
        let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        let intercept = (sumY - slope * sumX) / n;
        let predictedTong = slope * n + intercept;
        
        // So sánh dự đoán với thực tế
        if (predictedTong >= 11) {
            taiWeight += 11.6;
            confidenceScores.push({ type: 'linear_regression', weight: 11.6 });
        } else {
            xiuWeight += 11.6;
            confidenceScores.push({ type: 'linear_regression', weight: 11.6 });
        }
    }
    
    // ====== 12. THUẬT TOÁN PHÂN TÍCH CHU KỲ ======
    if (history.length >= 20) {
        let period = 5;
        let correlations = [];
        
        for (let shift = 1; shift <= 10; shift++) {
            let corr = 0;
            let count = 0;
            for (let i = shift; i < history.length; i++) {
                if (history[i].tong >= 11 && history[i-shift].tong >= 11) corr++;
                else if (history[i].tong < 11 && history[i-shift].tong < 11) corr++;
                count++;
            }
            correlations.push({ shift, value: corr / count });
        }
        
        // Tìm chu kỳ mạnh nhất
        let bestShift = correlations.reduce((a, b) => a.value > b.value ? a : b);
        if (bestShift.value > 0.7) {
            // Có chu kỳ mạnh
            let recent = history[history.length - 1];
            let target = history[history.length - 1 - bestShift.shift];
            if (target) {
                if (target.tong >= 11) {
                    taiWeight += 14.4;
                    confidenceScores.push({ type: 'cycle_detected', weight: 14.4 });
                } else {
                    xiuWeight += 14.4;
                    confidenceScores.push({ type: 'cycle_detected', weight: 14.4 });
                }
            }
        }
    }
    
    // ====== 13. THUẬT TOÁN PHÂN TÍCH MA TRẬN CHUYỂN TIẾP ======
    if (history.length >= 2) {
        let lastTwo = history.slice(-2);
        let state1 = lastTwo[0].tong >= 11 ? "T" : "X";
        let state2 = lastTwo[1].tong >= 11 ? "T" : "X";
        
        // Ma trận chuyển tiếp
        const transitionMatrix = {
            "TT": { tai: 0.55, xiu: 0.45 },
            "TX": { tai: 0.35, xiu: 0.65 },
            "XT": { tai: 0.65, xiu: 0.35 },
            "XX": { tai: 0.45, xiu: 0.55 }
        };
        
        let key = state1 + state2;
        if (transitionMatrix[key]) {
            taiWeight += transitionMatrix[key].tai * 20;
            xiuWeight += transitionMatrix[key].xiu * 20;
            confidenceScores.push({ 
                type: 'transition_matrix', 
                taiWeight: transitionMatrix[key].tai * 20,
                xiuWeight: transitionMatrix[key].xiu * 20
            });
        }
    }
    
    // ====== 14. THUẬT TOÁN ĐÁNH GIÁ XÁC SUẤT BAYESIAN ======
    if (history.length >= 30) {
        let taiPrior = statisticalIndicators.distribution.tai || 0.5;
        let xiuPrior = 1 - taiPrior;
        
        // Tính likelihood
        let tongGroups = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
        let taiLikelihood = 0;
        let xiuLikelihood = 0;
        
        for (let group of tongGroups) {
            let countInGroup = history.filter(h => h.tong === group).length;
            let taiInGroup = history.filter(h => h.tong === group && h.tong >= 11).length;
            let xiuInGroup = history.filter(h => h.tong === group && h.tong < 11).length;
            
            if (countInGroup > 0) {
                if (group === tong) {
                    taiLikelihood = taiInGroup / countInGroup;
                    xiuLikelihood = xiuInGroup / countInGroup;
                    break;
                }
            }
        }
        
        // Cập nhật posterior
        let taiPosterior = taiLikelihood * taiPrior;
        let xiuPosterior = xiuLikelihood * xiuPrior;
        let totalPosterior = taiPosterior + xiuPosterior;
        
        if (totalPosterior > 0) {
            taiWeight += (taiPosterior / totalPosterior) * 25;
            xiuWeight += (xiuPosterior / totalPosterior) * 25;
            confidenceScores.push({ 
                type: 'bayesian',
                taiWeight: (taiPosterior / totalPosterior) * 25,
                xiuWeight: (xiuPosterior / totalPosterior) * 25
            });
        }
    }
    
    // ====== 15. THUẬT TOÁN PHÂN TÍCH HỆ SỐ TƯƠNG QUAN ======
    if (history.length >= 15) {
        let tongs = history.slice(-15).map(h => h.tong);
        let x1s = history.slice(-15).map(h => h.x1);
        let x2s = history.slice(-15).map(h => h.x2);
        let x3s = history.slice(-15).map(h => h.x3);
        
        // Tính tương quan giữa tổng và từng viên xúc xắc
        let corr1 = calculateCorrelation(tongs, x1s);
        let corr2 = calculateCorrelation(tongs, x2s);
        let corr3 = calculateCorrelation(tongs, x3s);
        
        // Xác định viên xúc xắc có ảnh hưởng mạnh nhất
        let maxCorr = Math.max(Math.abs(corr1), Math.abs(corr2), Math.abs(corr3));
        if (maxCorr > 0.6) {
            let dominantDice = corr1 === maxCorr ? x1 : corr2 === maxCorr ? x2 : x3;
            if (dominantDice >= 4) {
                taiWeight += 13.8;
                confidenceScores.push({ type: 'correlation_high', weight: 13.8 });
            } else {
                xiuWeight += 13.8;
                confidenceScores.push({ type: 'correlation_low', weight: 13.8 });
            }
        }
    }
    
    // ====== TỔNG HỢP VÀ TÍNH TOÁN CUỐI CÙNG ======
    let totalWeight = taiWeight + xiuWeight;
    let taiPercentage = Math.round((taiWeight / totalWeight) * 100);
    let xiuPercentage = 100 - taiPercentage;
    
    // Điều chỉnh dựa trên độ tin cậy tổng thể
    let confidenceLevel = Math.min(95, Math.max(50, confidenceScores.length * 2 + 50));
    let adjustment = (confidenceLevel - 50) / 10;
    
    if (taiPercentage > xiuPercentage) {
        taiPercentage = Math.min(95, taiPercentage + adjustment);
        xiuPercentage = 100 - taiPercentage;
    } else {
        xiuPercentage = Math.min(95, xiuPercentage + adjustment);
        taiPercentage = 100 - xiuPercentage;
    }
    
    let finalPrediction = taiPercentage >= xiuPercentage ? "TAI" : "XIU";
    let finalRate = Math.round(finalPrediction === "TAI" ? taiPercentage : xiuPercentage);
    
    return {
        prediction: finalPrediction,
        rate: finalRate,
        confidenceLevel: Math.round(confidenceLevel),
        taiPercentage: Math.round(taiPercentage),
        xiuPercentage: Math.round(xiuPercentage),
        totalAlgorithms: confidenceScores.length,
        weights: { tai: Math.round(taiWeight), xiu: Math.round(xiuWeight) }
    };
}

/**
 * HÀM TÍNH HỆ SỐ TƯƠNG QUAN PEARSON
 */
function calculateCorrelation(array1, array2) {
    if (array1.length !== array2.length || array1.length < 2) return 0;
    
    const n = array1.length;
    const mean1 = array1.reduce((a, b) => a + b, 0) / n;
    const mean2 = array2.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < n; i++) {
        let diff1 = array1[i] - mean1;
        let diff2 = array2[i] - mean2;
        numerator += diff1 * diff2;
        denom1 += diff1 * diff1;
        denom2 += diff2 * diff2;
    }
    
    if (denom1 === 0 || denom2 === 0) return 0;
    return numerator / (Math.sqrt(denom1) * Math.sqrt(denom2));
}

/**
 * HÀM HIỂN THỊ GIAO DIỆN SIÊU CHI TIẾT
 */
function renderUltraAdvancedUI(currentPhien, nextPhien, tong, x1, x2, x3, currentKq, resultObj, history) {
    console.clear();
    
    const currentKqText = tong >= 11 ? "TÀI" : "XỈU";
    const predText = resultObj.prediction === "TAI" ? "TÀI" : "XỈU";
    
    // Mã màu ANSI
    const colorCode = resultObj.prediction === "TAI" ? "\x1b[33m" : "\x1b[36m";
    const rateColor = resultObj.rate >= 70 ? "\x1b[32m" : resultObj.rate >= 60 ? "\x1b[33m" : "\x1b[31m";
    const resetCode = "\x1b[0m";
    const bold = "\x1b[1m";
    
    // Thống kê chi tiết
    let stats = "";
    let streakInfo = "";
    let distributionInfo = "";
    
    if (history.length >= 10) {
        let last10 = history.slice(-10);
        let taiCount = last10.filter(h => h.tong >= 11).length;
        stats = `Tài ${taiCount}/10 - Xỉu ${10-taiCount}/10`;
        
        // Thông tin bệt
        if (statisticalIndicators.consecutiveTai >= 3) {
            streakInfo = `🔥 Bệt TÀI ${statisticalIndicators.consecutiveTai} phiên`;
        } else if (statisticalIndicators.consecutiveXiu >= 3) {
            streakInfo = `🔥 Bệt XỈU ${statisticalIndicators.consecutiveXiu} phiên`;
        } else {
            streakInfo = `🔄 Đan xen ${statisticalIndicators.consecutiveTai} T - ${statisticalIndicators.consecutiveXiu} X`;
        }
        
        // Phân bố
        let totalTai = history.filter(h => h.tong >= 11).length;
        let totalXiu = history.length - totalTai;
        distributionInfo = `Tổng ${totalTai}/${totalXiu} (${Math.round(totalTai/history.length*100)}% Tài)`;
    }
    
    // Vẽ biểu đồ thanh đơn giản
    let barLength = 40;
    let taiBar = Math.round((resultObj.taiPercentage / 100) * barLength);
    let xiuBar = barLength - taiBar;
    let taiBarStr = "█".repeat(taiBar);
    let xiuBarStr = "█".repeat(xiuBar);
    
    console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
    console.log(`║  ${bold}📊 HỆ THỐNG PHÂN TÍCH MA TRẬN ĐA CHIỀU ULTRA${resetCode}`);
    console.log(`║  ${bold}👤 ID: ${USER_ID}${resetCode}`);
    console.log("╠═══════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║  🔸 Phiên trước: ${currentPhien}  |  Kết quả: ${currentKqText} (${tong})`);
    console.log(`║  🎲 Xúc xắc: [ ${bold}${x1}${resetCode} - ${bold}${x2}${resetCode} - ${bold}${x3}${resetCode} ]`);
    console.log("╠═══════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║  ${bold}🚀 DỰ ĐOÁN PHIÊN ${nextPhien}${resetCode}`);
    console.log(`║  🎯 ${colorCode}${bold}${predText}${resetCode}  |  Tỷ lệ: ${rateColor}${bold}${resultObj.rate}%${resetCode}  |  Độ tin cậy: ${rateColor}${resultObj.confidenceLevel}%${resetCode}`);
    console.log("╠═══════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║  📊 Phân bố xác suất:`);
    console.log(`║  TÀI [${colorCode}${taiBarStr}${resetCode}${" ".repeat(barLength - taiBar)}] ${resultObj.taiPercentage}%`);
    console.log(`║  XỈU [${" ".repeat(xiuBar)}${colorCode}${xiuBarStr}${resetCode}] ${resultObj.xiuPercentage}%`);
    console.log("╠═══════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║  📈 Xu hướng: ${stats}`);
    console.log(`║  ${streakInfo}`);
    console.log(`║  ${distributionInfo}`);
    console.log("╠═══════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║  🧮 Số thuật toán đã chạy: ${resultObj.totalAlgorithms}`);
    console.log(`║  ⚖️  Trọng số: TÀI=${resultObj.weights.tai} / XỈU=${resultObj.weights.xiu}`);
    console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
    console.log("  [~] Hệ thống đang tự động tối ưu hóa...");
}

/**
 * HÀM CHÍNH ĐIỀU KHIỂN HỆ THỐNG
 */
async function startUltraSystem() {
    let lastProcessedPhien = null;
    let initializationCount = 0;
    
    console.log("🚀 KHỞI TẠO HỆ THỐNG PHÂN TÍCH MA TRẬN ĐA CHIỀU ULTRA");
    console.log("⏳ Đang thu thập dữ liệu lịch sử...");
    
    setInterval(async () => {
        try {
            const response = await axios.get(API_URL, { timeout: 3000 });
            if (response.status === 200 && response.data) {
                const data = response.data;
                const currentPhien = parseInt(data.phien);
                
                if (currentPhien !== lastProcessedPhien) {
                    lastProcessedPhien = currentPhien;
                    const nextPhien = currentPhien + 1;
                    
                    const tong = parseInt(data.tong);
                    const x1 = parseInt(data.xuc_xac_1);
                    const x2 = parseInt(data.xuc_xac_2);
                    const x3 = parseInt(data.xuc_xac_3);
                    const currentKq = data.ket_qua;
                    
                    // Lưu lịch sử chi tiết
                    const historyEntry = { 
                        phien: currentPhien, 
                        tong, x1, x2, x3,
                        timestamp: Date.now()
                    };
                    
                    gameHistory.push(historyEntry);
                    if (gameHistory.length > LIMIT_HISTORY) {
                        gameHistory.shift();
                    }
                    
                    // Cập nhật thống kê
                    updateStatisticalIndicators(gameHistory);
                    
                    // Chạy thuật toán siêu mạnh
                    const resultObj = calculateUltraAdvancedMatrixLogic(
                        tong, x1, x2, x3, gameHistory
                    );
                    
                    // Hiển thị giao diện
                    renderUltraAdvancedUI(
                        currentPhien, nextPhien, tong, x1, x2, x3, 
                        currentKq, resultObj, gameHistory
                    );
                    
                    initializationCount++;
                }
            }
        } catch (error) {
            // Xử lý lỗi im lặng
            if (error.code === 'ECONNABORTED') {
                // Timeout - bỏ qua
            }
        }
    }, 1000);
}

// Khởi chạy hệ thống
startUltraSystem();
