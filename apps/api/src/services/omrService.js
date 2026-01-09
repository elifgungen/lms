const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

/**
 * OMR Service - Wrapper for Python OpenCV worker
 * Calls the Python worker.py script for advanced image processing
 */
class OMRService {
    constructor() {
        this.workerPath = path.join(__dirname, 'omr', 'worker.py');
        this.templatePath = path.join(__dirname, 'omr', 'templates', 'standard_156.json');
    }

    async processImage(imageBuffer, options = {}) {
        const startTime = Date.now();
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omr-'));

        try {
            // Save image to temp file
            const inputPath = path.join(tempDir, 'input.jpg');
            await fs.writeFile(inputPath, imageBuffer);

            // Get template path
            const templatePath = options.templatePath || this.templatePath;
            const corners = options.corners || null;
            const anchors = options.anchors || null;
            const previewOnly = !!options.previewOnly;

            // Run Python worker
            const result = await this.runPythonWorker(inputPath, templatePath, tempDir, { corners, anchors, previewOnly });

            // Parse results
            const resultPath = path.join(tempDir, 'result.json');
            const previewPath = path.join(tempDir, 'preview.png');
            const warpedPath = path.join(tempDir, 'warped.png');
            const resultData = JSON.parse(await fs.readFile(resultPath, 'utf8'));

            // Embed debug overlay (preview.png) if available
            let previewImage = null;
            try {
                const buf = await fs.readFile(previewPath);
                previewImage = `data:image/png;base64,${buf.toString('base64')}`;
            } catch (_) {
                // no-op if preview missing
            }

            // Embed warped image (no overlays) if available
            let warpedImage = null;
            try {
                const buf = await fs.readFile(warpedPath);
                warpedImage = `data:image/png;base64,${buf.toString('base64')}`;
            } catch (_) {
                // no-op if warped missing
            }

            // Convert to our format
            return this.convertResult(resultData, Date.now() - startTime, { previewImage, warpedImage, previewOnly });

        } catch (error) {
            console.error('OMR Python worker error:', error);
            // Fallback to simple processing
            return this.fallbackProcess(imageBuffer, Date.now() - startTime, error.message);
        } finally {
            // Cleanup temp dir
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.warn('Failed to cleanup temp dir:', e);
            }
        }
    }

    runPythonWorker(inputPath, templatePath, outputDir, options = {}) {
        return new Promise((resolve, reject) => {
            const python = process.platform === 'win32' ? 'python' : 'python3';
            // Safer defaults: faint mode açık, ilk blok + 52 soru limiti; env ile override edilebilir
            const env = {
                ...process.env,
                OMR_DEBUG: process.env.OMR_DEBUG || '1',
                OMR_FAINT: process.env.OMR_FAINT || '1',
                OMR_STRICT: process.env.OMR_STRICT || '0',
                OMR_LIMIT_FIRST_BLOCK: process.env.OMR_LIMIT_FIRST_BLOCK || '1',
                OMR_MAX_QUESTIONS: process.env.OMR_MAX_QUESTIONS || '52'
            };
            if (options.corners) {
                env.OMR_CORNERS = JSON.stringify(options.corners);
            }
            if (options.anchors) {
                env.OMR_ANCHORS = JSON.stringify(options.anchors);
            }
            if (options.previewOnly) {
                env.OMR_PREVIEW_ONLY = '1';
            }
            const proc = spawn(python, [this.workerPath, inputPath, templatePath, outputDir], { env });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log('[OMR Python]', data.toString());
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                        resolve({ success: true });
                    }
                } else {
                    reject(new Error(`Python worker failed: ${stderr || stdout}`));
                }
            });

            proc.on('error', (err) => {
                reject(new Error(`Failed to start Python: ${err.message}`));
            });
        });
    }

    convertResult(data, processingMs, assets = {}) {
        const { previewImage = null, warpedImage = null, previewOnly = false } = assets;
        const answers = (data.answers || []).map(a => ({
            question: a.question,
            answer: a.answer,
            confidence: a.confidence || 0,
            status: a.status,
            debug: `best:${Math.round((a.best || 0) * 100)} delta:${Math.round((a.delta || 0) * 100)} z:${(a.z || 0).toFixed(1)}`,
            error: a.answer ? null : (a.status === 'BLANK' ? 'no_mark' : a.status?.toLowerCase())
        }));

        return {
            success: true,
            studentNumber: null,
            bookletType: null,
            answers,
            errors: data.warnings || [],
            metadata: {
                processingTimeMs: processingMs,
                perspectiveCorrected: data.meta?.cornerMarkersFound || false,
                pythonWorker: true,
                summary: data.summary
            },
            anchors: data.anchors || null,
            pageSize: data.meta?.pageSize || null,
            corners: data.meta?.corners || data.meta?.cornerPoints || data.corners || [],
            previewImage,
            warpedImage,
            previewOnly
        };
    }

    fallbackProcess(imageBuffer, processingMs, errorMessage) {
        // If Python fails, return empty result with error
        return {
            success: false,
            studentNumber: null,
            bookletType: null,
            answers: [],
            errors: [`Python worker failed: ${errorMessage}`],
            metadata: {
                processingTimeMs,
                perspectiveCorrected: false,
                pythonWorker: false
            },
            corners: []
        };
    }

    /**
     * Quick sheet detection - checks if OMR form is visible
     * Uses simple edge/corner detection without full processing
     */
    async detectSheet(imageBuffer) {
        const startTime = Date.now();
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omr-detect-'));

        try {
            const inputPath = path.join(tempDir, 'input.jpg');
            await fs.writeFile(inputPath, imageBuffer);

            // Run Python worker in detect-only mode
            const result = await this.runDetectWorker(inputPath, tempDir);

            return {
                detected: result.detected || false,
                corners: result.corners || [],
                confidence: result.confidence || 0,
                processingMs: Date.now() - startTime
            };
        } catch (error) {
            console.error('Sheet detection error:', error);
            return {
                detected: false,
                corners: [],
                confidence: 0,
                processingMs: Date.now() - startTime
            };
        } finally {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) { /* ignore */ }
        }
    }

    runDetectWorker(inputPath, outputDir) {
        return new Promise((resolve, reject) => {
            const python = process.platform === 'win32' ? 'python' : 'python3';
            const detectScript = path.join(__dirname, 'omr', 'detect.py');

            // Check if detect script exists, fallback to simple detection
            fs.access(detectScript).then(() => {
                const proc = spawn(python, [detectScript, inputPath, outputDir]);
                let stdout = '';
                let stderr = '';

                proc.stdout.on('data', (data) => { stdout += data.toString(); });
                proc.stderr.on('data', (data) => { stderr += data.toString(); });

                proc.on('close', (code) => {
                    if (code === 0) {
                        try {
                            resolve(JSON.parse(stdout));
                        } catch (e) {
                            resolve({ detected: false, corners: [], confidence: 0 });
                        }
                    } else {
                        resolve({ detected: false, corners: [], confidence: 0 });
                    }
                });

                proc.on('error', () => {
                    resolve({ detected: false, corners: [], confidence: 0 });
                });
            }).catch(() => {
                // No detect script - use simple heuristic
                resolve(this.simpleDetect(inputPath));
            });
        });
    }

    async simpleDetect(inputPath) {
        // Simple fallback: assume sheet is detected if image exists
        // In production, this would use OpenCV edge detection
        try {
            await fs.access(inputPath);
            return {
                detected: true,
                corners: [
                    { x: 0.05, y: 0.05 },
                    { x: 0.95, y: 0.05 },
                    { x: 0.95, y: 0.95 },
                    { x: 0.05, y: 0.95 }
                ],
                confidence: 0.7
            };
        } catch {
            return { detected: false, corners: [], confidence: 0 };
        }
    }
}

module.exports = new OMRService();
