# コワーキング ポモドーロタイマー

コワーキングスペース向けの共有ポモドーロタイマーWebアプリケーションです。

## 機能

- 🍅 50分作業 + 10分休憩のポモドーロタイマー
- 👥 複数人での同期利用
- 📱 レスポンシブデザイン
- 🔄 リアルタイム同期（WebSocket）
- 👤 参加者名表示（匿名可）

## セットアップ

### 依存関係のインストール

```bash
cd pomodoro-coworking
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

### 本番サーバーの起動

```bash
npm start
```

アプリケーションは http://localhost:3000 でアクセスできます。

## 使い方

1. ブラウザでアプリケーションにアクセス
2. 名前を入力（任意）して「参加」ボタンをクリック
3. 「開始」ボタンでポモドーロタイマーを開始
4. 全ての参加者に同じタイマーが表示されます

## プロジェクト構造

```
pomodoro-coworking/
├── src/
│   └── server.js          # Express + Socket.IO サーバー
├── public/
│   ├── css/
│   │   └── style.css      # スタイルシート
│   └── js/
│       └── client.js      # クライアントサイドJS
├── views/
│   └── index.html         # メインHTML
└── package.json
```

## 技術スタック

- **バックエンド**: Node.js, Express.js, Socket.IO
- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **リアルタイム通信**: WebSocket (Socket.IO)