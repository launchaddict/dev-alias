const http = require('http');

const port = Number(process.env.PORT) || 4155;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(
    `<html><body style="font-family: sans-serif;">` +
      `<h1>dev-alias demo</h1>` +
      `<p>Host: ${req.headers.host}</p>` +
      `<p>Served from http://localhost:${port}</p>` +
      `</body></html>`
  );
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Demo server ready at http://localhost:${port}`);
});
