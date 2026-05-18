// index.js
import 'dotenv/config'; // Loads variables into memory immediately
import http from 'http';
import querystring from 'querystring';

const PORT = process.env.PORT || 3031;

const server = http.createServer((req, res) => {
    const expectedSecretToken = process.env.API_SECRET_TOKEN || '';
    const incomingAuthToken = req.headers['x-api-token'] || req.headers['authorization'] || '';

    if (!expectedSecretToken){
        console.error('⚠️ API_SECRET_TOKEN is not set in environment variables.');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end('Server configuration error: API_SECRET_TOKEN is not set');
        return;
    }
    if (incomingAuthToken !== expectedSecretToken) {
        console.warn('🚫 Unauthorized access attempt detected.');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Invalid API secret token' }));
        return;
    }
    
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            let targetLink = null;
            const contentType = req.headers['content-type'] || '';

            try {
                if (contentType.includes('application/json')) {
                    targetLink = JSON.parse(body).link;
                } else {
                    targetLink = querystring.parse(body).link;
                }

                if (targetLink) {
                    console.log(`📥 Link received from n8n. Processing...`);
                    
                    // 🔥 FIX: Dynamically import the browser action script AFTER env vars are active
                    const { openLinkInPuppeteer } = await import('./browserAction.js');
                    const scrapeResult = await openLinkInPuppeteer(targetLink);

                    if (scrapeResult && scrapeResult.success) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success', data: scrapeResult.data }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'error', message: scrapeResult?.error || 'Scraping failed' }));
                    }
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Payload parsed but "link" property was empty' }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Failed to parse body structure');
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Use POST requests to submit links');
    }
});

server.listen(PORT, () => {
    console.log(`🤖 Synchronous Data-Return Bridge listening at http://localhost:${PORT}`);
    console.log("--- INITIAL BOOTUP CHECK ---");
    console.log("----------------------------");
});
