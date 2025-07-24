# コワーキング ポモドーロタイマー (Vercel版)

Airbnb風デザインのコワーキングスペース向け共有ポモドーロタイマーです。  
Vercel Functionsを使用したサーバーレスアーキテクチャで構築されています。

## 特徴

- 🍅 50分作業 + 10分休憩のポモドーロタイマー
- 👥 複数人での同期利用（ポーリングベース）
- 🎨 Airbnb風の温かみのあるデザイン
- 📱 完全レスポンシブ対応
- ⚡ Vercel Functionsでサーバーレス
- 🔄 リアルタイム同期（1秒間隔ポーリング）
- 👤 カラフルなアバター表示

## 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **バックエンド**: Vercel Functions (Node.js)
- **デプロイ**: Vercel
- **同期方式**: ポーリングベース（WebSocketの代替）

## プロジェクト構造

```
pomodoro-coworking/
├── api/
│   └── socket.js          # Vercel Function (ポーリングAPI)
├── public/
│   ├── index.html         # メインHTML
│   ├── css/
│   │   └── style.css      # Airbnb風スタイル
│   └── js/
│       └── client.js      # ポーリングクライアント
├── vercel.json            # Vercel設定
├── package.json           # プロジェクト設定
└── README.md
```

## セットアップ & デプロイ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ローカル開発

```bash
npm run dev
```

Vercel CLIが `http://localhost:3000` でローカルサーバーを起動します。

### 3. Vercelにデプロイ

```bash
npm run deploy
```

または

```bash
vercel --prod
```

## API仕様

### GET /api/socket
現在の状態とイベントを取得

**レスポンス:**
```json
{
  "state": {
    "isRunning": boolean,
    "isWorkTime": boolean,
    "timeLeft": number,
    "participants": array,
    "lastUpdated": timestamp
  },
  "events": array
}
```

### POST /api/socket
アクションを実行

**リクエスト:**
```json
{
  "action": "joinRoom|startPomodoro|stopPomodoro|resetPomodoro|heartbeat",
  "data": {}
}
```

## 機能詳細

### リアルタイム同期
- 1秒間隔でのポーリング
- 参加者のハートビート管理（30秒タイムアウト）
- イベントキューでフェーズ変更通知

### 参加者管理
- 自動アバター色割り当て
- イニシャル表示
- 非アクティブ参加者の自動削除

### UI/UX
- Airbnbカラーパレット (#FF5A5F, #00A699, #FC642D)
- 円形進捗バー (SVG)
- マイクロアニメーション
- トースト通知

## 環境変数

このアプリは環境変数を必要としません。  
全ての状態はVercel Function内のメモリで管理されます。

## 制限事項

- インメモリストレージのため、関数の再起動で状態がリセットされます
- 同時接続数はVercel Functionsの制限内
- ポーリング方式のため、WebSocketほどリアルタイムではありません

## ライセンス

MIT License