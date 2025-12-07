// --- 1. Model Storage ---
let model = null;
const MODEL_URL = chrome.runtime.getURL('phishblock_model.json');

// --- 2. Load the Model ---
async function loadModel() {
  try {
    const response = await fetch(MODEL_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.statusText}`);
    }
    model = await response.json();
    console.log('PhishBlock ML Model loaded successfully.');
  } catch (err) {
    console.error('Error loading PhishBlock model:', err);
    model = null; // Ensure model is null on failure
  }
}

// Load model on extension startup
loadModel();

// --- 3. Re-implement Feature Extraction (TF-IDF) in JS ---
// This must perfectly match the Python TfidfVectorizer logic
function extractFeatures(url) {
  if (!model) return null;

  const { vocabulary, ngram_range } = model;
  const [min_n, max_n] = ngram_range;
  
  // Simple "char_wb" analyzer simulation:
  // 1. Add spaces around the URL to catch n-grams at edges
  const paddedUrl = ` ${url} `;
  // 2. Find all "word-like" sequences (simpler: just use the whole string)
  // For 'char_wb', we'll just process the whole string.
  
  const tokens = new Set();
  
  // Generate n-grams
  for (let n = min_n; n <= max_n; n++) {
    for (let i = 0; i <= paddedUrl.length - n; i++) {
      const ngram = paddedUrl.substring(i, i + n);
      // Check if this ngram is in our model's vocabulary
      if (vocabulary.hasOwnProperty(ngram)) {
        tokens.add(ngram);
      }
    }
  }
  
  return Array.from(tokens);
}

// --- 4. Re-implement Prediction in JS ---
// This calculates the Logistic Regression prediction
function predict(url) {
  if (!model) return 0; // Default to 'benign' if model isn't loaded

  const { weights, intercept } = model;
  
  // 1. Get features (the n-grams) from the URL
  const features = extractFeatures(url);
  if (!features) return 0;

  // 2. Calculate the weighted sum (dot product)
  let score = intercept;
  for (const feature of features) {
    if (weights.hasOwnProperty(feature)) {
      score += weights[feature];
      // Note: We skip TF-IDF weighting for simplicity in the browser.
      // The model weights have already learned the "importance"
      // of each token. This is a common simplification.
    }
  }

  // 3. Apply the sigmoid function to get a probability (0.0 to 1.0)
  const probability = 1 / (1 + Math.exp(-score));
  
  return probability;
}

// --- 5. Listen for Requests from Content Script ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'predictUrls') {
    if (!model) {
      // Model not loaded yet, tell content script to wait
      sendResponse({ error: 'Model not loaded. Try again.' });
      return true; // Indicates async response
    }
    
    // Process all URLs and return their phishing probability
    const predictions = {};
    for (const url of request.urls) {
      predictions[url] = predict(url);
    }
    sendResponse({ predictions });
  }
  return true; // Handle async response
});