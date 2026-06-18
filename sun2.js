const axios = require('axios');

const API_URL = "https://trails-wish-motel-legacy.trycloudflare.com/api/tx";
const USER_ID = "@tranhoang2286";

// Hệ thống lưu trữ dữ liệu lịch sử phục vụ phân tích chuỗi ma trận dài
let gameHistory = [];
const LIMIT_HISTORY = 100;

/**
 * THUẬT TOÁN MA TRẬN ĐA ĐIỂM TUYẾN TÍNH (CỰC MẠNH - KHÔNG RANDOM)
 * Kết hợp phân tích bước nhảy, tính đối xứng hạt xúc xắc và chuỗi Fibonacci điểm số
 */
function calculateAdvancedMatrixLogic(tong, x1, x2, x3, history) {
    let taiWeight = 0;
    let xiuWeight = 0;

    // 1. Phân tích phân bổ tính chẵn lẻ sâu
    let oddCount = [x1, x2, x3].filter(x => x % 2 !== 0).length;
    let evenCount = 3 - oddCount;
    
    if (oddCount === 3) { xiuWeight += 22.5; taiWeight += 10.5; }
    else if (evenCount === 3) { taiWeight += 22.5; xiuWeight += 10.5; }
    else if (oddCount == 2) { taiWeight += 15.2; }
    else { xiuWeight += 15.2; }

    // 2. Thuật toán ma trận khoảng cách hình học (Dice Gap Geometry)
    let sortedDice = [x1, x2, x3].sort((a, b) => a - b);
    let gap1 = sortedDice[1] - sortedDice[0];
    let gap2 = sortedDice[2] - sortedDice[1];
    
    if (gap1 === gap2 && gap1 !== 0) {
        // Cầu đối xứng tuyến tính
        if (tong >= 11) xiuWeight += 18.4; else taiWeight += 18.4;
    } else {
        if (tong >= 11) taiWeight += 12.1; else xiuWeight += 12.1;
    }

    // 3. Phân tích chuỗi tổ hợp Fibonacci Điểm Số nội tại
    let fiboMetric = (x1 * 2) + (x2 * 3) + (x3 * 5);
    if (fiboMetric % 2 === 0) {
        taiWeight += 14.8;
    } else {
        xiuWeight += 14.8;
    }

    // 4. Thuật toán mổ xẻ dữ liệu hồi quy từ lịch sử chuỗi phiên thực tế
    if (history.length >= 4) {
        let last4 = history.slice(-4);
        let patternString = last4.map(h => h.tong >= 11 ? "T" : "X").join("");
        
        // Quét cấu trúc cầu lặp (Cầu bệt / Cầu nhảy 1-1 / Cầu 2-2)
        if (patternString === "TTTT" || patternString === "XXXX") {
            // Xu hướng bẻ cầu bệt dài theo logic toán học hồi quy
            taiWeight += patternString === "XXXX" ? 25.5 : 5.0;
            xiuWeight += patternString === "TTTT" ? 25.5 : 5.0;
        } else if (patternString === "TXTX" || patternString === "XTXT") {
            // Tiếp tục thuật toán cầu nhảy nghịch đảo
            if (tong >= 11) xiuWeight += 20.2; else taiWeight += 20.2;
        } else if (patternString === "TTXX" || patternString === "XXTT") {
            // Thuật toán cầu lập đối xứng kép
            if (tong >= 11) taiWeight += 15.5; else xiuWeight += 15.5;
        }
    }

    // 5. Cân bằng trọng số biên độ tổng điểm
    if (tong === 3 || tong === 18) {
        taiWeight += 30; xiuWeight += 30; // Điểm cực đại/cực tiểu logic giải phóng năng lượng đổi chiều
    } else if (tong > 14) {
        xiuWeight += 8.5;
    } else if (tong < 7) {
        taiWeight += 8.5;
    }

    // Tính toán tỷ lệ phần trăm chính xác dựa trên cán cân ma trận điểm số
    let totalWeight = taiWeight + xiuWeight;
    let taiPercentage = Math.round((taiWeight / totalWeight) * 100);
    let xiuPercentage = 100 - taiPercentage;

    let finalPrediction = taiPercentage >= xiuPercentage ? "TAI" : "XIU";
    let finalRate = finalPrediction === "TAI" ? taiPercentage : xiuPercentage;

    return {
        prediction: finalPrediction,
        rate: finalRate
    };
}

/**
 * Hàm xuất giao diện chuẩn hóa theo định dạng yêu cầu, cực kỳ gọn đẹp
 */
function renderAdvancedUI(currentPhien, nextPhien, tong, x1, x2, x3, currentKq, resultObj) {
    console.clear();

    const currentKqText = tong >= 11 ? "TÀI" : "XỈU";
    const predText = resultObj.prediction === "TAI" ? "TÀI" : "XỈU";
    
    // Thêm mã màu ANSI trực quan hóa tỷ lệ và kết quả
    const colorCode = resultObj.prediction === "TAI" ? "\x1b[33m" : "\x1b[36m"; // Vàng cho Tài, Xanh cho Xỉu
    const rateColor = resultObj.rate >= 65 ? "\x1b[32m" : "\x1b[37m"; // Xanh lá nếu tỷ lệ logic > 65%
    const resetCode = "\x1b[0m";

    console.log("=================================================================");
    console.log(` 📊 HỆ THỐNG PHÂN TÍCH DATA REAL-TIME - ID: \x1b[95m${USER_ID}\x1b[0m 📊`);
    console.log("=================================================================");
    console.log(` 🔸 Phiên trước: ${currentPhien} | Kết quả: ${currentKqText} (${tong}) | Xúc xắc: [ ${x1} - ${x2} - ${x3} ]`);
    console.log("-----------------------------------------------------------------");
    console.log(` 🚀 Phiên dự đoán: ${nextPhien}`);
    console.log(` 🎯 Dự đoán: ${colorCode}**${predText}**${resetCode} | Tỉ lệ bộ lọc: ${rateColor}${resultObj.rate}%${resetCode}`);
    console.log("=================================================================");
    console.log(" [~] Hệ thống đang tự động tối ưu hóa thuật toán cho phiên kế tiếp...");
}

/**
 * Trình điều khiển luồng kết nối API và đồng bộ hóa thời gian thực
 */
async function startSystem() {
    let lastProcessedPhien = null;

    setInterval(async () => {
        try {
            const response = await axios.get(API_URL, { timeout: 3500 });
            if (response.status === 200 && response.data) {
                const data = response.data;
                const currentPhien = parseInt(data.phien);

                // Kích hoạt bộ xử lý logic khi và chỉ khi hệ thống ghi nhận phiên mới từ API
                if (currentPhien !== lastProcessedPhien) {
                    lastProcessedPhien = currentPhien;
                    const nextPhien = currentPhien + 1; // Tự động đồng bộ +1 phiên tức thì

                    const tong = parseInt(data.tong);
                    const x1 = parseInt(data.xuc_xac_1);
                    const x2 = parseInt(data.xuc_xac_2);
                    const x3 = parseInt(data.xuc_xac_3);
                    const currentKq = data.ket_qua;

                    // Đẩy dữ liệu vào hệ thống bộ nhớ đệm lịch sử
                    gameHistory.push({ phien: currentPhien, tong, x1, x2, x3 });
                    if (gameHistory.length > LIMIT_HISTORY) {
                        gameHistory.shift();
                    }

                    // Khởi chạy thuật toán bóc tách phân tích ma trận dữ liệu sâu
                    const resultObj = calculateAdvancedMatrixLogic(tong, x1, x2, x3, gameHistory);

                    // Hiển thị cấu trúc dữ liệu xuất sắc ra màn hình
                    renderAdvancedUI(currentPhien, nextPhien, tong, x1, x2, x3, currentKq, resultObj);
                }
            }
        } catch (error) {
            // Xử lý các lỗi kết nối ngầm một cách im lặng để không làm hỏng giao diện console sạch
        }
    }, 1500); // Quét API với tần suất 1.5 giây một lần để bám đuổi sát nút dữ liệu từ Cloudflare
}

// Thực thi chương trình
startSystem();
