/**
 * 安全なLocalStorage管理クラス
 * 緊急修正用のデータ検証・エラーハンドリング強化
 */
class SafeStorage {
    /**
     * 安全にデータを取得
     * @param {string} key - ストレージキー
     * @param {*} defaultValue - デフォルト値
     * @returns {*} - 取得したデータまたはデフォルト値
     */
    static getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            
            const parsed = JSON.parse(item);
            return this.validateData(parsed, defaultValue);
        } catch (error) {
            console.warn(`LocalStorage読み込みエラー (${key}):`, error);
            // エラー時は既存データを削除して、デフォルト値を返す
            this.removeItem(key);
            return defaultValue;
        }
    }
    
    /**
     * データ形式の検証
     * @param {*} data - 検証対象データ
     * @param {*} defaultValue - 期待する形式の参考値
     * @returns {*} - 検証済みデータまたはデフォルト値
     */
    static validateData(data, defaultValue) {
        // null/undefinedチェック
        if (data === null || data === undefined) {
            return defaultValue;
        }
        
        // 配列の検証
        if (Array.isArray(defaultValue)) {
            if (!Array.isArray(data)) {
                console.warn('期待する形式: 配列、実際の形式:', typeof data);
                return defaultValue;
            }
            
            // 配列の各要素を検証（履歴データ用）
            if (defaultValue.length === 0) {
                // 空配列の場合は基本的な配列チェックのみ
                return data;
            }
            
            // 履歴データの場合の追加検証
            return data.filter(item => this.validateHistoryItem(item));
        }
        
        // オブジェクトの検証
        if (typeof defaultValue === 'object' && defaultValue !== null) {
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                console.warn('期待する形式: オブジェクト、実際の形式:', typeof data);
                return defaultValue;
            }
            
            // 必要に応じて詳細なオブジェクト検証を追加
            return this.validateObject(data, defaultValue);
        }
        
        // プリミティブ型の検証
        if (typeof data !== typeof defaultValue) {
            console.warn(`期待する形式: ${typeof defaultValue}、実際の形式: ${typeof data}`);
            return defaultValue;
        }
        
        return data;
    }
    
    /**
     * 履歴アイテムの検証
     * @param {Object} item - 履歴アイテム
     * @returns {boolean} - 有効かどうか
     */
    static validateHistoryItem(item) {
        return (
            item &&
            typeof item === 'object' &&
            typeof item.date === 'string' &&
            typeof item.score === 'number' &&
            typeof item.total === 'number' &&
            typeof item.accuracy === 'number' &&
            item.score >= 0 &&
            item.total > 0 &&
            item.score <= item.total &&
            item.accuracy >= 0 &&
            item.accuracy <= 100
        );
    }
    
    /**
     * オブジェクトの検証
     * @param {Object} data - 検証対象オブジェクト
     * @param {Object} defaultValue - デフォルトオブジェクト
     * @returns {Object} - 検証済みオブジェクト
     */
    static validateObject(data, defaultValue) {
        const validated = {};
        
        // デフォルト値のキーに基づいて検証
        Object.keys(defaultValue).forEach(key => {
            if (data.hasOwnProperty(key)) {
                validated[key] = data[key];
            } else {
                validated[key] = defaultValue[key];
            }
        });
        
        return validated;
    }
    
    /**
     * 安全にデータを保存
     * @param {string} key - ストレージキー
     * @param {*} value - 保存する値
     * @returns {boolean} - 保存成功かどうか
     */
    static setItem(key, value) {
        try {
            // データサイズチェック（5MBを超える場合は警告）
            const serialized = JSON.stringify(value);
            const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
            
            if (sizeInMB > 5) {
                console.warn(`大きなデータを保存しようとしています (${sizeInMB.toFixed(1)}MB): ${key}`);
            }
            
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error(`LocalStorage保存エラー (${key}):`, error);
            
            // QuotaExceededErrorの場合は古いデータを削除
            if (error.name === 'QuotaExceededError') {
                this.cleanupOldData();
                // 再試行
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (retryError) {
                    console.error(`LocalStorage保存再試行エラー (${key}):`, retryError);
                }
            }
            
            return false;
        }
    }
    
    /**
     * 古いデータのクリーンアップ
     */
    static cleanupOldData() {
        console.warn('LocalStorageの容量不足により古いデータを削除します');
        
        // 削除対象のキー（優先度低）
        const cleanupKeys = [
            'answerHistory', // 4週間を超える古い回答履歴
            'categoryStats', // 統計キャッシュ
        ];
        
        cleanupKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
                console.log(`古いデータを削除: ${key}`);
            } catch (error) {
                console.error(`データ削除エラー (${key}):`, error);
            }
        });
    }
    
    /**
     * アイテム削除
     * @param {string} key - 削除するキー
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`LocalStorage削除エラー (${key}):`, error);
        }
    }
    
    /**
     * 全てのクイズ関連データをクリア
     */
    static clearQuizData() {
        const quizKeys = [
            'quizHistory',
            'masteryData',
            'categoryStats',
            'questionMastery',
            'answerHistory',
            'masteryConfig'
        ];
        
        quizKeys.forEach(key => this.removeItem(key));
        console.log('クイズ関連データをすべてクリアしました');
    }
    
    /**
     * ストレージの使用状況を取得
     * @returns {Object} - 使用状況情報
     */
    static getStorageInfo() {
        let totalSize = 0;
        let itemCount = 0;
        const items = {};
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                items[key] = {
                    size: size,
                    sizeKB: (size / 1024).toFixed(1)
                };
                totalSize += size;
                itemCount++;
            }
        }
        
        return {
            totalSizeKB: (totalSize / 1024).toFixed(1),
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            itemCount: itemCount,
            items: items
        };
    }
}

// グローバルに公開（既存コードとの互換性のため）
window.SafeStorage = SafeStorage;