const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer'); // For handling file uploads
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json()); // Parse JSON bodies
app.use(cors()); // Enable CORS
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyDC8lm66DBkF4vvo3hLhaE_N7W0BSM_WJY"); // Replace with your actual API key

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save uploaded files to the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  },
});

const upload = multer({ storage });

// Convert file to base64 for Gemini API
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
}

// POST endpoint to handle image uploads and Gemini API requests
app.post('/api/ask', upload.array('images', 3), async (req, res) => {
  const { prompt } = req.body;
  const imageFiles = req.files;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    let imageParts = [];
    if (imageFiles && imageFiles.length > 0) {
      // Convert uploaded images to base64
      imageParts = imageFiles.map((file) =>
        fileToGenerativePart(file.path, file.mimetype)
      );
    }

    // Generate content using Gemini API
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = await result.response.text();

    // Clean up uploaded files (if any)
    if (imageFiles && imageFiles.length > 0) {
      imageFiles.forEach((file) => fs.unlinkSync(file.path));
    }

    // Send the response back to the client
    res.json({ response: responseText });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});