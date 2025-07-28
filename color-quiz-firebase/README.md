# 🔥 色彩検定2級クイズアプリ（Firebase版）

Firebase連携による高度なクラウド同期機能を搭載した色彩検定学習アプリケーション。

## 🚀 デモ

**👉 [今すぐ試す](https://muumuu8181.github.io/web-app-samples/color-quiz-app/)**

## 🌟 主要機能

### 📚 豊富な問題データベース
- **537問の問題**: 色彩検定2級に完全対応
- **7つのカテゴリー**: 色彩理論、配色、効果、光、応用、用語、心理
- **実際の試験に準拠**: 本番さながらの問題形式

### 🧠 スマート学習システム
- **習熟度追跡**: 各問題の理解度を0-10で自動測定
- **忘却曲線対応**: エビングハウス曲線に基づく復習タイミング
- **時間減衰**: 時間経過による習熟度の自然な減少をシミュレート

### 🎯 高度なフィルタリング
- **習熟度別学習**: 0-3、4-7、8-10、カスタム範囲での絞り込み
- **期間別復習**: 今日、3日以内、1週間など柔軟な期間設定
- **範囲指定**: 「7日前〜3日前」のような精密な期間選択

### 📊 詳細な分析機能
- **学習統計**: 正解率、習熟度分布、カテゴリー別成績
- **履歴管理**: 過去10回分の成績を自動保存
- **視覚的フィードバック**: 色分けされた成績表示

### 🎨 応援キャラクター
- **5種類のアニメーション**: Jump、Bounce、Spin、Pulse、Zoom
- **状況別メッセージ**: 正解・不正解・結果に応じた励まし
- **カスタマイズ可能**: 楕円、円形、角丸の形状選択

## 🔥 Firebase連携機能

### 🔐 Google認証
- **ワンクリックログイン**: Googleアカウントで簡単ログイン
- **セキュア認証**: Firebase Authenticationによる安全な認証
- **ユーザープロファイル**: アバター・名前の自動表示

### ☁️ クラウド同期
- **学習データ同期**: 複数デバイス間での自動データ同期
- **リアルタイム更新**: Firestoreによる即座のデータ反映
- **オフライン対応**: インターネット接続なしでも学習継続可能

### 📊 高度な分析
- **詳細統計**: カテゴリー別・習熟度別の詳細分析
- **学習履歴**: 過去の全学習データをクラウド保存
- **進捗追跡**: 長期間の学習パフォーマンス追跡

## 📱 対応環境

- **デスクトップ**: Chrome、Firefox、Safari、Edge
- **モバイル**: iOS Safari、Android Chrome
- **レスポンシブ**: あらゆる画面サイズに自動対応

## 🛠️ 技術仕様

### 現在のバージョン
- **純粋JavaScript**: 外部依存なしの軽量設計
- **XSS対策**: SafeDOMHelper によるセキュアDOM操作
- **データ管理**: SafeStorage による型安全なデータ永続化
- **問題識別**: ハッシュベースの高速検索システム

### Firebase統合版
- **Authentication**: Google認証実装済み
- **Firestore**: リアルタイムデータベース連携
- **ES6 Modules**: CDN版Firebase SDK利用
- **セキュリティルール**: ユーザー別データ分離

## 🎓 学習方法の推奨

### 1. 初回学習
```
モード: ✨ 新規問題
問題数: 10-20問
目的: 全体的な理解度の把握
```

### 2. 弱点強化
```
モード: 🎯 習熟度別 (0-3)
問題数: 5-15問
目的: 苦手分野の集中学習
```

### 3. 復習サイクル
```
モード: ⚡ 間違えた問題 (3日以内)
問題数: 全問
目的: 記憶定着の確認
```

### 4. 長期記憶確認
```
モード: ⚡ 間違えた問題 (7日前〜3日前)
問題数: 全問
目的: 忘却曲線に基づく復習
```

## 🚀 Firebase設定とローカル実行

### 1. Firebase設定
`firebase-config.js`のFirebase設定値を更新してください：

```javascript
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 2. Firebase Console設定
1. [Firebase Console](https://console.firebase.google.com/)でプロジェクト作成
2. Authentication > Sign-in method > Googleを有効化
3. Firestore Database作成（テストモードで開始）
4. Hosting設定（オプション）

### 3. セキュリティルール
Firestoreのセキュリティルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーデータは本人のみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // クイズ履歴も本人のみアクセス可能
    match /quizHistory/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. ローカル実行

```bash
# web-app-samplesをクローン
git clone https://github.com/muumuu8181/web-app-samples.git
cd web-app-samples/color-quiz-firebase

# Firebase設定を更新
# firebase-config.jsの設定値を編集

# ローカルサーバーで起動
python -m http.server 8000

# ブラウザで開く
open http://localhost:8000
```

## 🔧 技術詳細

### Firebase SDKバージョン
- Firebase SDK v10.7.1（CDN版）
- ES6 Modules対応

### データ構造

#### ユーザーデータ（users/{userId}）
```javascript
{
  displayName: string,
  email: string,
  photoURL: string,
  lastLoginAt: timestamp,
  totalQuizzes: number,
  averageAccuracy: number
}
```

#### クイズ履歴（quizHistory/{userId}）
```javascript
{
  history: [
    {
      date: timestamp,
      correct: number,
      total: number,
      accuracy: number,
      mode: string,
      questions: array
    }
  ],
  lastUpdated: timestamp
}
```

### クラウド同期の流れ
1. **ログイン**: Google認証でユーザー識別
2. **データ取得**: Firestoreから既存の学習データを取得
3. **ローカル統合**: ローカルデータとクラウドデータをマージ
4. **自動保存**: 学習結果を自動的にクラウドに保存
5. **リアルタイム同期**: 他デバイスでの変更を即座に反映

## 📄 ライセンス

MIT License - 自由にご利用ください

## 👨‍💻 開発者

[@muumuu8181](https://github.com/muumuu8181)

---

🔥 **Firebase + 色彩検定で次世代の学習体験を！**