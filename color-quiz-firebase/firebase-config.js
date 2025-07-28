// Firebase設定とGoogle認証の初期化
class FirebaseConfig {
    constructor() {
        this.app = null;
        this.auth = null;
        this.firestore = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    // Firebase初期化
    async initialize() {
        try {
            // Firebase設定（shares-b1b97プロジェクト）
            const firebaseConfig = {
                apiKey: "AIzaSyA5PXKChizYDCXF_GJ4KL6Ylq9K5hCPXWE",
                authDomain: "shares-b1b97.firebaseapp.com",
                databaseURL: "https://shares-b1b97-default-rtdb.firebaseio.com",
                projectId: "shares-b1b97",
                storageBucket: "shares-b1b97.firebasestorage.app",
                messagingSenderId: "38311063248",
                appId: "1:38311063248:web:0d2d5726d12b305b24b8d5"
            };

            // Firebase SDKの動的インポート
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } = 
                await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs } = 
                await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Firebase初期化
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this.firestore = getFirestore(this.app);

            // Firebase関数を保存
            this.firebase = {
                signInWithPopup,
                GoogleAuthProvider,
                signOut,
                onAuthStateChanged,
                collection,
                doc,
                getDoc,
                setDoc,
                updateDoc,
                deleteDoc,
                query,
                where,
                orderBy,
                getDocs
            };

            this.isInitialized = true;
            console.log('🔥 Firebase初期化完了');

            // 認証状態の監視
            this.setupAuthListener();
            
            return true;
        } catch (error) {
            console.error('🔥 Firebase初期化エラー:', error);
            return false;
        }
    }

    // 認証状態監視
    setupAuthListener() {
        this.firebase.onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            if (user) {
                console.log('👤 ユーザーログイン:', user.displayName);
                this.onUserLogin(user);
            } else {
                console.log('👤 ユーザーログアウト');
                this.onUserLogout();
            }
        });
    }

    // Google認証でログイン
    async signInWithGoogle() {
        try {
            const provider = new this.firebase.GoogleAuthProvider();
            const result = await this.firebase.signInWithPopup(this.auth, provider);
            return result.user;
        } catch (error) {
            console.error('🔐 Google認証エラー:', error);
            throw error;
        }
    }

    // ログアウト
    async signOut() {
        try {
            await this.firebase.signOut(this.auth);
        } catch (error) {
            console.error('🔐 ログアウトエラー:', error);
            throw error;
        }
    }

    // ユーザーログイン時の処理
    onUserLogin(user) {
        // UIの更新
        this.updateAuthUI(true, user);
        
        // 学習データの同期開始
        if (window.quizApp) {
            window.quizApp.enableCloudSync(user.uid);
        }
    }

    // ユーザーログアウト時の処理
    onUserLogout() {
        // UIの更新
        this.updateAuthUI(false);
        
        // クラウド同期の停止
        if (window.quizApp) {
            window.quizApp.disableCloudSync();
        }
    }

    // 認証UI更新
    updateAuthUI(isSignedIn, user = null) {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfo = document.getElementById('user-info');

        if (isSignedIn && user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (userInfo) {
                userInfo.style.display = 'block';
                userInfo.innerHTML = `
                    <div class="user-profile">
                        <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar">
                        <span class="user-name">${user.displayName}</span>
                    </div>
                `;
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    // Firestoreにデータを保存
    async saveUserData(userId, data) {
        try {
            const userRef = this.firebase.doc(this.firestore, 'users', userId);
            await this.firebase.setDoc(userRef, data, { merge: true });
            return true;
        } catch (error) {
            console.error('💾 データ保存エラー:', error);
            return false;
        }
    }

    // Firestoreからデータを取得
    async getUserData(userId) {
        try {
            const userRef = this.firebase.doc(this.firestore, 'users', userId);
            const docSnap = await this.firebase.getDoc(userRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error('📥 データ取得エラー:', error);
            return null;
        }
    }

    // 学習履歴をクラウドに保存
    async saveQuizHistory(userId, historyData) {
        try {
            const historyRef = this.firebase.doc(this.firestore, 'quizHistory', userId);
            await this.firebase.setDoc(historyRef, {
                history: historyData,
                lastUpdated: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('📊 履歴保存エラー:', error);
            return false;
        }
    }

    // 学習履歴をクラウドから取得
    async getQuizHistory(userId) {
        try {
            const historyRef = this.firebase.doc(this.firestore, 'quizHistory', userId);
            const docSnap = await this.firebase.getDoc(historyRef);
            
            if (docSnap.exists()) {
                return docSnap.data().history || [];
            } else {
                return [];
            }
        } catch (error) {
            console.error('📊 履歴取得エラー:', error);
            return [];
        }
    }
}

// グローバルに公開
window.firebaseConfig = new FirebaseConfig();