# Amazon Order Affiliate Link

Amazonの注文履歴ページから、アフィリエイトリンク付きのMarkdown形式リンクをワンクリックでコピーできるChrome拡張機能です。

## 機能

- 注文履歴ページの各商品に「リンクをコピー」ボタンを追加
- クリックするとアフィリエイトタグ付きのMarkdownリンクをクリップボードにコピー
- 書籍の場合は著者名も含めた形式でコピー

### 出力例

```markdown
著者名『[書籍タイトル](https://www.amazon.co.jp/dp/XXXXXXXXXX?tag=your-tag-22)』
```

## インストール

1. このリポジトリをクローンまたはダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. ダウンロードしたフォルダを選択

## 設定

1. Chromeの拡張機能アイコンを右クリック
2. 「オプション」を選択
3. アフィリエイトタグを入力して「保存」をクリック

## 使い方

1. [Amazonの注文履歴](https://www.amazon.co.jp/gp/css/order-history)を開く
2. 各商品の「リンクをコピー」ボタンをクリック
3. ブログやSNSにMarkdown形式で貼り付け

## ライセンス

MIT
