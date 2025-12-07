(function() {
  // This is the probability threshold.
  const PHISHING_THRESHOLD = 0.75;
  const MAX_RETRIES = 5;
  let retryCount = 0;

  try {
    const links = document.querySelectorAll("a");
    if (links.length === 0) return;

    // 1. Collect all unique URLs from the page
    const urlSet = new Set();
    links.forEach(link => {
      if (link.href) {
        urlSet.add(link.href);
      }
    });

    const uniqueUrls = Array.from(urlSet);
    if (uniqueUrls.length === 0) return;

    // 2. Send URLs to the background script for prediction
    requestPredictions(uniqueUrls);

  } catch (err) {
    console.error('PhishBlock content script error:', err && err.message);
  }

  // --- NEW FUNCTION TO HANDLE RETRIES ---
  function requestPredictions(urls) {
    chrome.runtime.sendMessage(
      { action: 'predictUrls', urls: urls },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('PhishBlock Error:', chrome.runtime.lastError.message);
          return;
        }

        // Check for the "model not loaded" error
        if (response && response.error === 'Model not loaded. Try again.') {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.warn(`PhishBlock: Model not loaded. Retrying (${retryCount}/${MAX_RETRIES})...`);
            // Wait 500ms and try again
            setTimeout(() => requestPredictions(urls), 500);
          } else {
            console.error('PhishBlock: Model failed to load after retries.');
          }
          return; // Stop here and wait for the retry
        }

        // Check for any other errors
        if (response && response.error) {
          console.error(`PhishBlock: Other error: ${response.error}`);
          return;
        }

        // Success!
        if (response && response.predictions) {
          // 3. Highlight links based on the returned scores
          highlightLinks(response.predictions);
        }
      }
    );
  }

  function highlightLinks(predictions) {
    document.querySelectorAll("a").forEach(link => {
      try {
        const href = link.href || '';
        if (predictions.hasOwnProperty(href)) {
          
          const probability = predictions[href];
          
          // Check if the probability exceeds our threshold
          if (probability > PHISHING_THRESHOLD) {
            // Phishing: Red outline
            link.style.outline = '2px solid #e74c3c';
          } else {
            // Benign: Green outline (as per your original extension's logic)
            link.style.outline = '2px solid #2ecc71';
          }
        }
      } catch (e) { /* ignore per-link errors */ }
    });
  }
})();