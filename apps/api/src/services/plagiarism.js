/**
 * Plagiarism Detection Service
 * Metin benzerlik kontrolü için basit Jaccard ve Cosine similarity algoritmaları
 */

/**
 * Tokenize text into words (normalized, lowercase)
 */
function tokenize(text) {
    if (!text) return [];
    return text
        .toLowerCase()
        .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);
}

/**
 * Create n-grams from tokens
 */
function createNgrams(tokens, n = 3) {
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
}

/**
 * Calculate Jaccard Similarity between two sets
 */
function jaccardSimilarity(set1, set2) {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/**
 * Calculate Cosine Similarity between two texts
 */
function cosineSimilarity(text1, text2) {
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);

    // Create word frequency maps
    const freq1 = {};
    const freq2 = {};

    tokens1.forEach(t => { freq1[t] = (freq1[t] || 0) + 1; });
    tokens2.forEach(t => { freq2[t] = (freq2[t] || 0) + 1; });

    // Get all unique words
    const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    allWords.forEach(word => {
        const f1 = freq1[word] || 0;
        const f2 = freq2[word] || 0;
        dotProduct += f1 * f2;
        magnitude1 += f1 * f1;
        magnitude2 += f2 * f2;
    });

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

/**
 * Compare a submission against multiple source texts
 * @param {string} submission - The text to check
 * @param {Array<{id: string, text: string, title: string}>} sources - Array of source texts
 * @returns {Object} Plagiarism report
 */
function checkPlagiarism(submission, sources) {
    const submissionTokens = tokenize(submission);
    const submissionNgrams = new Set(createNgrams(submissionTokens));

    const results = sources.map(source => {
        const sourceTokens = tokenize(source.text);
        const sourceNgrams = new Set(createNgrams(sourceTokens));

        const jaccard = jaccardSimilarity(submissionNgrams, sourceNgrams);
        const cosine = cosineSimilarity(submission, source.text);

        // Weighted average (cosine similarity is usually more reliable)
        const similarityScore = (jaccard * 0.3) + (cosine * 0.7);

        return {
            sourceId: source.id,
            sourceTitle: source.title,
            jaccardScore: Math.round(jaccard * 100),
            cosineScore: Math.round(cosine * 100),
            overallScore: Math.round(similarityScore * 100),
            flagged: similarityScore > 0.3, // Flag if > 30% similar
        };
    });

    // Sort by similarity score descending
    results.sort((a, b) => b.overallScore - a.overallScore);

    // Calculate overall plagiarism score (max score among all sources)
    const maxScore = results.length > 0 ? results[0].overallScore : 0;

    return {
        submissionWordCount: submissionTokens.length,
        overallScore: maxScore,
        status: maxScore > 50 ? 'HIGH_SIMILARITY' : maxScore > 30 ? 'MODERATE_SIMILARITY' : 'LOW_SIMILARITY',
        flagged: maxScore > 30,
        matches: results.filter(r => r.overallScore > 10), // Only include significant matches
        checkedAt: new Date().toISOString(),
    };
}

/**
 * Compare two submissions against each other (for detecting copying between students)
 */
function compareSubmissions(submission1, submission2) {
    const cosine = cosineSimilarity(submission1.text, submission2.text);
    const tokens1 = tokenize(submission1.text);
    const tokens2 = tokenize(submission2.text);
    const ngrams1 = new Set(createNgrams(tokens1));
    const ngrams2 = new Set(createNgrams(tokens2));
    const jaccard = jaccardSimilarity(ngrams1, ngrams2);

    const similarityScore = (jaccard * 0.3) + (cosine * 0.7);

    return {
        submission1Id: submission1.id,
        submission2Id: submission2.id,
        jaccardScore: Math.round(jaccard * 100),
        cosineScore: Math.round(cosine * 100),
        overallScore: Math.round(similarityScore * 100),
        flagged: similarityScore > 0.5, // Higher threshold for student-to-student
    };
}

/**
 * Batch compare all submissions in an assignment
 */
function batchCompareSubmissions(submissions) {
    const comparisons = [];

    for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
            const comparison = compareSubmissions(submissions[i], submissions[j]);
            if (comparison.overallScore > 20) {
                comparisons.push(comparison);
            }
        }
    }

    // Sort by similarity score descending
    comparisons.sort((a, b) => b.overallScore - a.overallScore);

    return {
        totalComparisons: (submissions.length * (submissions.length - 1)) / 2,
        flaggedPairs: comparisons.filter(c => c.flagged).length,
        comparisons: comparisons.slice(0, 50), // Top 50 matches
        checkedAt: new Date().toISOString(),
    };
}

module.exports = {
    tokenize,
    createNgrams,
    jaccardSimilarity,
    cosineSimilarity,
    checkPlagiarism,
    compareSubmissions,
    batchCompareSubmissions,
};
