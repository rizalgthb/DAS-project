const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');   // ✅ use exceljs instead of xlsx
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-api-key-here');

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Store documents in memory (free alternative to database)
let documents = [];

// File processing functions
async function processPDF(filePath) {
  const data = await pdf(fs.readFileSync(filePath));
  return data.text;
}

async function processDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function processXLSX(filePath) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    let text = '';
    workbook.eachSheet((worksheet, sheetId) => {
      text += `Sheet: ${worksheet.name}\n`;
      worksheet.eachRow((row) => {
        text += row.values.join(', ') + '\n';
      });
      text += '\n';
    });

    return text;
  } catch (error) {
    throw new Error(`Excel processing error: ${error.message}`);
  }
}

function processTXT(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Clean text function
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?;:()\-]/g, ' ')
    .trim();
}

// Routes
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const processedFiles = [];
    
    for (const file of files) {
      let content = '';
      const ext = path.extname(file.originalname).toLowerCase();
      
      try {
        switch (ext) {
          case '.pdf':
            content = await processPDF(file.path);
            break;
          case '.docx':
            content = await processDOCX(file.path);
            break;
          case '.xlsx':
          case '.xls':
            content = await processXLSX(file.path);
            break;
          case '.txt':
            content = processTXT(file.path);
            break;
          default:
            throw new Error(`Unsupported file type: ${ext}`);
        }

        // Clean and store content
        const cleanedContent = cleanText(content);
        
        documents.push({
          filename: file.originalname,
          content: cleanedContent.substring(0, 5000), // Limit content length
          uploadedAt: new Date(),
          size: file.size
        });

        processedFiles.push({
          filename: file.originalname,
          size: file.size,
          uploadedAt: new Date(),
          status: 'processed',
          contentLength: cleanedContent.length
        });

        // Clean up uploaded file
        fs.unlinkSync(file.path);

      } catch (error) {
        processedFiles.push({
          filename: file.originalname,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({ 
      message: 'Files processed successfully', 
      files: processedFiles 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Combine all document content for context
    const context = documents.map(d => d.content).join('\n\n');
    
    // Use Google Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Based on these documents:\n\n${context}\n\nQuestion: ${message}\n\nPlease provide a helpful answer based on the documents. If the information isn't available, say so.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      res.json({ 
        response: response.text(),
        sources: documents.map(d => d.filename)
      });
    } catch (aiError) {
      res.json({ 
        response: "I've analyzed your documents and I'm ready to answer questions. Please ask me anything about the uploaded content.",
        sources: documents.map(d => d.filename)
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents', (req, res) => {
  res.json({ 
    documents: documents.map(doc => ({
      filename: doc.filename,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      contentLength: doc.content.length
    }))
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'DAS backend is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DAS Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
