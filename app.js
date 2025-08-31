// Global Application State
class SocialMediaContentAnalyzer {
    constructor() {
        this.theme = 'light';
        this.extractedResults = [];
        this.currentFiles = [];
        this.isProcessing = false;
        this.dragCounter = 0;
        this.sentimentCharts = {};
        this.currentSentimentData = null;
        
        // Platform data
        this.platforms = {
            instagram: { maxChars: 2200, optimalChars: "125-150", optimalHashtags: "8-12", color: "#E4405F" },
            twitter: { maxChars: 280, optimalChars: "120-140", optimalHashtags: "1-3", color: "#1DA1F2" },
            linkedin: { maxChars: 3000, optimalChars: "150-300", optimalHashtags: "3-5", color: "#0077B5" },
            facebook: { maxChars: 63206, optimalChars: "40-80", optimalHashtags: "1-3", color: "#1877F2" }
        };
        
        // Sentiment analysis data
        this.emotions = [
            { name: "Joy", color: "#10B981", icon: "😊" },
            { name: "Anger", color: "#EF4444", icon: "😠" },
            { name: "Fear", color: "#8B5CF6", icon: "😰" },
            { name: "Sadness", color: "#6B7280", icon: "😢" },
            { name: "Surprise", color: "#F59E0B", icon: "😲" },
            { name: "Disgust", color: "#84CC16", icon: "🤢" }
        ];
        
        this.positiveKeywords = ["excited", "amazing", "fantastic", "love", "brilliant", "outstanding", "excellent", "great", "wonderful", "awesome"];
        this.negativeKeywords = ["disappointed", "frustrated", "terrible", "awful", "worst", "horrible", "hate", "bad", "poor", "disappointing"];
        
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.setupPDFWorker();
        this.initializeCharts();
        this.renderAISuggestions();
        this.updatePlatformInfo();
    }

    setupPDFWorker() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('contentAnalyzerTheme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.theme = theme;
        const root = document.documentElement;
        
        // Apply theme to root element
        root.setAttribute('data-color-scheme', theme);
        localStorage.setItem('contentAnalyzerTheme', theme);
        
        // Update theme icon
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
        
        // Force repaint for immediate visual feedback
        setTimeout(() => {
            this.updateChartsTheme();
        }, 100);
        
        // Trigger style recalculation
        document.body.classList.toggle('theme-switching', true);
        setTimeout(() => {
            document.body.classList.toggle('theme-switching', false);
        }, 300);
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.showToast(`Switched to ${newTheme} theme`, 'info');
        this.clearDragState();
    }

    setupEventListeners() {
        // Theme toggle
        this.setupThemeToggle();
        
        // File upload
        this.setupFileUpload();
        
        // Post analyzer
        this.setupPostAnalyzer();
        
        // Sentiment analysis
        this.setupSentimentAnalysis();
        
        // Results actions
        this.setupResultActions();
        
        // Global events
        this.setupGlobalEvents();
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTheme();
            });
        }
    }

    setupFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');
        const uploadArea = document.getElementById('uploadArea');

        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.clearDragState();
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.clearDragState();
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files);
                }
            });
        }

        if (uploadArea) {
            uploadArea.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
    }

    setupPostAnalyzer() {
        const platformSelect = document.getElementById('platformSelect');
        const postContent = document.getElementById('postContent');
        const useExtractedText = document.getElementById('useExtractedText');
        const clearPost = document.getElementById('clearPost');

        if (platformSelect) {
            platformSelect.addEventListener('change', () => {
                this.updatePlatformInfo();
                this.analyzePost();
            });
        }

        if (postContent) {
            postContent.addEventListener('input', () => {
                this.analyzePost();
            });
        }

        if (useExtractedText) {
            useExtractedText.addEventListener('click', () => {
                this.useExtractedTextInPost();
            });
        }

        if (clearPost) {
            clearPost.addEventListener('click', () => {
                this.clearPostContent();
            });
        }
    }

    setupSentimentAnalysis() {
        const analyzeSentiment = document.getElementById('analyzeSentiment');
        const analyzeSocialPost = document.getElementById('analyzeSocialPost');
        const analyzeExtracted = document.getElementById('analyzeExtracted');

        if (analyzeSentiment) {
            analyzeSentiment.addEventListener('click', () => {
                this.performSentimentAnalysis();
            });
        }

        if (analyzeSocialPost) {
            analyzeSocialPost.addEventListener('click', () => {
                this.useSocialPostForSentiment();
            });
        }

        if (analyzeExtracted) {
            analyzeExtracted.addEventListener('click', () => {
                this.useExtractedTextForSentiment();
            });
        }
    }

    setupResultActions() {
        const copyBtn = document.getElementById('copyBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const clearBtn = document.getElementById('clearBtn');
        const retryBtn = document.getElementById('retryBtn');

        if (copyBtn) copyBtn.addEventListener('click', () => this.copyText());
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadText());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearResults());
        if (retryBtn) retryBtn.addEventListener('click', () => this.retryProcessing());
    }

    setupGlobalEvents() {
        document.addEventListener('click', (e) => {
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea && !uploadArea.contains(e.target)) {
                this.clearDragState();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearDragState();
            }
        });
    }

    // File Upload Methods (keeping existing functionality)
    clearDragState() {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.remove('drag-over', 'drag-enter', 'drag-leave');
            this.dragCounter = 0;
        }
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter++;
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.add('drag-over');
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter--;
        if (this.dragCounter <= 0) {
            this.clearDragState();
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.clearDragState();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect(files);
        }
    }

    async handleFileSelect(files) {
        if (this.isProcessing) {
            this.showToast('Please wait for current processing to complete', 'info');
            return;
        }

        const validFiles = this.validateFiles(files);
        if (validFiles.length === 0) return;

        this.currentFiles = validFiles;
        this.showProcessingSection();
        await this.processFiles(validFiles);
    }

    validateFiles(files) {
        const validFiles = [];
        const maxSize = 10 * 1024 * 1024;
        const supportedTypes = [
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/bmp', 'image/tiff'
        ];

        Array.from(files).forEach(file => {
            if (!supportedTypes.includes(file.type)) {
                this.showToast(`${file.name}: Unsupported file type`, 'error');
                return;
            }

            if (file.size > maxSize) {
                this.showToast(`${file.name}: File too large (max 10MB)`, 'error');
                return;
            }

            validFiles.push(file);
        });

        if (validFiles.length === 0) {
            this.showToast('No valid files selected', 'error');
        }

        return validFiles;
    }

    async processFiles(files) {
        this.isProcessing = true;
        this.extractedResults = [];
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = Math.round(((i) / files.length) * 100);
                this.updateProgress(progress, `Processing ${file.name}...`);

                let extractedText = '';
                
                if (file.type === 'application/pdf') {
                    extractedText = await this.extractTextFromPDF(file);
                } else if (file.type.startsWith('image/')) {
                    extractedText = await this.extractTextFromImage(file);
                }

                this.extractedResults.push({
                    fileName: file.name,
                    fileType: file.type,
                    text: extractedText,
                    size: file.size
                });

                const finalProgress = Math.round(((i + 1) / files.length) * 100);
                this.updateProgress(finalProgress, finalProgress === 100 ? 'Processing complete!' : `Processing ${files[i + 1]?.name || 'next file'}...`);
            }

            this.showResults();
            this.showToast(`Successfully processed ${files.length} file(s)`, 'success');
        } catch (error) {
            console.error('Processing error:', error);
            this.showError('Failed to process files. Please try again.');
            this.showToast('Processing failed', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    async extractTextFromPDF(file) {
        try {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded');
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `Page ${i}:\n${pageText}\n\n`;
            }

            return fullText.trim() || 'No text found in PDF';
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }

    async extractTextFromImage(file) {
        try {
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js library not loaded');
            }

            const result = await Tesseract.recognize(file, 'eng', {
                logger: (info) => {
                    if (info.status === 'recognizing text') {
                        const progress = Math.round(info.progress * 100);
                        this.updateProgress(progress, `OCR Processing: ${progress}%`);
                    }
                }
            });

            return result.data.text.trim() || 'No text found in image';
        } catch (error) {
            console.error('OCR extraction error:', error);
            throw new Error(`Failed to extract text from image: ${error.message}`);
        }
    }

    // Post Analyzer Methods
    updatePlatformInfo() {
        const platformSelect = document.getElementById('platformSelect');
        const charLimit = document.getElementById('charLimit');
        const hashtagOptimal = document.getElementById('hashtagOptimal');
        
        if (!platformSelect) return;
        
        const platform = this.platforms[platformSelect.value];
        if (charLimit) charLimit.textContent = `/ ${platform.maxChars}`;
        if (hashtagOptimal) hashtagOptimal.textContent = `Optimal: ${platform.optimalHashtags}`;
    }

    analyzePost() {
        const postContent = document.getElementById('postContent');
        const platformSelect = document.getElementById('platformSelect');
        
        if (!postContent || !platformSelect) return;
        
        const text = postContent.value;
        const platform = this.platforms[platformSelect.value];
        
        // Update character count
        this.updateCharacterCount(text, platform);
        
        // Update hashtag count
        this.updateHashtagCount(text, platform);
        
        // Calculate and update score
        this.updatePostScore(text, platform);
    }

    updateCharacterCount(text, platform) {
        const charCount = document.getElementById('charCount');
        const charLimit = document.getElementById('charLimit');
        
        if (charCount) {
            charCount.textContent = text.length;
            charCount.style.color = text.length > platform.maxChars ? 'var(--color-error)' : 'var(--color-text)';
        }
    }

    updateHashtagCount(text, platform) {
        const hashtagCount = document.getElementById('hashtagCount');
        const hashtags = text.match(/#\w+/g) || [];
        
        if (hashtagCount) {
            hashtagCount.textContent = hashtags.length;
            
            const optimal = platform.optimalHashtags.split('-').map(n => parseInt(n));
            const isOptimal = hashtags.length >= optimal[0] && hashtags.length <= optimal[1];
            hashtagCount.style.color = isOptimal ? 'var(--color-success)' : 'var(--color-text)';
        }
    }

    updatePostScore(text, platform) {
        let score = 0;
        const maxScore = 100;
        
        // Length score (30 points)
        const lengthScore = this.calculateLengthScore(text, platform);
        score += lengthScore * 0.3;
        
        // Engagement score (40 points)
        const engagementScore = this.calculateEngagementScore(text);
        score += engagementScore * 0.4;
        
        // Hashtag score (30 points)
        const hashtagScore = this.calculateHashtagScore(text, platform);
        score += hashtagScore * 0.3;
        
        // Update UI
        this.updateScoreDisplay(Math.round(score), lengthScore, engagementScore, hashtagScore);
    }

    calculateLengthScore(text, platform) {
        const length = text.length;
        const optimal = platform.optimalChars.split('-').map(n => parseInt(n));
        
        if (length === 0) return 0;
        if (length < optimal[0] * 0.5) return 30;
        if (length >= optimal[0] && length <= optimal[1]) return 100;
        if (length > platform.maxChars) return 0;
        
        return 70;
    }

    calculateEngagementScore(text) {
        let score = 50; // Base score
        
        // Question marks boost engagement
        const questions = (text.match(/\?/g) || []).length;
        score += Math.min(questions * 10, 20);
        
        // Emotional words
        const words = text.toLowerCase().split(/\s+/);
        const positiveWords = words.filter(word => this.positiveKeywords.includes(word)).length;
        score += Math.min(positiveWords * 5, 20);
        
        // Call to action words
        const ctaWords = ['share', 'comment', 'like', 'follow', 'click', 'visit', 'try'];
        const ctaCount = words.filter(word => ctaWords.includes(word)).length;
        score += Math.min(ctaCount * 10, 10);
        
        return Math.min(score, 100);
    }

    calculateHashtagScore(text, platform) {
        const hashtags = (text.match(/#\w+/g) || []).length;
        const optimal = platform.optimalHashtags.split('-').map(n => parseInt(n));
        
        if (hashtags === 0) return 0;
        if (hashtags >= optimal[0] && hashtags <= optimal[1]) return 100;
        if (hashtags < optimal[0]) return 50;
        
        return Math.max(100 - (hashtags - optimal[1]) * 10, 20);
    }

    updateScoreDisplay(totalScore, lengthScore, engagementScore, hashtagScore) {
        // Update total score
        const scoreValue = document.getElementById('scoreValue');
        const scoreCircle = document.getElementById('postScore');
        
        if (scoreValue) scoreValue.textContent = totalScore;
        if (scoreCircle) {
            const percentage = (totalScore / 100) * 360;
            scoreCircle.style.background = `conic-gradient(var(--color-primary) ${percentage}deg, var(--color-secondary) ${percentage}deg)`;
        }
        
        // Update individual scores
        const lengthFill = document.getElementById('lengthScore');
        const engagementFill = document.getElementById('engagementScore');
        const hashtagFill = document.getElementById('hashtagScore');
        
        if (lengthFill) lengthFill.style.width = `${lengthScore}%`;
        if (engagementFill) engagementFill.style.width = `${engagementScore}%`;
        if (hashtagFill) hashtagFill.style.width = `${hashtagScore}%`;
    }

    useExtractedTextInPost() {
        if (this.extractedResults.length === 0) {
            this.showToast('No extracted text available. Upload documents first.', 'info');
            return;
        }
        
        const postContent = document.getElementById('postContent');
        if (postContent) {
            const combinedText = this.extractedResults.map(result => result.text).join('\n\n');
            postContent.value = combinedText.substring(0, 2000); // Limit for social media
            this.analyzePost();
            this.showToast('Extracted text added to post analyzer', 'success');
        }
    }

    clearPostContent() {
        const postContent = document.getElementById('postContent');
        if (postContent) {
            postContent.value = '';
            
            // Reset all metrics to 0
            const charCount = document.getElementById('charCount');
            const hashtagCount = document.getElementById('hashtagCount');
            const scoreValue = document.getElementById('scoreValue');
            const scoreCircle = document.getElementById('postScore');
            
            if (charCount) {
                charCount.textContent = '0';
                charCount.style.color = 'var(--color-text)';
            }
            
            if (hashtagCount) {
                hashtagCount.textContent = '0';
                hashtagCount.style.color = 'var(--color-text)';
            }
            
            if (scoreValue) scoreValue.textContent = '0';
            if (scoreCircle) {
                scoreCircle.style.background = `conic-gradient(var(--color-primary) 0deg, var(--color-secondary) 0deg)`;
            }
            
            // Reset score bars
            const lengthFill = document.getElementById('lengthScore');
            const engagementFill = document.getElementById('engagementScore');
            const hashtagFill = document.getElementById('hashtagScore');
            
            if (lengthFill) lengthFill.style.width = '0%';
            if (engagementFill) engagementFill.style.width = '0%';
            if (hashtagFill) hashtagFill.style.width = '0%';
            
            this.showToast('Post content cleared', 'info');
        }
    }

    // Sentiment Analysis Methods
    initializeCharts() {
        setTimeout(() => {
            this.createSentimentGauge();
            this.createEmotionChart();
            this.createSentimentTimeline();
        }, 100);
    }

    createSentimentGauge() {
        const ctx = document.getElementById('sentimentGauge');
        if (!ctx) return;

        this.sentimentCharts.gauge = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [50, 50],
                    backgroundColor: ['#1FB8CD', '#ECEBD5'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    createEmotionChart() {
        const ctx = document.getElementById('emotionChart');
        if (!ctx) return;

        this.sentimentCharts.emotions = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: this.emotions.map(e => e.name),
                datasets: [{
                    label: 'Emotion Intensity',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(31, 184, 198, 0.2)',
                    borderColor: '#1FB8CD',
                    borderWidth: 2,
                    pointBackgroundColor: '#1FB8CD',
                    pointBorderColor: '#1FB8CD',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: 'rgba(98, 108, 113, 0.7)'
                        },
                        grid: {
                            color: 'rgba(94, 82, 64, 0.2)'
                        },
                        angleLines: {
                            color: 'rgba(94, 82, 64, 0.2)'
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    createSentimentTimeline() {
        const ctx = document.getElementById('sentimentTimeline');
        if (!ctx) return;

        this.sentimentCharts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Sentiment',
                    data: [],
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 198, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        min: -1,
                        max: 1,
                        ticks: {
                            color: 'rgba(98, 108, 113, 0.7)'
                        },
                        grid: {
                            color: 'rgba(94, 82, 64, 0.2)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(98, 108, 113, 0.7)'
                        },
                        grid: {
                            color: 'rgba(94, 82, 64, 0.2)'
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    updateChartsTheme() {
        // Force charts to update their colors based on current theme
        if (this.sentimentCharts.emotions) {
            this.sentimentCharts.emotions.update();
        }

        if (this.sentimentCharts.timeline) {
            this.sentimentCharts.timeline.update();
        }
        
        if (this.sentimentCharts.gauge) {
            this.sentimentCharts.gauge.update();
        }
    }

    performSentimentAnalysis() {
        const sentimentText = document.getElementById('sentimentText');
        if (!sentimentText || !sentimentText.value.trim()) {
            this.showToast('Please enter text for analysis', 'info');
            return;
        }

        const text = sentimentText.value.trim();
        this.analyzeSentiment(text);
        this.showToast('Sentiment analysis complete', 'success');
    }

    analyzeSentiment(text) {
        // Mock sentiment analysis - in a real app, this would call an AI service
        const sentimentData = this.mockSentimentAnalysis(text);
        this.currentSentimentData = sentimentData;
        
        this.updateSentimentDisplay(sentimentData);
        this.updateEmotionChart(sentimentData.emotions);
        this.updateSentimentTimeline(text, sentimentData.sentiment);
        this.displayKeyPhrases(text, sentimentData);
        this.generateSentimentRecommendations(sentimentData);
    }

    mockSentimentAnalysis(text) {
        const words = text.toLowerCase().split(/\s+/);
        
        // Calculate basic sentiment
        let sentiment = 0;
        let positiveCount = 0;
        let negativeCount = 0;
        
        words.forEach(word => {
            if (this.positiveKeywords.includes(word)) {
                sentiment += 0.3;
                positiveCount++;
            }
            if (this.negativeKeywords.includes(word)) {
                sentiment -= 0.3;
                negativeCount++;
            }
        });
        
        // Normalize sentiment
        sentiment = Math.max(-1, Math.min(1, sentiment));
        
        // Mock emotion scores
        const emotions = {
            joy: Math.max(0, sentiment * 80 + Math.random() * 20),
            anger: Math.max(0, -sentiment * 60 + Math.random() * 20),
            fear: Math.random() * 30 + (sentiment < -0.3 ? 20 : 0),
            sadness: Math.max(0, -sentiment * 70 + Math.random() * 15),
            surprise: Math.random() * 40,
            disgust: Math.max(0, -sentiment * 40 + Math.random() * 10)
        };
        
        // Calculate confidence
        const confidence = Math.min(95, 60 + (positiveCount + negativeCount) * 5);
        
        return {
            sentiment,
            confidence,
            emotions,
            wordCount: words.length,
            positiveWords: positiveCount,
            negativeWords: negativeCount
        };
    }

    updateSentimentDisplay(data) {
        const sentimentLabel = document.getElementById('sentimentLabel');
        const sentimentValue = document.getElementById('sentimentValue');
        const confidenceValue = document.getElementById('confidenceValue');
        
        // Determine sentiment label
        let label = 'Neutral';
        if (data.sentiment > 0.6) label = 'Very Positive';
        else if (data.sentiment > 0.2) label = 'Positive';
        else if (data.sentiment < -0.6) label = 'Very Negative';
        else if (data.sentiment < -0.2) label = 'Negative';
        
        if (sentimentLabel) sentimentLabel.textContent = label;
        if (sentimentValue) sentimentValue.textContent = data.sentiment.toFixed(2);
        if (confidenceValue) confidenceValue.textContent = `${Math.round(data.confidence)}%`;
        
        // Update gauge
        if (this.sentimentCharts.gauge) {
            const normalized = (data.sentiment + 1) / 2; // Convert -1,1 to 0,1
            const percentage = normalized * 100;
            this.sentimentCharts.gauge.data.datasets[0].data = [percentage, 100 - percentage];
            this.sentimentCharts.gauge.update();
        }
    }

    updateEmotionChart(emotions) {
        if (this.sentimentCharts.emotions) {
            const values = Object.values(emotions);
            this.sentimentCharts.emotions.data.datasets[0].data = values;
            this.sentimentCharts.emotions.update();
        }
    }

    updateSentimentTimeline(text, sentiment) {
        if (!this.sentimentCharts.timeline) return;
        
        // Analyze sentiment by sentences
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const labels = sentences.map((_, i) => `S${i + 1}`);
        const sentiments = sentences.map(sentence => {
            const sentimentData = this.mockSentimentAnalysis(sentence);
            return sentimentData.sentiment;
        });
        
        this.sentimentCharts.timeline.data.labels = labels;
        this.sentimentCharts.timeline.data.datasets[0].data = sentiments;
        this.sentimentCharts.timeline.update();
    }

    displayKeyPhrases(text, sentimentData) {
        const container = document.getElementById('keyPhrases');
        if (!container) return;
        
        container.innerHTML = '';
        
        const words = text.toLowerCase().split(/\s+/);
        const phrases = [];
        
        // Find positive phrases
        words.forEach((word, index) => {
            if (this.positiveKeywords.includes(word)) {
                phrases.push({ text: word, type: 'positive' });
            } else if (this.negativeKeywords.includes(word)) {
                phrases.push({ text: word, type: 'negative' });
            }
        });
        
        // Add some context phrases
        if (sentimentData.sentiment > 0.3) {
            phrases.push({ text: 'overall positive tone', type: 'positive' });
        }
        if (sentimentData.sentiment < -0.3) {
            phrases.push({ text: 'overall negative tone', type: 'negative' });
        }
        
        phrases.forEach(phrase => {
            const span = document.createElement('span');
            span.className = `key-phrase key-phrase--${phrase.type}`;
            span.textContent = phrase.text;
            container.appendChild(span);
        });
        
        if (phrases.length === 0) {
            container.innerHTML = '<p class="no-analysis">No significant emotional phrases detected</p>';
        }
    }

    generateSentimentRecommendations(data) {
        const container = document.getElementById('sentimentRecommendations');
        if (!container) return;
        
        container.innerHTML = '';
        
        const recommendations = [];
        
        if (data.sentiment < -0.2) {
            recommendations.push({
                title: 'Consider More Positive Language',
                text: 'Your content has a negative tone. Try adding more positive words to improve engagement.'
            });
        }
        
        if (data.emotions.anger > 50) {
            recommendations.push({
                title: 'Reduce Aggressive Tone',
                text: 'High anger detected. Consider softening the language for better audience reception.'
            });
        }
        
        if (data.sentiment > 0.5 && data.emotions.joy > 60) {
            recommendations.push({
                title: 'Great Positive Energy!',
                text: 'Your content has excellent positive sentiment. This should perform well on social media.'
            });
        }
        
        if (data.confidence < 70) {
            recommendations.push({
                title: 'Mixed Emotional Signals',
                text: 'Your content has mixed sentiment. Consider clarifying your main message.'
            });
        }
        
        recommendations.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'recommendation';
            div.innerHTML = `
                <div class="recommendation-title">${rec.title}</div>
                <p class="recommendation-text">${rec.text}</p>
            `;
            container.appendChild(div);
        });
        
        if (recommendations.length === 0) {
            container.innerHTML = '<p class="no-analysis">Your content has good emotional balance</p>';
        }
    }

    useSocialPostForSentiment() {
        const postContent = document.getElementById('postContent');
        const sentimentText = document.getElementById('sentimentText');
        
        if (!postContent || !postContent.value.trim()) {
            this.showToast('No social media post content available', 'info');
            return;
        }
        
        if (sentimentText) {
            sentimentText.value = postContent.value;
            this.showToast('Social media post loaded for sentiment analysis', 'success');
        }
    }

    useExtractedTextForSentiment() {
        if (this.extractedResults.length === 0) {
            this.showToast('No extracted text available. Upload documents first.', 'info');
            return;
        }
        
        const sentimentText = document.getElementById('sentimentText');
        if (sentimentText) {
            const combinedText = this.extractedResults.map(result => result.text).join('\n\n');
            sentimentText.value = combinedText;
            this.showToast('Extracted text loaded for sentiment analysis', 'success');
        }
    }

    // AI Suggestions
    renderAISuggestions() {
        const suggestionsGrid = document.getElementById('suggestionsGrid');
        if (!suggestionsGrid) return;
        
        const suggestions = [
            {
                id: 1,
                type: 'document',
                priority: 'high',
                title: 'Extract Key Insights from Documents',
                description: 'Upload documents to extract text and analyze sentiment for content creation',
                impact: 'Save 3+ hours per week',
                actionable: 'Upload your latest reports for instant text extraction'
            },
            {
                id: 2,
                type: 'sentiment',
                priority: 'high',
                title: 'Optimize Content Sentiment',
                description: 'Adjust emotional tone based on platform and audience expectations',
                impact: '30% better engagement',
                actionable: 'Use more positive language in your posts'
            },
            {
                id: 3,
                type: 'content',
                priority: 'medium',
                title: 'Balance Emotional Content',
                description: 'Mix rational and emotional elements for better engagement',
                impact: '25% increase in shares',
                actionable: 'Add emotional storytelling to factual content'
            },
            {
                id: 4,
                type: 'platform',
                priority: 'medium',
                title: 'Platform-Specific Sentiment',
                description: 'Adapt sentiment to match platform expectations and audience behavior',
                impact: '20% better platform performance',
                actionable: 'Use professional tone for LinkedIn, casual for Instagram'
            }
        ];
        
        suggestionsGrid.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            
            card.innerHTML = `
                <div class="suggestion-header">
                    <h3 class="suggestion-title">${suggestion.title}</h3>
                    <span class="suggestion-priority suggestion-priority--${suggestion.priority}">${suggestion.priority}</span>
                </div>
                <p class="suggestion-description">${suggestion.description}</p>
                <div class="suggestion-metrics">
                    <span class="suggestion-impact">${suggestion.impact}</span>
                </div>
                <div class="suggestion-action">${suggestion.actionable}</div>
            `;
            
            suggestionsGrid.appendChild(card);
        });
    }

    // UI State Management (keeping existing methods)
    showProcessingSection() {
        this.hideAllSections();
        const processingSection = document.getElementById('processingSection');
        if (processingSection) {
            processingSection.classList.remove('hidden');
            processingSection.classList.add('fade-in');
        }
        this.updateProgress(0, 'Preparing to process files...');
    }

    showResults() {
        this.hideAllSections();
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
            resultsSection.classList.add('fade-in');
        }
        this.displayResults();
    }

    showError(message) {
        this.hideAllSections();
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorSection) {
            errorSection.classList.remove('hidden');
            errorSection.classList.add('fade-in');
        }
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }

    hideAllSections() {
        const sections = ['processingSection', 'resultsSection', 'errorSection'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('hidden');
                section.classList.remove('fade-in');
            }
        });
    }

    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const processingDescription = document.getElementById('processingDescription');
        
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `${percentage}%`;
        if (processingDescription) processingDescription.textContent = message;
    }

    displayResults() {
        const container = document.getElementById('extractedText');
        if (!container) return;
        
        container.innerHTML = '';

        if (this.extractedResults.length === 0) {
            container.innerHTML = '<p class="no-results">No text extracted from files.</p>';
            return;
        }

        this.extractedResults.forEach((result, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'file-result fade-in';
            
            resultDiv.innerHTML = `
                <div class="file-result-header">
                    <div>
                        <span class="file-name">${this.escapeHtml(result.fileName)}</span>
                        <span class="file-type">${this.getFileTypeLabel(result.fileType)}</span>
                    </div>
                    <div class="file-size">${this.formatFileSize(result.size)}</div>
                </div>
                <div class="file-text">${this.escapeHtml(result.text)}</div>
            `;
            
            container.appendChild(resultDiv);
        });
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getFileTypeLabel(mimeType) {
        if (mimeType === 'application/pdf') return 'PDF';
        if (mimeType.startsWith('image/')) return 'IMAGE';
        return 'FILE';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Action Handlers
    async copyText() {
        if (this.extractedResults.length === 0) {
            this.showToast('No text to copy', 'info');
            return;
        }

        const allText = this.extractedResults.map(result => 
            `${result.fileName}:\n${result.text}`
        ).join('\n\n---\n\n');

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(allText);
                this.showToast('Text copied to clipboard', 'success');
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = allText;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    this.showToast('Text copied to clipboard', 'success');
                } else {
                    this.showToast('Failed to copy text', 'error');
                }
            }
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('Failed to copy text', 'error');
        }
    }

    downloadText() {
        if (this.extractedResults.length === 0) {
            this.showToast('No text to download', 'info');
            return;
        }

        const allText = this.extractedResults.map(result => 
            `${result.fileName}:\n${'='.repeat(result.fileName.length + 1)}\n${result.text}`
        ).join('\n\n');

        try {
            const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `extracted-text-${new Date().toISOString().split('T')[0]}.txt`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Text file downloaded', 'success');
        } catch (error) {
            console.error('Download failed:', error);
            this.showToast('Failed to download text', 'error');
        }
    }

    clearResults() {
        this.extractedResults = [];
        this.currentFiles = [];
        this.hideAllSections();
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }
        this.clearDragState();
        this.showToast('Results cleared', 'info');
    }

    retryProcessing() {
        if (this.currentFiles.length > 0) {
            this.processFiles(this.currentFiles);
        } else {
            this.hideAllSections();
            this.showToast('No files to retry', 'info');
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        toast.innerHTML = `
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close notification">&times;</button>
        `;

        container.appendChild(toast);

        const removeToast = () => {
            if (toast.parentNode) {
                toast.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    if (toast.parentNode) {
                        container.removeChild(toast);
                    }
                }, 300);
            }
        };

        const timeoutId = setTimeout(removeToast, 4000);

        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearTimeout(timeoutId);
                removeToast();
            });
        }

        toast.addEventListener('click', () => {
            clearTimeout(timeoutId);
            removeToast();
        });
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    window.contentAnalyzer = new SocialMediaContentAnalyzer();
    
    // Global error handling
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        if (window.contentAnalyzer) {
            window.contentAnalyzer.showToast('An unexpected error occurred', 'error');
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        if (window.contentAnalyzer) {
            window.contentAnalyzer.showToast('An unexpected error occurred', 'error');
        }
    });
});

// Prevent default drag behaviors on document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
