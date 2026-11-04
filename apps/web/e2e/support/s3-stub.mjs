#!/usr/bin/env node
/**
 * Minimal S3-compatible object store for the browser smoke (A09), in memory.
 *
 * The API talks to object storage only through PutObject, HeadObject,
 * GetObject, DeleteObject and ListObjectsV2 (apps/api/src/modules/storage).
 * This server answers exactly those, path-style (/bucket/key), ignores request
 * signatures and keeps everything in memory. It is test tooling for an isolated
 * run and nothing else: no persistence, no auth, no TLS.
 *
 *   node e2e/support/s3-stub.mjs [port]      default 9100
 */
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? process.env.S3_STUB_PORT ?? 9100);
const objects = new Map(); // "bucket/key" -> { body: Buffer, type: string, etag: string }

const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

/** Undo aws-chunked transfer encoding (used by the SDK for streamed uploads with a trailing checksum). */
function decodeAwsChunked(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    const lineEnd = buf.indexOf('\r\n', pos);
    if (lineEnd < 0) break;
    const header = buf.subarray(pos, lineEnd).toString('latin1');
    const size = parseInt(header.split(';')[0], 16);
    if (!Number.isFinite(size)) break;
    if (size === 0) break; // trailer follows; nothing more to store
    out.push(buf.subarray(lineEnd + 2, lineEnd + 2 + size));
    pos = lineEnd + 2 + size + 2;
  }
  return Buffer.concat(out);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const [, bucket, ...rest] = url.pathname.split('/');
  const key = decodeURIComponent(rest.join('/'));
  const id = `${bucket}/${key}`;

  // ListObjectsV2: GET /bucket?list-type=2&prefix=...
  if (req.method === 'GET' && bucket && !key && url.searchParams.get('list-type') === '2') {
    const prefix = url.searchParams.get('prefix') ?? '';
    const items = [...objects.entries()].filter(([k]) => k.startsWith(`${bucket}/${prefix}`));
    const xml = `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${escapeXml(bucket)}</Name><Prefix>${escapeXml(prefix)}</Prefix><KeyCount>${items.length}</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated>${items
      .map(([k, v]) => `<Contents><Key>${escapeXml(k.slice(bucket.length + 1))}</Key><Size>${v.body.length}</Size><ETag>"${v.etag}"</ETag><LastModified>2026-01-01T00:00:00.000Z</LastModified><StorageClass>STANDARD</StorageClass></Contents>`)
      .join('')}</ListBucketResult>`;
    res.writeHead(200, { 'content-type': 'application/xml' });
    return res.end(xml);
  }

  if (!bucket || !key) {
    res.writeHead(400, { 'content-type': 'application/xml' });
    return res.end('<Error><Code>InvalidRequest</Code></Error>');
  }

  if (req.method === 'PUT') {
    let body = await readBody(req);
    if ((req.headers['content-encoding'] ?? '').includes('aws-chunked')) body = decodeAwsChunked(body);
    const etag = Buffer.from(String(body.length)).toString('hex');
    objects.set(id, { body, type: req.headers['content-type'] ?? 'application/octet-stream', etag });
    res.writeHead(200, { etag: `"${etag}"` });
    return res.end();
  }

  const obj = objects.get(id);
  if (req.method === 'HEAD' || req.method === 'GET') {
    if (!obj) {
      res.writeHead(404, { 'content-type': 'application/xml' });
      return res.end(req.method === 'GET' ? '<Error><Code>NoSuchKey</Code></Error>' : undefined);
    }
    const headers = { 'content-type': obj.type, 'content-length': String(obj.body.length), etag: `"${obj.etag}"`, 'last-modified': 'Thu, 01 Jan 2026 00:00:00 GMT', 'accept-ranges': 'bytes' };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (req.method === 'GET' && range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), obj.body.length - 1) : obj.body.length - 1;
      const slice = obj.body.subarray(start, end + 1);
      res.writeHead(206, { ...headers, 'content-length': String(slice.length), 'content-range': `bytes ${start}-${end}/${obj.body.length}` });
      return res.end(slice);
    }
    res.writeHead(200, headers);
    return res.end(req.method === 'GET' ? obj.body : undefined);
  }

  if (req.method === 'DELETE') {
    objects.delete(id);
    res.writeHead(204);
    return res.end();
  }

  res.writeHead(405);
  res.end();
});

server.listen(port, '127.0.0.1', () => {
  console.log(`s3-stub listening on http://127.0.0.1:${port} (in-memory, test only)`);
});
