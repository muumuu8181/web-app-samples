/**
 * XSS対策済みのDOM操作ヘルパー
 * 緊急修正用のユーティリティクラス
 */
class SafeDOMHelper {
    /**
     * 安全な要素作成
     * @param {string} tag - HTMLタグ名
     * @param {string} textContent - テキスト内容（XSS対策済み）
     * @param {string} className - CSSクラス名
     * @returns {HTMLElement}
     */
    static createElement(tag, textContent = '', className = '') {
        const element = document.createElement(tag);
        if (textContent) element.textContent = textContent; // XSS対策
        if (className) element.className = className;
        return element;
    }
    
    /**
     * 安全な履歴テーブル作成
     * @param {Array} historyData - 履歴データ配列
     * @returns {HTMLElement}
     */
    static createHistoryTable(historyData) {
        if (historyData.length === 0) {
            const emptyMessage = this.createElement('p', 'まだ記録がありません');
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = '#666';
            emptyMessage.style.fontStyle = 'italic';
            emptyMessage.style.padding = '20px';
            return emptyMessage;
        }
        
        const table = document.createElement('table');
        table.className = 'history-table';
        
        // ヘッダー作成
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const headers = ['日時', 'スコア', '正解率', '評価'];
        headers.forEach(headerText => {
            const th = this.createElement('th', headerText);
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // ボディ作成
        const tbody = document.createElement('tbody');
        
        historyData.forEach((result, index) => {
            const row = document.createElement('tr');
            
            // 日時
            const dateCell = this.createElement('td', result.date);
            dateCell.className = 'history-date-cell';
            row.appendChild(dateCell);
            
            // スコア
            const scoreCell = this.createElement('td', `${result.score}/${result.total}`);
            scoreCell.className = 'history-score-cell';
            row.appendChild(scoreCell);
            
            // 正解率
            const accuracyCell = this.createElement('td', `${result.accuracy}%`);
            const accuracyClass = result.accuracy >= 90 ? 'excellent' : 
                                result.accuracy >= 70 ? 'good' : 
                                result.accuracy >= 50 ? 'average' : 'poor';
            accuracyCell.className = `history-accuracy-cell ${accuracyClass}`;
            row.appendChild(accuracyCell);
            
            // 評価
            const gradeText = result.accuracy >= 90 ? '🏆 優秀' : 
                            result.accuracy >= 70 ? '👍 良好' : 
                            result.accuracy >= 50 ? '📚 普通' : '💪 要練習';
            const gradeCell = this.createElement('td', gradeText);
            gradeCell.className = `history-grade-cell ${accuracyClass}`;
            row.appendChild(gradeCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        return table;
    }
    
    /**
     * 安全なテーブル作成（統計表示用）
     * @param {Array} headers - ヘッダー配列
     * @param {Array} rows - 行データ配列
     * @returns {HTMLElement}
     */
    static createTable(headers, rows) {
        const table = document.createElement('table');
        table.className = 'stats-table';
        
        // ヘッダー作成
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = this.createElement('th', header);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // ボディ作成
        const tbody = document.createElement('tbody');
        rows.forEach(rowData => {
            const row = document.createElement('tr');
            rowData.forEach(cellData => {
                const td = document.createElement('td');
                
                // セルデータがオブジェクトの場合（プログレスバーなど）
                if (typeof cellData === 'object' && cellData.type) {
                    if (cellData.type === 'progress') {
                        const progressContainer = document.createElement('div');
                        progressContainer.className = 'progress-container';
                        
                        const progressBar = document.createElement('div');
                        progressBar.className = 'progress-bar';
                        progressBar.style.width = `${cellData.percentage}%`;
                        
                        progressContainer.appendChild(progressBar);
                        
                        const progressText = SafeDOMHelper.createElement('small', `${cellData.percentage.toFixed(1)}%`);
                        
                        td.appendChild(progressContainer);
                        td.appendChild(progressText);
                    } else if (cellData.type === 'mastery') {
                        const masteryContainer = document.createElement('div');
                        masteryContainer.className = 'mastery-container';
                        
                        const masteryBar = document.createElement('div');
                        masteryBar.className = 'mastery-bar';
                        masteryBar.style.width = `${(cellData.value / 10) * 100}%`;
                        
                        masteryContainer.appendChild(masteryBar);
                        
                        const masteryText = SafeDOMHelper.createElement('small', `${cellData.value.toFixed(1)}/10`);
                        
                        td.appendChild(masteryContainer);
                        td.appendChild(masteryText);
                    }
                } else {
                    // 通常のテキストデータ
                    td.textContent = cellData;
                }
                
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        return table;
    }
    
    /**
     * 要素の内容を安全にクリア
     * @param {HTMLElement} element 
     */
    static clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    
    /**
     * 安全な習熟度分布バー作成
     * @param {number} level - 習熟度レベル (0-10)
     * @param {number} count - 問題数
     * @param {number} maxCount - 最大問題数（バーの長さ計算用）
     * @returns {HTMLElement}
     */
    static createMasteryBar(level, count, maxCount) {
        const container = document.createElement('div');
        container.className = 'mastery-bar';
        
        const levelLabel = SafeDOMHelper.createElement('span', `${level}:`, 'mastery-level-label');
        levelLabel.style.width = '30px';
        levelLabel.style.textAlign = 'right';
        levelLabel.style.marginRight = '10px';
        
        const barContainer = document.createElement('div');
        barContainer.className = 'mastery-bar-graph';
        
        const barFill = document.createElement('div');
        barFill.className = `mastery-bar-fill mastery-level-${level}`;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        barFill.style.width = `${percentage}%`;
        
        const countLabel = SafeDOMHelper.createElement('span', `${count}問`);
        countLabel.style.marginLeft = '10px';
        
        barContainer.appendChild(barFill);
        
        container.appendChild(levelLabel);
        container.appendChild(barContainer);
        container.appendChild(countLabel);
        
        return container;
    }
}

// グローバルに公開（既存コードとの互換性のため）
window.SafeDOMHelper = SafeDOMHelper;