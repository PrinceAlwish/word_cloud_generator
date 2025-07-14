document.addEventListener('DOMContentLoaded', init);

// --- DOM Elements ---
const textInput = document.getElementById('textInput');
const generateBtn = document.getElementById('generateBtn');
const wordCloudOutput = document.getElementById('wordCloudOutput');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const minFontSizeInput = document.getElementById('minFontSize');
const maxFontSizeInput = document.getElementById('maxFontSize');
const minFontSizeValue = document.getElementById('minFontSizeValue');
const maxFontSizeValue = document.getElementById('maxFontSizeValue');
const colorSchemeSelect = document.getElementById('colorSchemeSelect');
const excludeStopwordsCheckbox = document.getElementById('excludeStopwords');
const wordRotationCheckbox = document.getElementById('wordRotation');
const refreshBtn = document.getElementById('refreshBtn');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');

// --- Configuration Constants ---

// Common English stopwords (can be expanded)
const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in", "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the", "their", "then", "there", "these", "they", "this", "to", "was", "will", "with", "he", "she", "his", "her", "him", "its", "had", "have", "has", "do", "does", "did", "i", "me", "my", "you", "your", "we", "us", "our", "mine", "yours", "ours", "them", "their", "from", "up", "down", "out", "about", "would", "could", "should", "can", "must", "may", "might", "which", "when", "where", "why", "how", "also", "very", "just", "too", "so", "much", "more", "most", "less", "least", "even", "only", "well", "now", "then", "here", "there", "than", "than", "after", "before", "while", "until", "though", "although", "unless", "since", "because", "through", "under", "over", "between", "among", "beyond", "without", "within", "towards", "upon", "off", "on", "throughout", "wherein", "whereupon", "whereby", "whether", "whereas", "whatever", "whoever", "whichever", "whomever", "whosoever", "what", "who", "whom", "whose", "why", "how", "what's", "it's", "i'm", "you're", "we're", "they're", "i've", "you've", "we've", "they've", "i'd", "you'd", "he'd", "she'd", "it'd", "we'd", "they'd", "i'll", "you'll", "he'll", "she'll", "it'll", "we'll", "they'll", "don't", "doesn't", "didn't", "can't", "won't", "wouldn't", "shouldn't", "couldn't", "mustn't", "hasn't", "haven't", "hadn't", "isn't", "aren't", "wasn't", "weren't"
]);

// Predefined color schemes
const COLOR_SCHEMES = {
    default: ["#2196F3", "#4CAF50", "#FFC107", "#E91E63", "#9C27B0"], // Blue, Green, Yellow, Pink, Purple
    warm: ["#FF5722", "#FF9800", "#FFC107", "#F44336", "#CDDC39"], // Deep Orange, Orange, Amber, Red, Lime
    cool: ["#00BCD4", "#2196F3", "#3F51B5", "#673AB7", "#9C27B0"], // Cyan, Blue, Indigo, Deep Purple, Purple
    grayscale: ["#333333", "#666666", "#999999", "#CCCCCC", "#EEEEEE"], // Shades of gray
    random: [] // Will generate truly random colors
};

// --- Initial Setup ---
function init() {
    // Update font size value displays
    minFontSizeInput.addEventListener('input', () => {
        minFontSizeValue.textContent = `${minFontSizeInput.value}px`;
    });
    maxFontSizeInput.addEventListener('input', () => {
        maxFontSizeValue.textContent = `${maxFontSizeInput.value}px`;
    });

    // Event Listeners for buttons
    generateBtn.addEventListener('click', generateCloudFromInput);
    refreshBtn.addEventListener('click', generateCloudFromInput); // Refresh just regenerates with current options
    downloadPngBtn.addEventListener('click', downloadPNG);
    downloadSvgBtn.addEventListener('click', downloadSVG);

    // Initial word cloud generation on load (if text exists)
    if (textInput.value.trim() !== '') {
        generateCloudFromInput();
    } else {
        wordCloudOutput.classList.remove('active');
    }
}

// --- Core Logic Functions ---

/**
 * Gathers all current options from the UI.
 * @returns {object} An object containing all selected options.
 */
function getOptions() {
    const minSize = parseInt(minFontSizeInput.value);
    const maxSize = parseInt(maxFontSizeInput.value);

    // Ensure minSize is not greater than maxSize
    if (minSize > maxSize) {
        alert("Minimum font size cannot be greater than maximum font size. Adjusting min size to max size.");
        minFontSizeInput.value = maxSize;
        minFontSizeValue.textContent = `${maxSize}px`;
    }

    return {
        fontFamily: fontFamilySelect.value,
        minFontSize: minSize,
        maxFontSize: maxSize,
        colorScheme: colorSchemeSelect.value,
        excludeStopwords: excludeStopwordsCheckbox.checked,
        wordRotation: wordRotationCheckbox.checked
    };
}

/**
 * Cleans the input text and tokenizes it into words.
 * @param {string} text - The raw input text.
 * @returns {string[]} An array of cleaned words.
 */
function cleanAndTokenize(text) {
    // Convert to lowercase, remove punctuation, split by whitespace, and filter out empty strings
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/) // Split by any whitespace
        .filter(word => word.length > 0); // Remove empty strings
}

/**
 * Calculates the frequency of each word.
 * @param {string[]} words - An array of words.
 * @param {boolean} excludeStopwords - Whether to exclude common stopwords.
 * @returns {Array<{word: string, count: number}>} An array of word objects with their counts.
 */
function calculateWordFrequencies(words, excludeStopwords) {
    const wordCounts = {};
    words.forEach(word => {
        if (excludeStopwords && STOP_WORDS.has(word)) {
            return; // Skip stopword
        }
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Convert object to array for easier sorting and processing
    return Object.keys(wordCounts).map(word => ({
        word: word,
        count: wordCounts[word]
    }));
}

/**
 * Normalizes word frequencies to a font size range.
 * @param {Array<{word: string, count: number}>} wordData - Array of word objects with counts.
 * @param {number} minFontSize - Minimum font size in pixels.
 * @param {number} maxFontSize - Maximum font size in pixels.
 * @returns {Array<{word: string, count: number, fontSize: number}>} Word data with calculated font sizes.
 */
function normalizeFrequencies(wordData, minFontSize, maxFontSize) {
    if (wordData.length === 0) return [];

    const maxCount = Math.max(...wordData.map(w => w.count));
    const minCount = Math.min(...wordData.map(w => w.count));

    // Handle case where all words have the same frequency
    if (maxCount === minCount) {
        return wordData.map(item => ({
            ...item,
            fontSize: (minFontSize + maxFontSize) / 2 // Use average size
        }));
    }

    const fontRange = maxFontSize - minFontSize;

    return wordData.map(item => {
        const normalizedCount = (item.count - minCount) / (maxCount - minCount);
        const fontSize = minFontSize + (normalizedCount * fontRange);
        return {
            ...item,
            fontSize: Math.round(fontSize) // Round to whole pixel for consistency
        };
    });
}

/**
 * Generates a random color based on the selected scheme.
 * @param {string} scheme - The color scheme name.
 * @returns {string} A CSS color string (e.g., "#RRGGBB").
 */
function getRandomColor(scheme) {
    const schemeColors = COLOR_SCHEMES[scheme];
    if (scheme === 'random' || !schemeColors || schemeColors.length === 0) {
        // Generate a truly random bright color
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 50) + 50; // 50-100% saturation
        const lightness = Math.floor(Math.random() * 30) + 40; // 40-70% lightness
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    } else {
        // Pick a random color from the predefined scheme
        return schemeColors[Math.floor(Math.random() * schemeColors.length)];
    }
}

/**
 * Renders the word cloud in the output container.
 * @param {Array<{word: string, count: number, fontSize: number}>} wordData - Processed word data with font sizes.
 * @param {object} options - User selected options.
 */
function renderWordCloud(wordData, options) {
    wordCloudOutput.innerHTML = ''; // Clear previous cloud
    wordCloudOutput.classList.add('active'); // Add active class for styling

    if (wordData.length === 0) {
        wordCloudOutput.innerHTML = '<p class="placeholder-text">No words to display. Try a different text or adjust settings.</p>';
        return;
    }

    // Sort words by frequency (descending) to render larger words first, which might help with visual hierarchy
    wordData.sort((a, b) => b.count - a.count);

    wordData.forEach(item => {
        const span = document.createElement('span');
        span.textContent = item.word;
        span.style.fontSize = `${item.fontSize}px`;
        span.style.fontFamily = options.fontFamily;
        span.style.color = getRandomColor(options.colorScheme);

        // Apply rotation if enabled
        if (options.wordRotation) {
            const rotationDegrees = Math.random() < 0.5 ? 0 : 90; // 50% chance for 0 or 90 degrees
            span.style.transform = `rotate(${rotationDegrees}deg)`;
            span.dataset.rotation = rotationDegrees; // Store rotation for SVG export
        } else {
            span.style.transform = 'none';
            span.dataset.rotation = 0;
        }

        wordCloudOutput.appendChild(span);
    });
}

/**
 * Main function to generate the word cloud from input text.
 */
function generateCloudFromInput() {
    const text = textInput.value.trim();
    if (!text) {
        alert("Please enter some text to generate a word cloud.");
        wordCloudOutput.innerHTML = '<p class="placeholder-text">Enter text and click \'Generate\' to see your word cloud!</p>';
        wordCloudOutput.classList.remove('active');
        return;
    }

    const options = getOptions();
    const words = cleanAndTokenize(text);
    const wordFrequencies = calculateWordFrequencies(words, options.excludeStopwords);
    const wordDataWithSizes = normalizeFrequencies(wordFrequencies, options.minFontSize, options.maxFontSize);

    renderWordCloud(wordDataWithSizes, options);
}

// --- Download Functions ---

/**
 * Downloads the word cloud as a PNG image.
 * Uses html2canvas to render the HTML div to a canvas, then converts to PNG.
 */
function downloadPNG() {
    if (wordCloudOutput.children.length === 0 || wordCloudOutput.querySelector('.placeholder-text')) {
        alert("Generate a word cloud first before downloading!");
        return;
    }

    // Temporarily adjust styles for better capture (optional, depends on desired output)
    const originalPadding = wordCloudOutput.style.padding;
    const originalBackground = wordCloudOutput.style.backgroundColor;
    wordCloudOutput.style.padding = '30px'; // Give some padding for the image
    wordCloudOutput.style.backgroundColor = '#FFFFFF'; // Ensure white background

    html2canvas(wordCloudOutput, {
        scale: 2, // Increase scale for higher resolution
        useCORS: true, // If using external fonts/images, though not applicable here
        logging: false // Disable console logs from html2canvas
    }).then(canvas => {
        // Create a temporary link element
        const link = document.createElement('a');
        link.download = 'wordcloud.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Restore original styles
        wordCloudOutput.style.padding = originalPadding;
        wordCloudOutput.style.backgroundColor = originalBackground;
    }).catch(error => {
        console.error("Error generating PNG:", error);
        alert("Failed to download PNG. Please try again.");
        // Restore original styles in case of error too
        wordCloudOutput.style.padding = originalPadding;
        wordCloudOutput.style.backgroundColor = originalBackground;
    });
}

/**
 * Downloads the word cloud as an SVG file.
 * Iterates through the rendered HTML spans and constructs an SVG string.
 */
function downloadSVG() {
    if (wordCloudOutput.children.length === 0 || wordCloudOutput.querySelector('.placeholder-text')) {
        alert("Generate a word cloud first before downloading!");
        return;
    }

    const outputRect = wordCloudOutput.getBoundingClientRect();
    const svgWidth = outputRect.width;
    const svgHeight = outputRect.height;

    let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`;
    svgContent += `<rect width="100%" height="100%" fill="#ffffff"/>`; // White background

    // Helper to parse CSS transform matrix for rotation
    function getRotationDegreesFromMatrix(transform) {
        if (transform === 'none') return 0;
        const matrix = transform.match(/^matrix\((.+)\)$/);
        if (matrix) {
            const values = matrix[1].split(',').map(Number);
            const a = values[0]; // cos(angle)
            const b = values[1]; // sin(angle)
            const angleRad = Math.atan2(b, a);
            const angleDeg = angleRad * (180 / Math.PI);
            return angleDeg;
        }
        return 0;
    }

    // Collect all word elements and their properties
    Array.from(wordCloudOutput.children).forEach(span => {
        const rect = span.getBoundingClientRect();
        const style = window.getComputedStyle(span);

        // Adjust coordinates relative to the wordCloudOutput div
        const x = rect.left - outputRect.left;
        const y = rect.top - outputRect.top;

        const fontSize = parseFloat(style.fontSize);
        const fontFamily = style.fontFamily;
        const color = style.color;
        const text = span.textContent;

        // Get rotation from dataset if stored, or parse computed style
        const rotation = span.dataset.rotation ? parseFloat(span.dataset.rotation) : getRotationDegreesFromMatrix(style.transform);

        // SVG text element needs a baseline y-coordinate
        // The HTML span's top is `rect.top`. For SVG text, we need the baseline.
        // A common approximation for baseline is `y + font_size * 0.75` or simply `y + font_size`.
        // Given flexbox centering, `y` is already somewhat centered. Let's try `y + fontSize * 0.8` for a rough center.
        // More accurately, we'd need to know the exact `line-height` and vertical alignment.
        // For simplicity and visual alignment with HTML, `y + fontSize` tends to put the bottom of the text at `y`.
        // Let's use `y + fontSize * 0.75` as a reasonable midpoint approximation.
        // However, with `transform: rotate` applied to the `span`, `getBoundingClientRect` gives the bounding box of the *rotated* element.
        // For SVG, we typically want the rotation to happen around the text's own center or baseline.
        // A simpler approach for SVG is to apply the rotation to the `<text>` element.
        // The `x` and `y` coordinates will be the top-left of the original (unrotated) bounding box.
        // Then apply the transform.
        const textAnchor = 'middle'; // Center text horizontally for rotation pivot
        const translateY = y + fontSize / 2; // Approximate vertical center for rotation
        const translateX = x + rect.width / 2; // Approximate horizontal center for rotation

        svgContent += `
            <text x="${translateX}" y="${translateY}"
                  font-family="${fontFamily}"
                  font-size="${fontSize}"
                  fill="${color}"
                  text-anchor="${textAnchor}"
                  transform="rotate(${rotation} ${translateX} ${translateY})"
            >${text}</text>
        `;
    });

    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'wordcloud.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
}