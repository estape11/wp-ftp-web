const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const portfinder = require('portfinder');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Multer setup for file uploads - now destination is dynamic
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const currentPath = req.body.path || '';
        const dest = path.join(UPLOADS_DIR, currentPath);
        fs.mkdir(dest, { recursive: true }, (err) => cb(err, dest));
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
    const { currentPath = '', search = '', page = 1, pageSize = 10, sortBy = 'name_asc' } = req.query;
    const targetPath = path.join(UPLOADS_DIR, currentPath);

    // Security check to prevent directory traversal
    if (!targetPath.startsWith(UPLOADS_DIR)) {
        return res.status(400).send('Invalid path');
    }

    fs.readdir(targetPath, { withFileTypes: true }, (err, items) => {
        if (err) {
            return res.status(500).send('Unable to scan directory');
        }

        const fileDetailsPromises = items.map(item => {
            return new Promise((resolve, reject) => {
                fs.stat(path.join(targetPath, item.name), (err, stats) => {
                    if (err) return reject(err);
                    
                    resolve({
                        name: item.name,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        isDirectory: item.isDirectory(),
                        type: item.isDirectory() ? 'folder' : path.extname(item.name).toLowerCase()
                    });
                });
            });
        });

        Promise.all(fileDetailsPromises).then(fileDetails => {
            // Filter by search term
            const filteredFiles = fileDetails.filter(file => 
                file.name.toLowerCase().includes(search.toLowerCase())
            );

            // Sort files (folders first, then by selected criteria)
            filteredFiles.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;

                const [sortField, sortOrder] = sortBy.split('_');
                let aValue = a[sortField];
                let bValue = b[sortField];

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
    res.status(200).send('Files uploaded successfully');
});

// API to create a new folder
app.post('/api/folders', (req, res) => {
    const { currentPath, folderName } = req.body;
    const newFolderPath = path.join(UPLOADS_DIR, currentPath, folderName);

    if (!newFolderPath.startsWith(UPLOADS_DIR)) {
        return res.status(400).send('Invalid path');
    }

    fs.mkdir(newFolderPath, { recursive: true }, (err) => {
        if (err) {
            return res.status(500).send('Error creating folder');
        }
        res.status(201).send('Folder created');
    });
});

// API to download a file
app.get('/download', (req, res) => {
    const { p } = req.query; // file path
    const filepath = path.join(UPLOADS_DIR, p);

    if (!filepath.startsWith(UPLOADS_DIR)) {
        return res.status(400).send('Invalid path');
    }
    res.download(filepath);
});

// API to delete a file or folder
app.delete('/api/delete', (req, res) => {
    const { p } = req.body; // file path
    const itemPath = path.join(UPLOADS_DIR, p);

    if (!itemPath.startsWith(UPLOADS_DIR)) {
        return res.status(400).send('Invalid path');
    }

    fs.stat(itemPath, (err, stats) => {
        if (err) return res.status(404).send('Item not found');

        const callback = (err) => {
            if (err) return res.status(500).send('Error deleting item');
            res.status(200).send('Item deleted');
        };

        if (stats.isDirectory()) {
            fs.rm(itemPath, { recursive: true, force: true }, callback);
        } else {
            fs.unlink(itemPath, callback);
        }
    });
});

portfinder.basePort = 8080;
portfinder.getPortPromise()
    .then((port) => {
        app.listen(port, () => {
            console.log(`Server listening at http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.error("Could not find an open port.", err);
        process.exit(1);
    });
