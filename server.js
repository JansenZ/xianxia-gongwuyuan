#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

function markdownToHtml(md) {
    return md.split('\n').filter(line => line.trim()).map(p => `<p>${p}</p>`).join('\n');
}

function getChapterList() {
    const volumeDir = path.join(BASE_DIR, '第一卷');
    if (!fs.existsSync(volumeDir)) return [];
    
    const files = fs.readdirSync(volumeDir)
        .filter(f => f.endsWith('.md') && /^\d+-/.test(f))
        .sort((a, b) => parseInt(a) - parseInt(b));
    
    return files.map((file, index) => {
        const num = index + 1;
        const titleMatch = file.match(/^\d+-(.+)\.md$/);
        const title = titleMatch ? titleMatch[1] : `第${num}章`;
        const content = fs.readFileSync(path.join(volumeDir, file), 'utf-8');
        const preview = content.substring(0, 100).replace(/\n/g, '') + '...';
        return { num, title: `第${num}章 ${title}`, file, preview };
    });
}

function getChapterContent(filename) {
    const filePath = path.join(BASE_DIR, '第一卷', filename);
    if (!fs.existsSync(filePath)) return null;
    return markdownToHtml(fs.readFileSync(filePath, 'utf-8'));
}

http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = url.pathname;
    
    if (pathname === '/api/chapters') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(getChapterList()));
        return;
    }
    
    if (pathname.startsWith('/api/chapter/')) {
        const filename = decodeURIComponent(pathname.replace('/api/chapter/', ''));
        const content = getChapterContent(filename);
        if (content) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ content }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '章节不存在' }));
        }
        return;
    }
    
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.join(BASE_DIR, pathname);
    const ext = path.extname(filePath).toLowerCase();
    
    if (!filePath.startsWith(BASE_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
    
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log(`\n⚡ 修仙小说网站已启动\n📖 http://localhost:${PORT}\n`);
});
