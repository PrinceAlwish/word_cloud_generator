// ... Existing code ...

// === [NEW] Add DOM for summary and chart ===
document.addEventListener('DOMContentLoaded', () => {
    // Insert summary and bar chart container above wordCloudOutput
    const summaryOutput = document.createElement('div');
    summaryOutput.id = 'summaryOutput';
    summaryOutput.style.marginBottom = "15px";
    wordCloudOutput.parentNode.insertBefore(summaryOutput, wordCloudOutput);

    const chartContainer = document.createElement('div');
    chartContainer.id = 'barChartContainer';
    chartContainer.style.marginBottom = "15px";
    summaryOutput.appendChild(chartContainer);
});

// === [NEW] Utility to get most frequent word ===
function getMostFrequentWord(wordFrequencies) {
    if (!wordFrequencies.length) return null;
    const maxCount = Math.max(...wordFrequencies.map(w => w.count));
    const mostFrequentWords = wordFrequencies.filter(w => w.count === maxCount);
    // Return first one if tie
    return {...mostFrequentWords[0], isTie: mostFrequentWords.length > 1};
}

// === [CHANGED] getOptions: add minWordLength, excludeNumbers, showFrequencyOnHover ===
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
        wordRotation: wordRotationCheckbox.checked,
        minWordLength: parseInt(document.getElementById('minWordLength').value, 10) || 1,
        excludeNumbers: document.getElementById('excludeNumbers').checked,
        showFrequencyOnHover: document.getElementById('showFrequencyOnHover').checked
    };
}

// === [CHANGED] cleanAndTokenize: add filtering for min length and exclude numbers ===
function cleanAndTokenize(text, options) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length >= (options?.minWordLength || 1))
        .filter(word => (options?.excludeNumbers ? !/^\d+$/.test(word) : true))
        .filter(word => word.length > 0);
}

// === [NEW] Export word frequency as CSV ===
function exportFrequenciesAsCSV(wordFrequencies) {
    if (!wordFrequencies.length) {
        alert("Generate a word cloud first!");
        return;
    }
    const csvRows = ['Word,Count'];
    wordFrequencies.forEach(w => {
        csvRows.push(`"${w.word.replace(/"/g,'""')}",${w.count}`);
    });
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], {type: "text/csv"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "word_frequencies.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// === [NEW] Bar chart for top N words (uses Chart.js CDN) ===
function renderBarChart(wordFrequencies, N = 10) {
    let chartContainer = document.getElementById('barChartContainer');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';
    if (window.wordFreqChart && window.wordFreqChart.destroy) window.wordFreqChart.destroy();
    if (!wordFrequencies.length) return;
    // Sort and take top N
    const data = [...wordFrequencies].sort((a, b) => b.count - a.count).slice(0, N);
    chartContainer.innerHTML = `<canvas id="wordFreqChart"></canvas>`;
    const ctx = document.getElementById('wordFreqChart').getContext('2d');
    window.wordFreqChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.word),
            datasets: [{
                label: '# of Occurrences',
                data: data.map(d => d.count),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false }},
            scales: { y: { beginAtZero: true, stepSize: 1 } }
        }
    });
}

// === [CHANGED] Main function ===
function generateCloudFromInput() {
    const text = textInput.value.trim();
    const options = getOptions();
    if (!text) {
        alert("Please enter some text to generate a word cloud.");
        wordCloudOutput.innerHTML = '<p class="placeholder-text">Enter text and click \'Generate\' to see your word cloud!</p>';
        wordCloudOutput.classList.remove('active');
        document.getElementById('summaryOutput').innerHTML = '';
        return;
    }
    const words = cleanAndTokenize(text, options);
    const wordFrequencies = calculateWordFrequencies(words, options.excludeStopwords);
    const wordDataWithSizes = normalizeFrequencies(wordFrequencies, options.minFontSize, options.maxFontSize);

    // Show most frequent word summary
    const mostFreq = getMostFrequentWord(wordFrequencies);
    if (mostFreq) {
        document.getElementById('summaryOutput').innerHTML =
          `<strong>Most frequent word:</strong> "${mostFreq.word}" (${mostFreq.count} time${mostFreq.count>1?"s":""})${mostFreq.isTie?" (tie)":""}<div id="barChartContainer" style="margin-top:10px"></div>`;
    } else {
        document.getElementById('summaryOutput').innerHTML = '';
    }

    // Render bar chart
    renderBarChart(wordFrequencies, 10);

    // Render word cloud with highlight for most frequent word
    renderWordCloud(wordDataWithSizes, {...options, mostFrequentWord: mostFreq && mostFreq.word});
}

// === [CHANGED] renderWordCloud: highlight most frequent word, show freq on hover ===
function renderWordCloud(wordData, options) {
    wordCloudOutput.innerHTML = '';
    wordCloudOutput.classList.add('active');
    if (wordData.length === 0) {
        wordCloudOutput.innerHTML = '<p class="placeholder-text">No words to display. Try a different text or adjust settings.</p>';
        return;
    }
    wordData.sort((a, b) => b.count - a.count);
    wordData.forEach(item => {
        const span = document.createElement('span');
        span.textContent = item.word;
        span.style.fontSize = `${item.fontSize}px`;
        span.style.fontFamily = options.fontFamily;
        span.style.color = getRandomColor(options.colorScheme);
        if (options.wordRotation) {
            const rotationDegrees = Math.random() < 0.5 ? 0 : 90;
            span.style.transform = `rotate(${rotationDegrees}deg)`;
            span.dataset.rotation = rotationDegrees;
        } else {
            span.style.transform = 'none';
            span.dataset.rotation = 0;
        }
        if (options.mostFrequentWord && item.word === options.mostFrequentWord) {
            span.style.textShadow = "0 0 8px #f39c12, 0 0 10px #f39c12";
            span.style.fontWeight = "bold";
            span.style.borderBottom = "2px solid #f39c12";
        }
        if (options.showFrequencyOnHover) {
            span.title = `"${item.word}" — ${item.count} time${item.count>1?'s':''}`;
        }
        wordCloudOutput.appendChild(span);
    });
}

// === [NEW] Add event listener to CSV export button ===
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('exportCSVBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const text = textInput.value.trim();
            if (!text) return alert("No data to export!");
            const options = getOptions();
            const words = cleanAndTokenize(text, options);
            const wordFrequencies = calculateWordFrequencies(words, options.excludeStopwords);
            exportFrequenciesAsCSV(wordFrequencies);
        });
    }
});
