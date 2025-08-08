const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8080;

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Serve static files from the "public" directory
app.use(express.static('public'));

// API to get the list of files with metadata, search, and pagination
app.get('/api/files', (req, res) => {
    const { search = '', page = 1, pageSize = 10, sortBy = 'name_asc' } = req.query;

    fs.readdir(UPLOADS_DIR, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan files');
        }

        // Get file stats
        const fileDetailsPromises = files.map(file => {
            return new Promise((resolve, reject) => {
                fs.stat(path.join(UPLOADS_DIR, file), (err, stats) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve({
                        name: file,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        type: path.extname(file).toLowerCase()
                    });
                });
            });
        });

        Promise.all(fileDetailsPromises).then(fileDetails => {
            // Filter by search term
            const filteredFiles = fileDetails.filter(file => 
                file.name.toLowerCase().includes(search.toLowerCase())
            );

            // Sort files
            const [sortField, sortOrder] = sortBy.split('_');
            filteredFiles.sort((a, b) => {
                let aValue = a[sortField];
                let bValue = b[sortField];

                // Special case for name and type for case-insensitive sorting
                if (sortField === 'name' || sortField === 'type') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }
                
                if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            // Paginate
            const startIndex = (page - 1) * pageSize;
            const endIndex = page * pageSize;
            const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

            res.json({
                files: paginatedFiles,
                totalFiles: filteredFiles.length,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            });
        }).catch(err => {
            res.status(500).send('Error getting file details');
        });
    });
});

// API to handle file uploads
app.post('/api/upload', upload.array('files'), (req, res) => {
    res.redirect('/');
});

// API to download a file
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(UPLOADS_DIR, filename);
    res.download(filepath);
});

// API to delete a file
app.delete('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.unlink(filepath, (err) => {
        if (err) {
            res.status(500).send('Error deleting file');
        } else {
            res.status(200).send('File deleted');
        }
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
