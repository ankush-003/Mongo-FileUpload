const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');

// mongoURI
const mongoURI = 'mongodb+srv://Ankush:<password>@learning.id5ibpg.mongodb.net/Files?retryWrites=true&w=majority'
// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs, gridfsBucket;
// on once event
conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
    gfs.collection('uploads');
});

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
// logger
app.use((req, res, next) => {
    console.log(`request: ${req.protocol}://${req.get('host')}${req.originalUrl}, method: ${req.method}`);
    next();
});

app.set('view engine', 'ejs');

// Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            // crypto is used to generate random name
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
// upload can bes used as middleware to upload files
const upload = multer({ storage });

// @route GET /
// @desc Loads form
app.get('/',(req,res)=> {
    // res.render('index');
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            res.render('index', { files: false });
            } else {
                files.map(file => {
                    if(file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'application/json' || file.contentType === 'text/plain') {
                        file.isSupported = true;
                    } else {
                        file.isSupported = false;
                    }
                } );
                res.render('index', { files: files });
        }

    });
})

// @route POST /upload
// @desc  Uploads file to DB
// file is name of input field
app.post('/upload', upload.single('file'), (req, res) => {
    // res.json({ file: req.file });
    console.table(req.file);
    res.redirect('/');
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }

        // Files exist
        return res.json(files);
    });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }
        // File exists
        return res.json(file);
    });
});

// @route GET /file/:filename
// @desc Display the file
app.get('/file/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'file does not exists'
            });
        }

        //check if text or application
        if (file.contentType === 'text/plain' || file.contentType === 'application/json') {
            // Read output to browser
            const readstream = gridfsBucket.openDownloadStreamByName(req.params.filename);
            readstream.pipe(res);
        } else if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            // Render image to browser
            const readstream = gridfsBucket.openDownloadStreamByName(req.params.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not a supported file type'
            });
        }
    });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
    console.log(req.params.id);
    gfs.remove({ _id: req.params.id},
        (err, gridStore) => {
            if (err) {
                return res.status(404).json({ err: err });
                // res.redirect('/');
    }
        res.redirect('/');
    });
});

const port = 6969;

app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
});
