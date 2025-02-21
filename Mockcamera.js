const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

// Configuration
const PORT = 80;
const MEDIA_DIR = path.join(__dirname, 'media');
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const RESPONSES_DIR = path.join(__dirname, 'responses');

// Helper function to get MIME type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.xml': 'application/xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Serve directory contents with thumbnails and upload form
function serveDirectory(dirPath, res, urlPath) {
  const templatePath = path.join(TEMPLATE_DIR, 'folder_template.html');

  fs.readFile(templatePath, 'utf8', (err, template) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading folder template');
      return;
    }

    fs.readdir(dirPath, (err, files) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Directory not found');
        return;
      }

      let fileRows = '';
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          const fileSize = (stats.size / 1024).toFixed(2) + ' KB';
          const fileTime = stats.mtime.toISOString().replace('T', ' ').split('.')[0];
          const fileUrl = `${urlPath}/${file}`;
          const ext = path.extname(file).toLowerCase();

          let preview = '';

          // Image previews
          if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            preview = `<img src="${fileUrl}" alt="${file}" style="width:100px;height:auto;">`;
          }
          // Video previews
          else if (['.mp4', '.mov', '.webm', '.avi', '.mkv'].includes(ext)) {
            preview = `
              <video width="160" height="90" controls muted>
                <source src="${fileUrl}" type="${getMimeType(filePath)}">
                Your browser does not support the video tag.
              </video>`;
          } else {
            preview = `<i>No Preview</i>`;
          }

          fileRows += `
            <tr>
              <td>${preview}</td>
              <td><a href="${fileUrl}">${file}</a></td>
              <td align="right">${fileSize}</td>
              <td align="right">${fileTime}</td>
              <td align="right"><a href="${fileUrl}?del=1">Remove</a></td>
            </tr>
          `;
        }
      });

      const finalHtml = template.replace('{{FILES}}', fileRows);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(finalHtml);
    });
  });
}

// Handle file uploads
function handleFileUpload(req, res, uploadDir, redirectPath) {
  const form = new formidable.IncomingForm();
  form.uploadDir = uploadDir;
  form.keepExtensions = true;
  form.multiples = false;

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error uploading file');
      return;
    }

    const uploadedFiles = Array.isArray(files.fileupload1) ? files.fileupload1 : [files.fileupload1];

    if (!uploadedFiles.length || !uploadedFiles[0]) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('No file uploaded');
      return;
    }

    uploadedFiles.forEach(uploadedFile => {
      if (!uploadedFile.originalFilename) return;

      const oldPath = uploadedFile.filepath;
      const newPath = path.join(uploadDir, uploadedFile.originalFilename);

      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          console.error('File rename error:', err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error saving file');
          return;
        }

        res.writeHead(302, { 'Location': redirectPath });
        res.end();
      });
    });
  });
}

// Serve media files with proper headers and range support for videos
function serveMedia(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = getMimeType(filePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const range = req.headers.range;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');

    if (!range) {
      res.writeHead(200, { 'Content-Length': stats.size });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const positions = range.replace(/bytes=/, "").split("-");
      const start = parseInt(positions[0], 10);
      const end = positions[1] ? parseInt(positions[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    }
  });
}

// Delete file if ?del=1 is present
function handleFileDeletion(filePath, res, redirectPath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error deleting file');
    } else {
      console.log(`Deleted file: ${filePath}`);
      res.writeHead(302, { 'Location': redirectPath });
      res.end();
    }
  });
}

// Handle command requests like ?cmd=3005
function handleCommandRequest(cmd, res) {
  const responseFile = path.join(RESPONSES_DIR, `${cmd}.txt`);

  fs.readFile(responseFile, 'utf8', (err, data) => {
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    if (err) {
      res.end(`<error>Response file not found for cmd=${cmd}</error>`);
    } else {
      res.end(data);
    }
  });
}

// Main HTTP Server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`Incoming request: ${req.method} ${pathname}`);

  // Handle command requests like /?custom=1&cmd=3005
  if (query.cmd) {
    handleCommandRequest(query.cmd, res);
    return;
  }

  // Serve DCIM folders and files
  if (pathname.startsWith('/DCIM/')) {
    const mediaPath = path.join(MEDIA_DIR, pathname);

    // Handle File Uploads
    if (req.method === 'POST') {
      handleFileUpload(req, res, mediaPath, pathname);
      return;
    }

    // Handle File Deletion
    if (query.del === '1') {
      handleFileDeletion(mediaPath, res, path.dirname(pathname));
      return;
    }

    // Serve Files and Directories
    fs.stat(mediaPath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else if (stats.isDirectory()) {
        serveDirectory(mediaPath, res, pathname);
      } else if (stats.isFile()) {
        serveMedia(req, res, mediaPath);
      }
    });

    return;
  }

  // Fallback for unknown routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Start the server
server.listen(PORT, () => {
  console.log(`Camera simulator running at http://localhost:${PORT}`);
});
