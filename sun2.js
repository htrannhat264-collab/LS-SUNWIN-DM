const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

// ------------------ CẤU HÌNH ------------------
const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhbW91bnQiOjAsInVzZXJuYW1lIjoiU0NfYXBpc3Vud2luMTIzIn0.hgrRbSV6vnBwJMg9ZFtbx3rRu9mX_hZMZ_m5gMNhkw0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 15000;

// ------------------ STATE ------------------
let lastResult = null;
let resultHistory = [];
let currentSessionId = null;
let lastSessionId = null; // Lưu phiên trước đó
let isWaitingForResult = false;
let isConnected = false;
let sessionQueue = []; // Queue lưu các phiên

// ------------------ INIT MESSAGES ------------------
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

// ------------------ WEBSOCKET ------------------
let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

function connectWebSocket() {
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }

    console.log('[🔄] Connecting to WebSocket...');
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected.');
        isConnected = true;
        
        // Gửi tin nhắn khởi tạo
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(msg));
                    console.log(`[📤] Sent init message ${i+1}`);
                }
            }, i * 800);
        });

        // Ping giữ kết nối
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.ping();
                // console.log('[📶] Ping sent');
            }
        }, PING_INTERVAL);
    });

    ws.on('pong', () => {
        // console.log('[📶] Pong received');
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (!Array.isArray(data) || data.length < 2) {
                return;
            }
            
            const msgData = data[1];
            if (typeof msgData !== 'object') {
                return;
            }

            const { cmd, sid, d1, d2, d3, gBB, sessionId } = msgData;

            // Log đầy đủ để debug
            console.log(`[📨] CMD=${cmd}, SID=${sid || sessionId}, d1=${d1}, d2=${d2}, d3=${d3}, gBB=${gBB}`);

            // XỬ LÝ SESSION MỚI (CMD 1008)
            if (cmd === 1008) {
                // Lấy session ID từ nhiều nguồn
                const newSessionId = sid || sessionId || msgData.id;
                
                if (newSessionId) {
                    // Lưu phiên cũ vào queue nếu có
                    if (currentSessionId && currentSessionId !== newSessionId) {
                        sessionQueue.push(currentSessionId);
                        if (sessionQueue.length > 10) {
                            sessionQueue.shift();
                        }
                        lastSessionId = currentSessionId;
                    }
                    
                    currentSessionId = newSessionId;
                    isWaitingForResult = true;
                    console.log(`[🆕] New session: ${newSessionId} (previous: ${lastSessionId || 'none'})`);
                }
                return;
            }

            // XỬ LÝ KẾT QUẢ (CMD 1003)
            if (cmd === 1003 && d1 !== undefined && d2 !== undefined && d3 !== undefined) {
                // Lấy session ID từ message
                const resultSessionId = sid || sessionId || msgData.id;
                
                // Nếu có gBB thì là kết quả chính thức
                if (gBB) {
                    const total = d1 + d2 + d3;
                    const result = total > 10 ? "Tài" : "Xỉu";

                    // QUAN TRỌNG: Lấy đúng phiên
                    // Ưu tiên: session trong message > currentSessionId > session trong queue
                    let finalSessionId = resultSessionId;
                    
                    // Nếu không có session trong message, lấy từ current
                    if (!finalSessionId) {
                        finalSessionId = currentSessionId;
                    }
                    
                    // Nếu vẫn ko có, lấy từ queue (phiên gần nhất)
                    if (!finalSessionId && sessionQueue.length > 0) {
                        finalSessionId = sessionQueue[sessionQueue.length - 1];
                    }

                    // Tạo kết quả
                    const resultData = {
                        "Phien": finalSessionId || Date.now(),
                        "Xuc_xac_1": d1,
                        "Xuc_xac_2": d2,
                        "Xuc_xac_3": d3,
                        "Tong": total,
                        "Ket_qua": result,
                        "id": "@tranhoang2286",
                        "timestamp": new Date().toISOString()
                    };

                    // Lưu vào history
                    resultHistory.push(resultData);
                    if (resultHistory.length > 30) {
                        resultHistory.shift();
                    }

                    // Cập nhật kết quả mới nhất
                    lastResult = resultData;

                    console.log(`[🎯] ✅ RESULT: ${resultData.Phien} - ${d1} ${d2} ${d3} = ${total} (${result})`);
                    console.log(`[📊] Session map: Current=${currentSessionId}, Last=${lastSessionId}, Queue=${sessionQueue.slice(-3)}`);

                    // Reset state
                    isWaitingForResult = false;
                    // KHÔNG reset currentSessionId ngay để đảm bảo đồng bộ
                } else {
                    console.log(`[📊] Temp data: ${d1} ${d2} ${d3} (no gBB, session=${resultSessionId})`);
                }
            }

            // Xử lý các cmd khác
            if (cmd === 1006) {
                console.log(`[💰] Balance update`);
            }

        } catch (e) {
            console.error('[❌] Parse error:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] Connection closed. Code: ${code}`);
        isConnected = false;
        clearInterval(pingInterval);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] WebSocket error:', err.message);
        if (ws) {
            ws.close();
        }
    });
}

// ------------------ API ROUTES ------------------

// API chính - lấy kết quả mới nhất
app.get('/api/ditmemaysun', (req, res) => {
    if (lastResult) {
        console.log(`[📤] API trả về phiên: ${lastResult.Phien}`);
        res.json(lastResult);
    } else {
        res.json({
            "Phien": null,
            "Xuc_xac_1": null,
            "Xuc_xac_2": null,
            "Xuc_xac_3": null,
            "Tong": null,
            "Ket_qua": "",
            "id": "@tranhoang2286",
            "status": "waiting"
        });
    }
});

// Lấy lịch sử
app.get('/api/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    res.json({
        count: resultHistory.length,
        history: resultHistory.slice(-limit)
    });
});

// Trạng thái hệ thống - chi tiết
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        wsState: ws ? ws.readyState : -1,
        currentSession: currentSessionId,
        lastSession: lastSessionId,
        sessionQueue: sessionQueue.slice(-5),
        isWaiting: isWaitingForResult,
        hasResult: !!lastResult,
        lastResultSession: lastResult ? lastResult.Phien : null,
        historyCount: resultHistory.length,
        lastUpdate: lastResult ? lastResult.timestamp : null
    });
});

// Lấy thông tin phiên hiện tại
app.get('/api/session', (req, res) => {
    res.json({
        currentSessionId: currentSessionId,
        lastSessionId: lastSessionId,
        sessionQueue: sessionQueue,
        isWaitingForResult: isWaitingForResult,
        lastResult: lastResult
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        name: "Tài Xỉu API",
        version: "1.1.0",
        status: isConnected ? "connected" : "disconnected",
        endpoints: {
            result: "/api/ditmemaysun",
            history: "/api/history",
            status: "/api/status",
            session: "/api/session"
        },
        currentSession: currentSessionId,
        lastResult: lastResult,
        historyCount: resultHistory.length
    });
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`[🌐] Server running at http://localhost:${PORT}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`\n📡 API Endpoints:`);
    console.log(`  GET /api/ditmemaysun  - Kết quả Tài Xỉu mới nhất`);
    console.log(`  GET /api/history      - Lịch sử kết quả (?limit=10)`);
    console.log(`  GET /api/status       - Trạng thái hệ thống chi tiết`);
    console.log(`  GET /api/session      - Thông tin phiên hiện tại`);
    console.log(`  GET /                 - Thông tin tổng quan`);
    console.log(`\n${'='.repeat(50)}`);
    console.log(`[🔄] Connecting to WebSocket...\n`);
    
    connectWebSocket();
});

// Xử lý khi tắt server
process.on('SIGINT', () => {
    console.log('\n[🛑] Shutting down...');
    if (ws) {
        ws.close();
    }
    clearInterval(pingInterval);
    clearTimeout(reconnectTimeout);
    process.exit(0);
});
