class QuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalQuestions = 0;
        this.isAnswered = false;
        this.autoProgressTimer = null;
        this.dataSource = 'unknown';
        this.loadError = null;
        // 安全なLocalStorage読み込み
        this.history = SafeStorage.getItem('quizHistory', []);
        
        // 習熟度システム用データ
        this.masteryData = SafeStorage.getItem('masteryData', {});
        this.categoryStats = SafeStorage.getItem('categoryStats', {});
        
        // 各問題の習熟度 (0-10段階)
        this.questionMastery = SafeStorage.getItem('questionMastery', {});
        
        // 回答履歴 (エビングハウス曲線用)
        this.answerHistory = SafeStorage.getItem('answerHistory', {});
        
        // 習熟度設定（シンプル）
        this.masteryConfig = SafeStorage.getItem('masteryConfig', {
            // 時間減衰設定
            decayDays: 14,          // この日数後から減衰開始
            reviewDays: 7,          // この日数経過で復習推奨
            
            // 復習設定
            reviewMasteryThreshold: 7, // この値未満は復習対象
        });
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadHistory();
        this.initializeCharacterMessages();
        
        // テスト用：初期表示
        if (this.categorySummary) {
            this.categorySummary.style.display = 'block';
            this.majorCategoryTitle.textContent = '色彩検定2級 (全112問)';
            this.minorCategorySummary.textContent = '7カテゴリー • 基礎知識46問 • 配色9問 • 効果13問 • 光12問 • 応用16問 • 用語4問 • 心理12問';
        }
    }
    
    initializeElements() {
        this.questionText = document.getElementById('question-text');
        this.questionNumber = document.getElementById('question-number');
        this.optionButtons = [
            document.getElementById('option-1'),
            document.getElementById('option-2'),
            document.getElementById('option-3'),
            document.getElementById('option-4')
        ];
        this.feedback = document.getElementById('feedback');
        this.startBtn = document.getElementById('start-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.progressFill = document.getElementById('progress-fill');
        this.correctCount = document.getElementById('correct-count');
        this.totalCount = document.getElementById('total-count');
        this.accuracy = document.getElementById('accuracy');
        this.resultsSection = document.getElementById('results-section');
        this.finalCorrect = document.getElementById('final-correct');
        this.finalTotal = document.getElementById('final-total');
        this.finalAccuracy = document.getElementById('final-accuracy');
        this.grade = document.getElementById('grade');
        this.historyList = document.getElementById('history-list');
        this.clearHistoryBtn = document.getElementById('clear-history');
        
        // 応援キャラクター関連の要素
        this.characterSection = document.getElementById('character-section');
        this.characterImg = document.getElementById('character-img');
        this.characterText = document.getElementById('character-text');
        this.resultCharacterImg = document.getElementById('result-character-img');
        this.resultCharacterText = document.getElementById('result-character-text');
        
        // 自動進行とデータソース表示用の要素
        this.autoProgressCheckbox = document.getElementById('auto-progress');
        this.sourceIndicator = document.getElementById('source-indicator');
        this.historyDots = document.getElementById('history-dots');
        this.questionCountSelect = document.getElementById('question-count');
        this.quizModeRadios = document.querySelectorAll('input[name="quiz-mode"]');
        this.majorCategory = document.getElementById('major-category');
        this.minorCategory = document.getElementById('minor-category');
        this.categorySummary = document.getElementById('category-summary');
        this.majorCategoryTitle = document.getElementById('major-category-title');
        this.minorCategorySummary = document.getElementById('minor-category-summary');
        
        // 画像管理
        this.imageCache = new Map();
        this.supportedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'];
        this.animationPatterns = ['correct', 'bounce', 'spin', 'pulse', 'zoom'];
        this.encourageAnimations = ['encourage', 'shake'];
        this.currentAnimationIndex = 0;
        this.skipAnimations = false;
        this.answerHistory = [];
        this.selectedQuestionCount = 5;
        this.allQuestions = [];
        
        // 新しいフィルター要素
        this.masteryFilter = document.getElementById('mastery-filter');
        this.periodFilter = document.getElementById('period-filter');
        this.masteryLevelSelect = document.getElementById('mastery-level-select');
        this.periodSelect = document.getElementById('period-select');
        this.customMasteryRange = document.getElementById('custom-mastery-range');
        this.masteryMin = document.getElementById('mastery-min');
        this.masteryMax = document.getElementById('mastery-max');
        
        // 期間範囲選択要素
        this.periodTypeSelect = document.getElementById('period-type-select');
        this.periodWithin = document.getElementById('period-within');
        this.periodRange = document.getElementById('period-range');
        this.periodStart = document.getElementById('period-start');
        this.periodEnd = document.getElementById('period-end');
        this.categories = null;
        this.initializeImages();
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startQuiz());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.restartBtn.addEventListener('click', () => this.restartQuiz());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // 統計ボタン
        const categoryStatsBtn = document.getElementById('category-stats-btn');
        const masteryStatsBtn = document.getElementById('mastery-stats-btn');
        
        if (categoryStatsBtn) {
            categoryStatsBtn.addEventListener('click', () => this.showCategoryStats());
        }
        
        if (masteryStatsBtn) {
            masteryStatsBtn.addEventListener('click', () => this.showMasteryStats());
        }
        
        this.optionButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => this.selectOption(index));
        });
        
        // エラー表示をクリックした時の詳細表示
        this.sourceIndicator.addEventListener('click', () => {
            if (this.loadError) {
                alert(`JSONファイル読み込みエラーの詳細:\n\n${this.loadError}`);
            }
        });
        
        // キャラクター形状変更
        const shapeSelect = document.getElementById('character-shape');
        if (shapeSelect) {
            shapeSelect.addEventListener('change', (e) => {
                this.setImageShape(e.target.value);
            });
        }
        
        // 統計モーダル
        const statsModal = document.getElementById('stats-modal');
        const closeStatsBtn = document.getElementById('close-stats');
        
        if (statsModal && closeStatsBtn) {
            closeStatsBtn.addEventListener('click', () => {
                statsModal.style.display = 'none';
            });
            
            // モーダル背景クリックで閉じる
            statsModal.addEventListener('click', (e) => {
                if (e.target === statsModal) {
                    statsModal.style.display = 'none';
                }
            });
        }

        // マニュアルモーダル
        const manualBtn = document.getElementById('manual-btn');
        const manualModal = document.getElementById('manual-modal');
        const closeManualBtn = document.getElementById('close-manual');
        
        if (manualBtn && manualModal && closeManualBtn) {
            manualBtn.addEventListener('click', () => {
                manualModal.style.display = 'flex';
            });
            
            closeManualBtn.addEventListener('click', () => {
                manualModal.style.display = 'none';
            });
            
            // モーダル背景クリックで閉じる
            manualModal.addEventListener('click', (e) => {
                if (e.target === manualModal) {
                    manualModal.style.display = 'none';
                }
            });
        }
        
        // エフェクト短縮設定
        const skipAnimationsCheckbox = document.getElementById('skip-animations');
        if (skipAnimationsCheckbox) {
            skipAnimationsCheckbox.addEventListener('change', (e) => {
                this.skipAnimations = e.target.checked;
            });
        }
        
        // 問題数選択
        if (this.questionCountSelect) {
            this.questionCountSelect.addEventListener('change', (e) => {
                this.selectedQuestionCount = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
            });
        }
        
        // クイズモード選択時のフィルター表示切り替え
        this.quizModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleFilterVisibility(e.target.value);
            });
        });
        
        // 習熟度レベル選択
        if (this.masteryLevelSelect) {
            this.masteryLevelSelect.addEventListener('change', (e) => {
                this.toggleCustomMasteryRange(e.target.value);
            });
        }
        
        // カスタム習熟度範囲の入力値変更
        if (this.masteryMin) {
            this.masteryMin.addEventListener('change', (e) => {
                const max = parseInt(this.masteryMax.value);
                if (parseInt(e.target.value) > max) {
                    this.masteryMax.value = e.target.value;
                }
            });
        }
        
        if (this.masteryMax) {
            this.masteryMax.addEventListener('change', (e) => {
                const min = parseInt(this.masteryMin.value);
                if (parseInt(e.target.value) < min) {
                    this.masteryMin.value = e.target.value;
                }
            });
        }
        
        // 期間タイプ選択
        if (this.periodTypeSelect) {
            this.periodTypeSelect.addEventListener('change', (e) => {
                this.togglePeriodType(e.target.value);
            });
        }
        
        // 期間範囲の入力値変更
        if (this.periodStart) {
            this.periodStart.addEventListener('change', (e) => {
                const end = parseInt(this.periodEnd.value);
                if (parseInt(e.target.value) < end) {
                    this.periodEnd.value = e.target.value;
                }
            });
        }
        
        if (this.periodEnd) {
            this.periodEnd.addEventListener('change', (e) => {
                const start = parseInt(this.periodStart.value);
                if (parseInt(e.target.value) > start) {
                    this.periodStart.value = e.target.value;
                }
            });
        }
    }
    
    // フィルター表示の切り替え
    toggleFilterVisibility(mode) {
        if (this.masteryFilter && this.periodFilter) {
            this.masteryFilter.style.display = mode === 'review-mastery' ? 'block' : 'none';
            this.periodFilter.style.display = mode === 'review-recent-incorrect' ? 'block' : 'none';
        }
    }
    
    // カスタム習熟度範囲の表示切り替え
    toggleCustomMasteryRange(value) {
        if (this.customMasteryRange) {
            this.customMasteryRange.style.display = value === 'custom' ? 'block' : 'none';
        }
    }
    
    // 期間タイプの表示切り替え
    togglePeriodType(type) {
        if (this.periodWithin && this.periodRange) {
            this.periodWithin.style.display = type === 'within' ? 'block' : 'none';
            this.periodRange.style.display = type === 'range' ? 'block' : 'none';
        }
    }
    
    // 問題からユニークなハッシュを生成
    generateQuestionHash(question) {
        // 問題文と選択肢を結合してハッシュ化
        const content = question.question + question.options.join('');
        return this.simpleHash(content);
    }
    
    // シンプルなハッシュ関数
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit整数に変換
        }
        return Math.abs(hash).toString(36); // 36進数で短縮
    }
    
    // 問題のユニークキーを取得（ハッシュ or インデックス）
    getQuestionKey(question, index) {
        // ハッシュがある場合はハッシュを使用、なければインデックス
        if (question.id) {
            return `id_${question.id}`;
        }
        const hash = this.generateQuestionHash(question);
        return `h_${hash}`;
    }
    
    async loadQuestions() {
        try {
            // 複数の方法でJSONファイルの読み込みを試行
            await this.tryLoadJSON();
        } catch (error) {
            // フォールバック：直接問題データを含める
            this.loadError = `${error.message}\n\n対処法:\n1. ローカルサーバーを使用する (Live Server拡張機能など)\n2. HTTPSサーバーでファイルを配信する\n3. 内蔵データで練習する（現在表示中）`;
            console.warn('JSONファイルの読み込みに失敗しました。内蔵データを使用します:', error);
            this.loadBuiltInQuestions();
        }
    }
    
    async tryLoadJSON() {
        // 方法1: questions.js（JavaScriptファイル）から読み込み - file://でも動作
        if (window.questionData && window.questionData.questions) {
            console.log('JavaScriptファイルから読み込み中...');
            this.allQuestions = window.questionData.questions;
            this.categories = window.questionData.categories || null;
            
            if (this.allQuestions.length === 0) {
                throw new Error('questions.jsに問題が見つかりません');
            }
            
            console.log(`JavaScriptファイルから${this.allQuestions.length}問読み込み成功`);
            this.dataSource = 'javascript';
            this.updateSourceIndicator();
            this.updateInitialCategoryDisplay();
            this.selectRandomQuestions();
            this.showQuestion();
            return;
        }
        
        // 方法2: fetchでJSONファイルを試行（HTTPサーバー必要）
        try {
            console.log('JSONファイルの読み込みを試行中...');
            const response = await fetch('./questions.json');
            console.log('fetch応答:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('JSON解析成功:', data);
            this.allQuestions = data.questions;
            
            if (this.allQuestions.length === 0) {
                throw new Error('JSONファイルに問題が見つかりません');
            }
            
            console.log(`JSONファイルから${this.allQuestions.length}問読み込み成功`);
            this.dataSource = 'json';
            this.updateSourceIndicator();
            this.updateInitialCategoryDisplay();
            this.selectRandomQuestions();
            this.showQuestion();
            return;
        } catch (fetchError) {
            console.error('fetch方式失敗:', fetchError);
            console.error('エラー詳細:', fetchError.message);
        }
        
        // 方法3: XMLHttpRequestを試行
        try {
            console.log('XMLHttpRequestでJSONファイルを試行中...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', 'questions.json', false);
            xhr.send();
            
            console.log('XMLHttpRequest応答:', xhr.status, xhr.statusText);
            
            if (xhr.status === 200 || xhr.status === 0) {
                const data = JSON.parse(xhr.responseText);
                console.log('XMLHttpRequest JSON解析成功:', data);
                this.allQuestions = data.questions;
                
                if (this.allQuestions.length === 0) {
                    throw new Error('JSONファイルに問題が見つかりません');
                }
                
                console.log(`XMLHttpRequestで${this.allQuestions.length}問読み込み成功`);
                this.dataSource = 'json';
                this.updateSourceIndicator();
                this.updateInitialCategoryDisplay();
                this.selectRandomQuestions();
                this.showQuestion();
                return;
            } else {
                throw new Error(`HTTPステータス: ${xhr.status}`);
            }
        } catch (xhrError) {
            console.error('XMLHttpRequest方式失敗:', xhrError);
            console.error('XHRエラー詳細:', xhrError.message);
        }
        
        // 全ての方法が失敗した場合
        throw new Error('ローカルファイルアクセス制限のため、JSONファイルを読み込めません。ブラウザのセキュリティ制限によるものです。');
    }
    
    loadBuiltInQuestions() {
        // 内蔵問題データ（一部抜粋）
        this.questions = [
            {
                "question": "色の三属性とは、色相、明度、ともう一つは何ですか？",
                "options": ["純度", "彩度", "濃度", "透明度"],
                "correctAnswer": 1
            },
            {
                "question": "PCCSにおいて、色相を表す記号は何ですか？",
                "options": ["H", "V", "C", "S"],
                "correctAnswer": 0
            },
            {
                "question": "明度が最も高い色はどれですか？",
                "options": ["黒", "白", "赤", "青"],
                "correctAnswer": 1
            },
            {
                "question": "彩度が最も低い色はどれですか？",
                "options": ["赤", "青", "黄", "グレー"],
                "correctAnswer": 3
            },
            {
                "question": "色相環において、赤の補色はどれですか？",
                "options": ["青", "緑", "黄", "紫"],
                "correctAnswer": 1
            },
            {
                "question": "暖色の代表的な色はどれですか？",
                "options": ["青", "緑", "赤", "紫"],
                "correctAnswer": 2
            },
            {
                "question": "寒色の代表的な色はどれですか？",
                "options": ["赤", "橙", "青", "黄"],
                "correctAnswer": 2
            },
            {
                "question": "無彩色とは何ですか？",
                "options": ["赤系の色", "青系の色", "白・黒・グレーの色", "暖色"],
                "correctAnswer": 2
            },
            {
                "question": "有彩色とは何ですか？",
                "options": ["白・黒・グレー", "色相を持つ色", "明るい色", "暗い色"],
                "correctAnswer": 1
            },
            {
                "question": "色相環で隣り合う色同士の配色を何といいますか？",
                "options": ["補色配色", "類似色配色", "対比色配色", "三色配色"],
                "correctAnswer": 1
            }
        ];
        
        this.allQuestions = this.questions;
        this.dataSource = 'builtin';
        this.updateSourceIndicator();
        this.updateInitialCategoryDisplay();
        this.selectRandomQuestions();
        this.showQuestion();
    }
    
    // クイズモードに応じて問題を選択
    selectRandomQuestions() {
        let targetQuestions = [];
        
        // 選択されたクイズモードを取得
        const selectedMode = document.querySelector('input[name="quiz-mode"]:checked');
        if (selectedMode) {
            const mode = selectedMode.value;
            if (mode === 'review-mastery') {
                targetQuestions = this.getMasteryFilteredQuestions();
            } else if (mode === 'review-recent-incorrect') {
                targetQuestions = this.getPeriodFilteredQuestions();
            } else {
                targetQuestions = [...this.allQuestions];
            }
        } else {
            targetQuestions = [...this.allQuestions];
        }
        
        // 問題が見つからない場合の処理
        if (targetQuestions.length === 0) {
            alert('指定した条件に合う問題が見つかりません。全問題から選択します。');
            targetQuestions = [...this.allQuestions];
        }
        
        // Fisher-Yatesアルゴリズムでシャッフル
        const shuffledQuestions = [...targetQuestions];
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
        }
        
        // 指定された数の問題を選択
        const selectedCount = this.questionCountSelect.value;
        if (selectedCount === 'all') {
            this.questions = shuffledQuestions;
        } else {
            const count = parseInt(selectedCount);
            this.questions = shuffledQuestions.slice(0, Math.min(count, shuffledQuestions.length));
        }
        
        this.totalQuestions = this.questions.length;
    }
    
    async startQuiz() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.isAnswered = false;
        this.answerHistory = [];
        this.startBtn.style.display = 'none';
        this.nextBtn.style.display = 'none';
        this.restartBtn.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.feedback.textContent = '';
        this.feedback.className = 'feedback';
        // ヘッダー部分のカテゴリー情報を非表示にする
        if (this.categorySummary) {
            this.categorySummary.style.display = 'none';
        }
        this.updateStats();
        this.updateAnswerHistory();
        // クイズ開始時のキャラクターメッセージ
        this.showCharacterMessage(this.getRandomMessage('start'));
        // 選択されたモードに応じて問題を設定
        const selectedMode = document.querySelector('input[name="quiz-mode"]:checked').value;
        await this.setupQuestionsByMode(selectedMode);
        
        // 問題を読み込んでからクイズを開始
        await this.loadQuestions();
    }
    
    // 復習モード別の問題設定
    async setupQuestionsByMode(mode) {
        // データが読み込まれるまで待機
        if (!this.allQuestions || this.allQuestions.length === 0) {
            await this.loadQuestions();
        }
        
        let targetQuestions = [];
        
        switch (mode) {
            case 'review-low-mastery':
                targetQuestions = this.getLowMasteryQuestions();
                break;
            case 'review-incorrect':
                targetQuestions = this.getIncorrectQuestions();
                break;
            case 'review-recent-incorrect':
                targetQuestions = this.getRecentIncorrectQuestions();
                break;
            case 'normal':
            default:
                targetQuestions = [...this.allQuestions];
                break;
        }
        
        if (targetQuestions.length === 0) {
            alert('選択したモードに該当する問題がありません。通常モードで開始します。');
            targetQuestions = [...this.allQuestions];
        }
        
        // 問題をシャッフル
        this.shuffleArray(targetQuestions);
        
        // 選択された問題数に制限
        const selectedCount = this.questionCountSelect.value;
        if (selectedCount !== 'all') {
            const count = parseInt(selectedCount);
            targetQuestions = targetQuestions.slice(0, count);
        }
        
        this.questions = targetQuestions;
    }
    
    // 習熟度が低い問題を取得（習熟度5以下）
    getLowMasteryQuestions() {
        const lowMasteryQuestions = [];
        
        for (let i = 0; i < this.allQuestions.length; i++) {
            const questionKey = `q_${i}`;
            const mastery = this.questionMastery[questionKey] || 0;
            
            if (mastery <= 5) {
                lowMasteryQuestions.push(this.allQuestions[i]);
            }
        }
        
        // 習熟度の低い順でソート
        lowMasteryQuestions.sort((a, b) => {
            const indexA = this.allQuestions.indexOf(a);
            const indexB = this.allQuestions.indexOf(b);
            const masteryA = this.questionMastery[`q_${indexA}`] || 0;
            const masteryB = this.questionMastery[`q_${indexB}`] || 0;
            return masteryA - masteryB;
        });
        
        return lowMasteryQuestions;
    }
    
    // 過去に間違えた問題を取得
    getIncorrectQuestions() {
        const incorrectQuestions = [];
        
        for (let i = 0; i < this.allQuestions.length; i++) {
            const questionKey = `q_${i}`;
            const records = this.answerHistory[questionKey] || [];
            
            // 過去に間違えたことがある問題
            const hasIncorrect = records.some(record => !record.correct);
            if (hasIncorrect) {
                incorrectQuestions.push(this.allQuestions[i]);
            }
        }
        
        // 正解率の低い順でソート
        incorrectQuestions.sort((a, b) => {
            const indexA = this.allQuestions.indexOf(a);
            const indexB = this.allQuestions.indexOf(b);
            const recordsA = this.answerHistory[`q_${indexA}`] || [];
            const recordsB = this.answerHistory[`q_${indexB}`] || [];
            
            const correctRateA = recordsA.length > 0 ? 
                recordsA.filter(r => r.correct).length / recordsA.length : 1;
            const correctRateB = recordsB.length > 0 ? 
                recordsB.filter(r => r.correct).length / recordsB.length : 1;
            
            return correctRateA - correctRateB;
        });
        
        return incorrectQuestions;
    }
    
    // 最近（1週間以内）間違えた問題を取得
    getRecentIncorrectQuestions() {
        const recentIncorrectQuestions = [];
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        for (let i = 0; i < this.allQuestions.length; i++) {
            const questionKey = `q_${i}`;
            const records = this.answerHistory[questionKey] || [];
            
            // 1週間以内に間違えた記録があるか
            const hasRecentIncorrect = records.some(record => 
                !record.correct && record.timestamp > oneWeekAgo
            );
            
            if (hasRecentIncorrect) {
                recentIncorrectQuestions.push(this.allQuestions[i]);
            }
        }
        
        // 最近の間違いの新しい順でソート
        recentIncorrectQuestions.sort((a, b) => {
            const indexA = this.allQuestions.indexOf(a);
            const indexB = this.allQuestions.indexOf(b);
            const recordsA = this.answerHistory[`q_${indexA}`] || [];
            const recordsB = this.answerHistory[`q_${indexB}`] || [];
            
            const lastIncorrectA = recordsA.filter(r => !r.correct && r.timestamp > oneWeekAgo)
                .reduce((latest, record) => Math.max(latest, record.timestamp), 0);
            const lastIncorrectB = recordsB.filter(r => !r.correct && r.timestamp > oneWeekAgo)
                .reduce((latest, record) => Math.max(latest, record.timestamp), 0);
            
            return lastIncorrectB - lastIncorrectA; // 新しい順
        });
        
        return recentIncorrectQuestions;
    }
    
    // 習熟度フィルターによる問題取得
    getMasteryFilteredQuestions() {
        const masteryLevelValue = this.masteryLevelSelect ? this.masteryLevelSelect.value : '0-3';
        let minMastery, maxMastery;
        
        if (masteryLevelValue === 'custom') {
            minMastery = this.masteryMin ? parseInt(this.masteryMin.value) : 0;
            maxMastery = this.masteryMax ? parseInt(this.masteryMax.value) : 3;
        } else {
            const range = masteryLevelValue.split('-');
            minMastery = parseInt(range[0]);
            maxMastery = parseInt(range[1]);
        }
        
        const filteredQuestions = [];
        
        for (let i = 0; i < this.allQuestions.length; i++) {
            const question = this.allQuestions[i];
            const questionKey = this.getQuestionKey(question, i);
            const mastery = this.questionMastery[questionKey] || 0;
            
            if (mastery >= minMastery && mastery <= maxMastery) {
                filteredQuestions.push(question);
            }
        }
        
        // 習熟度の低い順でソート
        filteredQuestions.sort((a, b) => {
            const indexA = this.allQuestions.indexOf(a);
            const indexB = this.allQuestions.indexOf(b);
            const keyA = this.getQuestionKey(a, indexA);
            const keyB = this.getQuestionKey(b, indexB);
            const masteryA = this.questionMastery[keyA] || 0;
            const masteryB = this.questionMastery[keyB] || 0;
            return masteryA - masteryB;
        });
        
        return filteredQuestions;
    }
    
    // 期間フィルターによる問題取得
    getPeriodFilteredQuestions() {
        const periodType = this.periodTypeSelect ? this.periodTypeSelect.value : 'within';
        let startTime, endTime;
        
        const now = Date.now();
        
        if (periodType === 'range') {
            // 範囲選択
            const startDays = this.periodStart ? parseInt(this.periodStart.value) : 7;
            const endDays = this.periodEnd ? parseInt(this.periodEnd.value) : 3;
            
            startTime = now - (startDays * 24 * 60 * 60 * 1000);
            endTime = now - (endDays * 24 * 60 * 60 * 1000);
        } else {
            // 以内選択
            const periodValue = this.periodSelect ? this.periodSelect.value : 'today';
            switch (periodValue) {
                case 'today':
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    startTime = todayStart.getTime();
                    endTime = now;
                    break;
                case '3days':
                    startTime = now - (3 * 24 * 60 * 60 * 1000);
                    endTime = now;
                    break;
                case '1week':
                    startTime = now - (7 * 24 * 60 * 60 * 1000);
                    endTime = now;
                    break;
                case '2weeks':
                    startTime = now - (14 * 24 * 60 * 60 * 1000);
                    endTime = now;
                    break;
                case '1month':
                    startTime = now - (30 * 24 * 60 * 60 * 1000);
                    endTime = now;
                    break;
                default:
                    startTime = now - (7 * 24 * 60 * 60 * 1000);
                    endTime = now;
            }
        }
        
        const filteredQuestions = [];
        
        for (let i = 0; i < this.allQuestions.length; i++) {
            const question = this.allQuestions[i];
            const questionKey = this.getQuestionKey(question, i);
            const records = this.answerHistory[questionKey] || [];
            
            // 指定期間内に間違えた記録があるか
            const hasIncorrectInPeriod = records.some(record => 
                !record.correct && 
                record.timestamp >= startTime && 
                record.timestamp <= endTime
            );
            
            if (hasIncorrectInPeriod) {
                filteredQuestions.push(question);
            }
        }
        
        // 最近の間違いの新しい順でソート
        filteredQuestions.sort((a, b) => {
            const indexA = this.allQuestions.indexOf(a);
            const indexB = this.allQuestions.indexOf(b);
            const keyA = this.getQuestionKey(a, indexA);
            const keyB = this.getQuestionKey(b, indexB);
            const recordsA = this.answerHistory[keyA] || [];
            const recordsB = this.answerHistory[keyB] || [];
            
            const lastIncorrectA = recordsA.filter(r => 
                !r.correct && r.timestamp >= startTime && r.timestamp <= endTime
            ).reduce((latest, record) => Math.max(latest, record.timestamp), 0);
            
            const lastIncorrectB = recordsB.filter(r => 
                !r.correct && r.timestamp >= startTime && r.timestamp <= endTime
            ).reduce((latest, record) => Math.max(latest, record.timestamp), 0);
            
            return lastIncorrectB - lastIncorrectA; // 新しい順
        });
        
        return filteredQuestions;
    }
    
    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        this.questionNumber.textContent = this.currentQuestionIndex + 1;
        this.questionText.textContent = question.question;
        
        // 分類表示を更新
        this.updateCategoryDisplay(question);
        
        this.optionButtons.forEach((btn, index) => {
            btn.textContent = question.options[index];
            btn.className = 'option-btn';
            btn.disabled = false;
        });
        
        this.feedback.textContent = '';
        this.feedback.className = 'feedback';
        this.isAnswered = false;
        this.nextBtn.style.display = 'none';
        this.updateProgress();
        this.updateAnswerHistory();
    }
    
    selectOption(selectedIndex) {
        if (this.isAnswered) return;
        
        const question = this.questions[this.currentQuestionIndex];
        const correctIndex = question.correctAnswer;
        
        this.isAnswered = true;
        const isCorrect = selectedIndex === correctIndex;
        
        // 履歴に追加
        this.answerHistory.push(isCorrect);
        
        // 習熟度を更新
        this.updateQuestionMastery(this.currentQuestionIndex, isCorrect);
        
        this.optionButtons.forEach((btn, index) => {
            btn.disabled = true;
            if (index === correctIndex) {
                btn.classList.add('correct');
            } else if (index === selectedIndex && index !== correctIndex) {
                btn.classList.add('incorrect');
            }
        });
        
        if (isCorrect) {
            this.score++;
            this.feedback.textContent = '🎉 正解！';
            this.feedback.className = 'feedback correct';
            // 正解時のキャラクター応援
            this.showCharacterMessage(this.getRandomMessage('correct'), true);
        } else {
            this.feedback.textContent = `❌ 不正解。正解は「${question.options[correctIndex]}」です。`;
            this.feedback.className = 'feedback incorrect';
            // 不正解時のキャラクター励まし
            this.showCharacterMessage(this.getRandomMessage('incorrect'), false);
        }
        
        this.updateStats();
        this.updateAnswerHistory();
        
        // 自動進行または手動進行の制御（0.2秒に短縮）
        if (this.currentQuestionIndex < this.questions.length - 1) {
            if (this.autoProgressCheckbox.checked) {
                // 次へ次へのテンポ重視設定
                const delay = this.skipAnimations ? 200 : 500; // 0.2秒 または 0.5秒
                this.autoProgressTimer = setTimeout(() => {
                    this.nextQuestion();
                }, delay);
            } else {
                // 手動進行：次の問題ボタンを表示
                this.nextBtn.style.display = 'inline-block';
            }
        } else {
            // 最後の問題：すぐに結果表示
            const delay = this.skipAnimations ? 200 : 400; // 0.2秒 または 0.4秒
            setTimeout(() => this.showResults(), delay);
        }
    }
    
    nextQuestion() {
        // 自動進行タイマーをクリア
        if (this.autoProgressTimer) {
            clearTimeout(this.autoProgressTimer);
            this.autoProgressTimer = null;
        }
        
        this.currentQuestionIndex++;
        this.showQuestion();
    }
    
    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.progressFill.style.width = `${progress}%`;
    }
    
    updateStats() {
        this.correctCount.textContent = this.score;
        this.totalCount.textContent = this.currentQuestionIndex + (this.isAnswered ? 1 : 0);
        const currentAccuracy = this.isAnswered && this.totalCount.textContent > 0 
            ? Math.round((this.score / parseInt(this.totalCount.textContent)) * 100)
            : 0;
        this.accuracy.textContent = `${currentAccuracy}%`;
    }
    
    showResults() {
        // クイズ部分を隠す
        document.querySelector('.quiz-container').style.display = 'none';
        
        this.resultsSection.style.display = 'block';
        this.finalCorrect.textContent = this.score;
        this.finalTotal.textContent = this.questions.length;
        const finalAccuracy = Math.round((this.score / this.questions.length) * 100);
        this.finalAccuracy.textContent = `${finalAccuracy}%`;
        
        let gradeText = '';
        let gradeClass = '';
        
        if (finalAccuracy >= 90) {
            gradeText = '🏆 優秀！完璧です！';
            gradeClass = 'excellent';
        } else if (finalAccuracy >= 70) {
            gradeText = '👍 良好！もう少しで完璧です！';
            gradeClass = 'good';
        } else if (finalAccuracy >= 50) {
            gradeText = '📚 普通。もう少し頑張りましょう！';
            gradeClass = 'average';
        } else {
            gradeText = '💪 要練習。次回は頑張りましょう！';
            gradeClass = 'needs-improvement';
        }
        
        this.grade.textContent = gradeText;
        this.grade.className = `grade ${gradeClass}`;
        
        // 結果画面でのキャラクター表示
        this.showResultCharacter(finalAccuracy);
        
        this.saveResult(finalAccuracy);
        this.loadHistory();
        this.restartBtn.style.display = 'inline-block';
    }
    
    saveResult(accuracy) {
        const result = {
            date: new Date().toLocaleString('ja-JP'),
            score: this.score,
            total: this.questions.length,
            accuracy: accuracy
        };
        
        this.history.unshift(result);
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }
        
        SafeStorage.setItem('quizHistory', this.history);
    }
    
    loadHistory() {
        // 安全な方法で要素をクリア
        SafeDOMHelper.clearElement(this.historyList);
        
        // テーブル形式で履歴を表示
        const historyTable = SafeDOMHelper.createHistoryTable(this.history);
        this.historyList.appendChild(historyTable);
    }
    
    clearHistory() {
        if (confirm('履歴をすべて削除しますか？')) {
            this.history = [];
            localStorage.removeItem('quizHistory');
            this.loadHistory();
        }
    }
    
    restartQuiz() {
        // クイズ部分を再表示
        document.querySelector('.quiz-container').style.display = 'block';
        // カテゴリー情報を再表示
        if (this.categorySummary) {
            this.categorySummary.style.display = 'block';
        }
        this.startQuiz();
    }
    
    // 習熟度システム
    updateQuestionMastery(questionIndex, isCorrect) {
        // 現在の問題を取得
        const currentQuestion = this.questions[questionIndex];
        const actualQuestionIndex = this.allQuestions.findIndex(q => 
            q.question === currentQuestion.question && 
            JSON.stringify(q.options) === JSON.stringify(currentQuestion.options)
        );
        
        // ハッシュベースのキーを生成
        const questionKey = this.getQuestionKey(currentQuestion, actualQuestionIndex >= 0 ? actualQuestionIndex : questionIndex);
        const now = Date.now();
        
        // 回答履歴を記録
        if (!this.answerHistory[questionKey]) {
            this.answerHistory[questionKey] = [];
        }
        
        this.answerHistory[questionKey].push({
            timestamp: now,
            correct: isCorrect
        });
        
        // 4週間以内の履歴のみ保持
        const fourWeeksAgo = now - (4 * 7 * 24 * 60 * 60 * 1000);
        this.answerHistory[questionKey] = this.answerHistory[questionKey].filter(
            record => record.timestamp > fourWeeksAgo
        );
        
        // 習熟度を計算 (0-10段階)
        const mastery = this.calculateMastery(questionKey);
        this.questionMastery[questionKey] = mastery;
        
        // ローカルストレージに保存
        SafeStorage.setItem('answerHistory', this.answerHistory);
        SafeStorage.setItem('questionMastery', this.questionMastery);
    }
    
    calculateMastery(questionKey) {
        const records = this.answerHistory[questionKey] || [];
        if (records.length === 0) return 0;
        
        const now = Date.now();
        const totalAttempts = records.length;
        const correctCount = records.filter(r => r.correct).length;
        const accuracy = correctCount / totalAttempts;
        
        // 基本習熟度：正解率 × 10
        let baseMastery = Math.floor(accuracy * 10);
        
        // 回答回数ボーナス（多く解くほど習熟度が安定）
        const attemptBonus = Math.min(2, Math.floor(totalAttempts / 3));
        
        // 最終習熟度
        let mastery = Math.min(10, baseMastery + attemptBonus);
        
        // 時間減衰（最後の正解から時間が経過すると減衰）
        const correctRecords = records.filter(r => r.correct);
        if (correctRecords.length > 0) {
            const latestCorrect = Math.max(...correctRecords.map(r => r.timestamp));
            const daysSinceLastCorrect = (now - latestCorrect) / (24 * 60 * 60 * 1000);
            
            if (daysSinceLastCorrect > this.masteryConfig.decayDays) {
                const decayFactor = Math.exp(-(daysSinceLastCorrect - this.masteryConfig.decayDays) / 7);
                mastery = Math.floor(mastery * decayFactor);
            }
        }
        
        // 表示用の記録文字列
        const recordString = records.map(r => r.correct ? '○' : '×').join('');
        
        console.log(`問題 ${questionKey}: ${totalAttempts}回解答 (${recordString}) → 正解率${(accuracy*100).toFixed(0)}% → 習熟度${mastery}`);
        
        return Math.max(0, Math.min(10, mastery));
    }
    
    // 復習が必要な問題を選出
    getReviewQuestions() {
        const reviewQuestions = [];
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        Object.keys(this.answerHistory).forEach(questionKey => {
            const questionIndex = parseInt(questionKey.replace('q_', ''));
            const records = this.answerHistory[questionKey] || [];
            const mastery = this.questionMastery[questionKey] || 0;
            
            // 習熟度が低い、または7日以上経過した問題
            const lastAnswered = records.length > 0 ? Math.max(...records.map(r => r.timestamp)) : 0;
            
            if (mastery < 8 || (lastAnswered > 0 && lastAnswered < sevenDaysAgo)) {
                reviewQuestions.push({
                    index: questionIndex,
                    mastery: mastery,
                    lastAnswered: lastAnswered,
                    priority: (10 - mastery) * 2 + (lastAnswered > 0 ? (now - lastAnswered) / (24 * 60 * 60 * 1000) / 7 : 10)
                });
            }
        });
        
        // 優先度順でソート
        reviewQuestions.sort((a, b) => b.priority - a.priority);
        
        return reviewQuestions;
    }
    
    // 中分類別成績表示
    showCategoryStats() {
        if (!this.categories || !this.categories.minor) {
            alert('カテゴリー情報が読み込まれていません。');
            return;
        }
        
        const categoryStats = {};
        
        // 各カテゴリーの統計を計算
        this.categories.minor.forEach((categoryName, categoryIndex) => {
            const categoryQuestions = this.allQuestions ? this.allQuestions.filter(q => q.category === categoryIndex) : [];
            const totalQuestions = categoryQuestions.length;
            
            if (totalQuestions === 0) return;
            
            let totalMastery = 0;
            let answeredCount = 0;
            let averageAccuracy = 0;
            let totalAttempts = 0;
            let totalCorrect = 0;
            let totalRecords = [];
            
            categoryQuestions.forEach((question, questionIndex) => {
                const questionKey = `q_${questionIndex}`;
                const mastery = this.questionMastery[questionKey] || 0;
                const records = this.answerHistory[questionKey] || [];
                
                if (mastery > 0) {
                    totalMastery += mastery;
                    answeredCount++;
                }
                
                records.forEach(record => {
                    totalAttempts++;
                    totalRecords.push(record.correct);
                    if (record.correct) totalCorrect++;
                });
            });
            
            if (answeredCount > 0) {
                averageAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
            }
            
            // 4週間の記録サマリー
            const recordSummary = totalRecords.length > 0 ? 
                `${totalRecords.length}回 (○${totalCorrect}×${totalAttempts - totalCorrect})` : 
                '未回答';
            
            categoryStats[categoryName] = {
                totalQuestions: totalQuestions,
                answeredCount: answeredCount,
                averageMastery: answeredCount > 0 ? (totalMastery / answeredCount) : 0,
                accuracy: averageAccuracy,
                progress: (answeredCount / totalQuestions) * 100,
                recordSummary: recordSummary,
                totalAttempts: totalAttempts
            };
        });
        
        // モーダルで結果を表示
        const modalTitle = document.getElementById('stats-modal-title');
        const modalBody = document.getElementById('stats-modal-body');
        const modal = document.getElementById('stats-modal');
        
        modalTitle.textContent = '📊 中分類別成績分析';
        
        // 安全な方法で既存コンテンツをクリア
        SafeDOMHelper.clearElement(modalBody);
        
        // セクションコンテナ作成
        const statsSection = SafeDOMHelper.createElement('div', '', 'stats-section');
        const sectionTitle = SafeDOMHelper.createElement('h3', 'カテゴリー別成績 (直近4週間)');
        statsSection.appendChild(sectionTitle);
        
        // テーブルデータの準備
        const headers = ['カテゴリー', '4週間の記録', '進捗', '習熟度', '正解率'];
        const rows = [];
        
        Object.keys(categoryStats).forEach(categoryName => {
            const stats = categoryStats[categoryName];
            if (stats.totalQuestions > 0) {
                const categoryInfo = `${categoryName} (${stats.answeredCount}/${stats.totalQuestions}問)`;
                
                const row = [
                    categoryInfo,
                    stats.recordSummary,
                    { type: 'progress', percentage: stats.progress },
                    { type: 'mastery', value: stats.averageMastery },
                    `${stats.accuracy.toFixed(1)}%`
                ];
                rows.push(row);
            }
        });
        
        // 安全なテーブル作成
        const table = SafeDOMHelper.createTable(headers, rows);
        statsSection.appendChild(table);
        modalBody.appendChild(statsSection);
        modal.style.display = 'flex';
    }
    
    // 習熟度分析表示
    showMasteryStats() {
        const masteryLevels = Array(11).fill(0); // 0-10段階
        
        // 習熟度分布を計算
        Object.keys(this.questionMastery).forEach(questionKey => {
            const mastery = this.questionMastery[questionKey];
            masteryLevels[mastery]++;
        });
        
        // 復習推奨問題を取得
        const reviewQuestions = this.getReviewQuestions();
        
        const totalQuestions = Object.keys(this.questionMastery).length;
        const averageMastery = totalQuestions > 0 ? 
            Object.values(this.questionMastery).reduce((a, b) => a + b, 0) / totalQuestions : 0;
        
        // モーダルで結果を表示
        const modalTitle = document.getElementById('stats-modal-title');
        const modalBody = document.getElementById('stats-modal-body');
        const modal = document.getElementById('stats-modal');
        
        modalTitle.textContent = '🎯 習熟度分析';
        
        let html = '<div class="stats-section">';
        html += '<h3>習熟度分布</h3>';
        
        // 習熟度分布グラフ
        const maxCountOld = Math.max(...masteryLevels);
        for (let i = 0; i <= 10; i++) {
            const count = masteryLevels[i];
            const percentage = maxCountOld > 0 ? (count / maxCountOld) * 100 : 0;
            html += `<div class="mastery-bar">`;
            html += `<span style="width: 30px; text-align: right; margin-right: 10px;">${i}:</span>`;
            html += `<div class="mastery-bar-graph">`;
            html += `<div class="mastery-bar-fill mastery-level-${i}" style="width: ${percentage}%"></div>`;
            html += `</div>`;
            html += `<span style="margin-left: 10px;">${count}問</span>`;
            html += `</div>`;
        }
        
        html += '</div>';
        
        // 統計サマリー
        html += '<div class="stats-section">';
        html += '<h3>統計サマリー</h3>';
        html += `<p><strong>平均習熟度:</strong> ${averageMastery.toFixed(1)}/10</p>`;
        html += `<p><strong>学習済み問題数:</strong> ${totalQuestions}問</p>`;
        html += `<p><strong>復習推奨問題:</strong> ${reviewQuestions.length}問</p>`;
        html += '</div>';
        
        // タブ切り替えボタン
        html += '<div class="stats-section">';
        html += '<div class="tab-buttons">';
        html += '<button class="tab-btn active" onclick="showTab(\'review\', this)">復習推奨問題</button>';
        html += '<button class="tab-btn" onclick="showTab(\'all\', this)">全問題一覧</button>';
        html += '</div>';
        html += '</div>';

        // 復習推奨問題リスト
        html += '<div class="stats-section tab-content" id="review-tab">';
        if (reviewQuestions.length > 0) {
            html += '<h3>優先復習問題 (上位10問)</h3>';
            html += '<table class="stats-table">';
            html += '<tr><th>順位</th><th>カテゴリー</th><th>4週間の記録</th><th>習熟度</th><th>最終回答</th></tr>';
            
            reviewQuestions.slice(0, 10).forEach((q, index) => {
                const question = this.allQuestions[q.index];
                const categoryName = this.categories.minor[question.category] || '未分類';
                const questionKey = `q_${q.index}`;
                const records = this.answerHistory[questionKey] || [];
                
                // 4週間の記録文字列
                const recordString = records.length > 0 ? 
                    `${records.length}回 (${records.map(r => r.correct ? '○' : '×').join('')})` : 
                    '未回答';
                
                const daysAgo = q.lastAnswered > 0 ? Math.floor((Date.now() - q.lastAnswered) / (24 * 60 * 60 * 1000)) : 999;
                const lastAnsweredText = q.lastAnswered > 0 ? (daysAgo > 0 ? daysAgo + '日前' : '今日') : '未回答';
                const masteryBar = `<div class="mastery-bar-graph" style="width: 60px;"><div class="mastery-bar-fill mastery-level-${q.mastery}" style="width: ${q.mastery*10}%"></div></div>`;
                
                html += '<tr>';
                html += `<td>${index + 1}</td>`;
                html += `<td>${categoryName}</td>`;
                html += `<td><small>${recordString}</small></td>`;
                html += `<td>${masteryBar}<small>${q.mastery}/10</small></td>`;
                html += `<td>${lastAnsweredText}</td>`;
                html += '</tr>';
            });
            
            html += '</table>';
        } else {
            html += '<p>復習推奨問題はありません。</p>';
        }
        html += '</div>';

        // 全問題一覧
        html += '<div class="stats-section tab-content" id="all-tab" style="display: none;">';
        html += '<h3>全問題習熟度一覧 (120問)</h3>';
        
        // カテゴリー別フィルター
        html += '<div class="category-filter">';
        html += '<select id="category-filter" onchange="filterQuestions()">';
        html += '<option value="">全カテゴリー</option>';
        if (this.categories && this.categories.minor) {
            this.categories.minor.forEach((cat, index) => {
                html += `<option value="${index}">${cat}</option>`;
            });
        }
        html += '</select>';
        html += '</div>';
        
        html += '<table class="stats-table" id="all-questions-table">';
        html += '<tr><th>問題番号</th><th>カテゴリー</th><th>問題文</th><th>4週間の記録</th><th>習熟度</th><th>最終回答</th></tr>';
        
        // 全問題を表示
        for (let i = 0; i < this.allQuestions.length; i++) {
            const question = this.allQuestions[i];
            const categoryName = this.categories.minor[question.category] || '未分類';
            const questionKey = `q_${i}`;
            const mastery = this.questionMastery[questionKey] || 0;
            const records = this.answerHistory[questionKey] || [];
            
            // 4週間の記録文字列
            const recordString = records.length > 0 ? 
                `${records.length}回 (${records.map(r => r.correct ? '○' : '×').join('')})` : 
                '未回答';
            
            // 最終回答日
            const lastAnswered = records.length > 0 ? records[records.length - 1].timestamp : 0;
            const daysAgo = lastAnswered > 0 ? Math.floor((Date.now() - lastAnswered) / (24 * 60 * 60 * 1000)) : 999;
            const lastAnsweredText = lastAnswered > 0 ? (daysAgo > 0 ? daysAgo + '日前' : '今日') : '未回答';
            
            // 習熟度バー
            const masteryBar = `<div class="mastery-bar-graph" style="width: 60px;"><div class="mastery-bar-fill mastery-level-${mastery}" style="width: ${mastery*10}%"></div></div>`;
            
            // 問題文を短縮表示
            const shortQuestion = question.question.length > 30 ? 
                question.question.substring(0, 30) + '...' : 
                question.question;
            
            html += `<tr data-category="${question.category}">`;
            html += `<td>${i + 1}</td>`;
            html += `<td>${categoryName}</td>`;
            html += `<td><small>${shortQuestion}</small></td>`;
            html += `<td><small>${recordString}</small></td>`;
            html += `<td>${masteryBar}<small>${mastery}/10</small></td>`;
            html += `<td>${lastAnsweredText}</td>`;
            html += '</tr>';
        }
        
        html += '</table>';
        html += '</div>';
        
        // 安全な方法でモーダルに表示
        SafeDOMHelper.clearElement(modalBody);
        
        // 習熟度分布セクション
        const distributionSection = SafeDOMHelper.createElement('div', '', 'stats-section');
        const distributionTitle = SafeDOMHelper.createElement('h3', '習熟度分布');
        distributionSection.appendChild(distributionTitle);
        
        // 習熟度分布バー
        const maxCount = Math.max(...masteryLevels);
        for (let i = 0; i <= 10; i++) {
            const count = masteryLevels[i];
            const masteryBar = SafeDOMHelper.createMasteryBar(i, count, maxCount);
            distributionSection.appendChild(masteryBar);
        }
        
        // 統計サマリー
        const summarySection = SafeDOMHelper.createElement('div', '', 'stats-section');
        const summaryTitle = SafeDOMHelper.createElement('h3', '統計サマリー');
        summarySection.appendChild(summaryTitle);
        
        const averageText = document.createElement('p');
        const averageStrong = SafeDOMHelper.createElement('strong', '平均習熟度: ');
        const averageValue = SafeDOMHelper.createElement('span', `${averageMastery.toFixed(1)}/10`);
        averageText.appendChild(averageStrong);
        averageText.appendChild(averageValue);
        
        const totalText = document.createElement('p');
        const totalStrong = SafeDOMHelper.createElement('strong', '学習済み問題数: ');
        const totalValue = SafeDOMHelper.createElement('span', `${totalQuestions}問`);
        totalText.appendChild(totalStrong);
        totalText.appendChild(totalValue);
        
        const reviewText = document.createElement('p');
        const reviewStrong = SafeDOMHelper.createElement('strong', '復習推奨問題: ');
        const reviewValue = SafeDOMHelper.createElement('span', `${reviewQuestions.length}問`);
        reviewText.appendChild(reviewStrong);
        reviewText.appendChild(reviewValue);
        
        summarySection.appendChild(averageText);
        summarySection.appendChild(totalText);
        summarySection.appendChild(reviewText);
        
        modalBody.appendChild(distributionSection);
        modalBody.appendChild(summarySection);
        modal.style.display = 'flex';
        
        // タブ切り替えとフィルタリング機能をグローバルに定義
        window.showTab = function(tabName, clickedElement) {
            // タブボタンのアクティブ状態を切り替え
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            if (clickedElement) {
                clickedElement.classList.add('active');
            } else {
                // クリックされたボタンを探してアクティブにする
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    if (btn.onclick && btn.onclick.toString().includes(tabName)) {
                        btn.classList.add('active');
                    }
                });
            }
            
            // タブコンテンツを切り替え
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(tabName + '-tab').style.display = 'block';
        };
        
        window.filterQuestions = function() {
            const selectedCategory = document.getElementById('category-filter').value;
            const table = document.getElementById('all-questions-table');
            const rows = table.getElementsByTagName('tr');
            
            // ヘッダー行をスキップして各行をチェック
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const category = row.getAttribute('data-category');
                
                if (selectedCategory === '' || category === selectedCategory) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        };
    }
    
    // 応援キャラクター機能
    initializeCharacterMessages() {
        this.characterMessages = {
            start: [
                "一緒に頑張りましょう！",
                "色の世界へようこそ！",
                "あなたならきっとできます！",
                "楽しく学びましょう♪"
            ],
            correct: [
                "すごい！正解です！🎉",
                "その調子です！✨",
                "素晴らしい！👏",
                "完璧です！💫",
                "よくできました！🌟",
                "お見事！🎊"
            ],
            incorrect: [
                "大丈夫、次は必ずできます！",
                "間違いも勉強の一つです💪",
                "諦めずに頑張って！",
                "次の問題に集中しましょう！",
                "きっと覚えられますよ😊",
                "一歩ずつ進んでいきましょう！"
            ],
            excellent: [
                "🏆 完璧です！色彩のマスターですね！",
                "✨ 素晴らしい！プロ級の知識です！",
                "🌟 驚異的！色彩検定2級合格間違いなし！"
            ],
            good: [
                "👍 とても良い成績です！",
                "🎯 順調に力をつけています！",
                "💪 あと少しで完璧です！"
            ],
            average: [
                "📚 基礎は身についています！",
                "🌱 着実に成長していますね！",
                "⭐ もう少し頑張りましょう！"
            ],
            needsImprovement: [
                "💪 まだまだ伸びしろがありますね！",
                "📖 復習して再チャレンジしましょう！",
                "🌸 継続は力なり！頑張って！"
            ]
        };
        
        this.showCharacterMessage(this.getRandomMessage('start'));
    }
    
    // 画像の自動検出と初期化
    async initializeImages() {
        const imageTypes = [
            { name: 'normal', keywords: ['normal', 'default', 'base'] },
            { name: 'happy', keywords: ['happy', 'correct', 'smile', 'joy'] },
            { name: 'encourage', keywords: ['encourage', 'incorrect', 'cheer', 'support', 'fail'] },
            { name: 'excellent', keywords: ['excellent', 'perfect', 'great', 'best'] },
            { name: 'good', keywords: ['good', 'nice', 'well'] }
        ];
        
        for (const type of imageTypes) {
            const imagePath = await this.findImageByKeywords(type.keywords);
            if (imagePath) {
                this.imageCache.set(type.name, imagePath);
            } else {
                // フォールバック：デフォルトSVGを使用
                this.imageCache.set(type.name, `images/character-${type.name}.svg`);
            }
        }
        
        // 初期画像を設定
        this.setCharacterImage('normal');
        this.setImageShape();
    }
    
    // キーワードに基づいて画像を検索
    async findImageByKeywords(keywords) {
        for (const ext of this.supportedExtensions) {
            for (const keyword of keywords) {
                const patterns = [
                    `images/character-${keyword}.${ext}`,
                    `images/${keyword}.${ext}`,
                    `images/char-${keyword}.${ext}`,
                    `images/character_${keyword}.${ext}`,
                    `images/${keyword}-character.${ext}`
                ];
                
                for (const pattern of patterns) {
                    if (await this.imageExists(pattern)) {
                        return pattern;
                    }
                }
            }
        }
        return null;
    }
    
    // 画像の存在確認
    async imageExists(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
            
            // 3秒でタイムアウト
            setTimeout(() => resolve(false), 3000);
        });
    }
    
    // キャラクター画像を設定
    setCharacterImage(type) {
        const imagePath = this.imageCache.get(type) || this.imageCache.get('normal');
        if (this.characterImg && imagePath) {
            this.characterImg.src = imagePath;
        }
    }
    
    // 結果画面のキャラクター画像を設定
    setResultCharacterImage(type) {
        const imagePath = this.imageCache.get(type) || this.imageCache.get('normal');
        if (this.resultCharacterImg && imagePath) {
            this.resultCharacterImg.src = imagePath;
        }
    }
    
    // 画像の形状を設定（楕円、円形、角丸など）
    setImageShape(shape = 'oval') {
        const characterImageDiv = document.querySelector('.character-image');
        const resultCharacterImageDiv = document.querySelector('.result-character-image');
        
        if (characterImageDiv) {
            characterImageDiv.className = `character-image ${shape}`;
        }
        if (resultCharacterImageDiv) {
            resultCharacterImageDiv.className = `result-character-image ${shape}`;
        }
    }
    
    // アニメーションパターンを設定
    setCharacterAnimation(type, isCorrect = true) {
        // エフェクト短縮が有効な場合は短いアニメーションにする
        if (this.skipAnimations) {
            // 短縮アニメーション（0.3秒）
            this.setQuickAnimation(isCorrect);
            return;
        }
        
        // 既存のアニメーションクラスをクリア
        this.characterSection.classList.remove(
            'character-correct', 'character-encourage', 'character-bounce', 
            'character-spin', 'character-pulse', 'character-zoom', 'character-shake'
        );
        
        let animationClass;
        
        if (isCorrect) {
            // 正解時のアニメーションをランダムまたは順番に選択
            animationClass = `character-${this.animationPatterns[this.currentAnimationIndex]}`;
            this.currentAnimationIndex = (this.currentAnimationIndex + 1) % this.animationPatterns.length;
        } else {
            // 不正解時のアニメーション
            const randomIndex = Math.floor(Math.random() * this.encourageAnimations.length);
            animationClass = `character-${this.encourageAnimations[randomIndex]}`;
        }
        
        this.characterSection.classList.add(animationClass);
        
        // アニメーションをリセット
        setTimeout(() => {
            this.characterSection.classList.remove(animationClass);
        }, 1200);
    }
    
    // 短縮アニメーション
    setQuickAnimation(isCorrect) {
        this.characterSection.classList.remove(
            'character-correct', 'character-encourage', 'character-bounce', 
            'character-spin', 'character-pulse', 'character-zoom', 'character-shake',
            'character-quick-correct', 'character-quick-encourage'
        );
        
        const quickClass = isCorrect ? 'character-quick-correct' : 'character-quick-encourage';
        this.characterSection.classList.add(quickClass);
        
        // 短いアニメーションをリセット
        setTimeout(() => {
            this.characterSection.classList.remove(quickClass);
        }, 300);
    }
    
    getRandomMessage(type) {
        const messages = this.characterMessages[type];
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    showCharacterMessage(message, isCorrect = null) {
        this.characterText.textContent = message;
        
        // アニメーション効果を適用
        this.characterSection.classList.remove('character-correct', 'character-encourage');
        
        if (isCorrect === true) {
            this.setCharacterImage('happy');
            this.setCharacterAnimation('happy', true);
        } else if (isCorrect === false) {
            this.setCharacterImage('encourage');
            this.setCharacterAnimation('encourage', false);
        } else {
            this.setCharacterImage('normal');
        }
    }
    
    showResultCharacter(accuracy) {
        let messageType, imageType;
        
        if (accuracy >= 90) {
            messageType = 'excellent';
            imageType = 'excellent';
        } else if (accuracy >= 70) {
            messageType = 'good';
            imageType = 'good';
        } else if (accuracy >= 50) {
            messageType = 'average';
            imageType = 'normal';
        } else {
            messageType = 'needsImprovement';
            imageType = 'encourage';
        }
        
        this.resultCharacterText.textContent = this.getRandomMessage(messageType);
        this.setResultCharacterImage(imageType);
    }
    
    updateSourceIndicator() {
        const indicator = this.sourceIndicator;
        indicator.className = 'source-indicator';
        
        const totalAvailable = this.allQuestions ? this.allQuestions.length : 0;
        
        switch (this.dataSource) {
            case 'javascript':
                indicator.textContent = `📊 データソース: JavaScriptファイル (全${totalAvailable}問から${this.totalQuestions}問選択)`;
                indicator.classList.add('json');
                break;
            case 'json':
                indicator.textContent = `📊 データソース: JSONファイル (全${totalAvailable}問から${this.totalQuestions}問選択)`;
                indicator.classList.add('json');
                break;
            case 'builtin':
                indicator.textContent = `📊 データソース: 内蔵データ (全${totalAvailable}問から${this.totalQuestions}問選択)`;
                indicator.classList.add('builtin');
                if (this.loadError) {
                    indicator.textContent += ' - クリックでエラー詳細';
                    indicator.classList.add('error');
                }
                break;
            default:
                indicator.textContent = '📊 データソース: 確認中...';
        }
    }
    
    // カテゴリー別問題数を計算
    calculateCategoryQuestionCounts() {
        const counts = new Array(10).fill(0);
        if (this.allQuestions) {
            this.allQuestions.forEach(question => {
                if (question.category !== undefined && question.category >= 0 && question.category < 10) {
                    counts[question.category]++;
                }
            });
        }
        return counts;
    }
    
    // 初期カテゴリー表示を更新（タイトル段階）
    updateInitialCategoryDisplay() {
        console.log('updateInitialCategoryDisplay 開始');
        console.log('categories:', this.categories);
        console.log('allQuestions:', this.allQuestions ? this.allQuestions.length : 'なし');
        console.log('categorySummary要素:', this.categorySummary);
        console.log('majorCategoryTitle要素:', this.majorCategoryTitle);
        console.log('minorCategorySummary要素:', this.minorCategorySummary);
        
        if (this.categories && this.categories.major) {
            const totalQuestions = this.allQuestions ? this.allQuestions.length : 0;
            // ヘッダー部分に表示
            this.majorCategoryTitle.textContent = `${this.categories.major} (全${totalQuestions}問)`;
            console.log('大分類設定:', this.majorCategoryTitle.textContent);
        }
        
        if (this.categories && this.categories.minor) {
            const categoryQuestionCounts = this.calculateCategoryQuestionCounts();
            console.log('カテゴリー別問題数:', categoryQuestionCounts);
            
            // 問題数が多い順に上位3つのカテゴリーを表示
            const categoryData = [];
            for (let i = 0; i < this.categories.minor.length; i++) {
                const count = categoryQuestionCounts[i] || 0;
                if (count > 0) {
                    categoryData.push({
                        name: this.categories.minor[i],
                        count: count,
                        index: i
                    });
                }
            }
            
            console.log('カテゴリーデータ:', categoryData);
            
            // 問題数で降順ソート
            categoryData.sort((a, b) => b.count - a.count);
            
            // 全カテゴリーを表示（短縮形）
            const categoryNames = ['基礎知識', '配色', '効果', '光', '応用', '用語', '心理'];
            const displayParts = [];
            
            for (let i = 0; i < Math.min(categoryData.length, 7); i++) {
                const cat = categoryData[i];
                const shortName = categoryNames[cat.index] || cat.name;
                displayParts.push(`${shortName}${cat.count}問`);
            }
            
            const displayText = `${categoryData.length}カテゴリー • ${displayParts.join(' • ')}`;
            
            console.log('表示用テキスト:', displayText);
            
            // ヘッダー部分に表示
            this.minorCategorySummary.textContent = displayText;
            
            // カテゴリー情報を表示
            if (this.categorySummary) {
                this.categorySummary.style.display = 'block';
                console.log('カテゴリー情報を表示しました:', this.majorCategoryTitle.textContent, this.minorCategorySummary.textContent);
            }
        }
    }
    
    // 分類表示を更新
    updateCategoryDisplay(question) {
        if (this.categories && this.categories.major) {
            const totalQuestions = this.allQuestions ? this.allQuestions.length : 0;
            this.majorCategory.textContent = `${this.categories.major} (全${totalQuestions}問)`;
        }
        
        // 既存のカテゴリクラスを削除
        const categoryDisplay = document.querySelector('.category-display');
        if (categoryDisplay) {
            for (let i = 0; i < 10; i++) {
                categoryDisplay.classList.remove(`category-${i}`);
            }
        }
        
        if (this.categories && this.categories.minor && question.category !== undefined) {
            const categoryIndex = question.category;
            if (categoryIndex >= 0 && categoryIndex < this.categories.minor.length) {
                // カテゴリー別の問題数を動的に計算
                const categoryQuestionCounts = this.calculateCategoryQuestionCounts();
                const questionCount = categoryQuestionCounts[categoryIndex] || 0;
                this.minorCategory.textContent = `${this.categories.minor[categoryIndex]} (${questionCount}問)`;
                // カテゴリに応じた色を適用
                if (categoryDisplay) {
                    categoryDisplay.classList.add(`category-${categoryIndex}`);
                }
            } else {
                this.minorCategory.textContent = '未分類';
            }
        } else {
            this.minorCategory.textContent = '未分類';
        }
    }
    
    // 正誤履歴の表示を更新
    updateAnswerHistory() {
        if (!this.historyDots) return;
        
        SafeDOMHelper.clearElement(this.historyDots);
        
        // 現在までの履歴を表示
        this.answerHistory.forEach((isCorrect, index) => {
            const dot = document.createElement('div');
            dot.className = `history-dot ${isCorrect ? 'correct' : 'incorrect'}`;
            dot.title = `問題${index + 1}: ${isCorrect ? '正解' : '不正解'}`;
            this.historyDots.appendChild(dot);
        });
        
        // 現在の問題を示すドット（まだ回答していない問題）
        if (this.currentQuestionIndex < this.questions.length && !this.isAnswered) {
            const currentDot = document.createElement('div');
            currentDot.className = 'history-dot current';
            currentDot.title = `問題${this.currentQuestionIndex + 1}: 回答中`;
            this.historyDots.appendChild(currentDot);
        }
        
        // 未来の問題を示すドット（グレー）
        const remainingQuestions = this.questions.length - this.answerHistory.length - (this.isAnswered ? 0 : 1);
        for (let i = 0; i < remainingQuestions; i++) {
            const futureDot = document.createElement('div');
            futureDot.className = 'history-dot';
            futureDot.style.background = '#ddd';
            futureDot.style.opacity = '0.5';
            futureDot.title = `問題${this.answerHistory.length + i + (this.isAnswered ? 1 : 2)}: 未回答`;
            this.historyDots.appendChild(futureDot);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});