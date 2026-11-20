# 格闘カマキリ（KAKUTO KAMAKIRI 3D）

本物のカマキリを3Dで再現した、ブラウザで遊べる格闘ゲームです。

- 体節のある腹部、細長い前胸、三角の頭と複眼、棘の並んだ鎌（前脚）、4本の歩脚、前翅・後翅を Three.js で手続き生成
- 虫の目線の世界：巨大な草の森、落ち葉の闘技場、水滴
- 威嚇ポーズ（翅を広げて鎌を振り上げる）は実際のカマキリの威嚇行動がモデル

## 遊び方

GitHub Pages で公開: `https://techgymjp.github.io/kamakiri/`

ローカルで動かす場合（ES Modules を使うため簡易サーバーが必要）:

```bash
python3 -m http.server 8000
```

ブラウザで http://localhost:8000 を開きます。

## 操作

| 操作 | 1P | 2P |
|---|---|---|
| 移動 | A / D | ← / → |
| ジャンプ | W | ↑ |
| ガード | S | ↓ |
| カマジャブ（弱） | J | 1 / , |
| 大鎌斬り（強） | K | 2 / . |
| 旋風鎌（必殺・気力50消費） | L | 3 / / |

- 空中で攻撃 → 急降下鎌
- P / Esc：一時停止、M：消音
- スマホではタッチボタンが表示されます
- 2本先取で勝利

## ファイル構成

- `index.html` … 画面・メニュー
- `style.css` … スタイル
- `game.js` … 3Dモデル、戦闘ロジック、CPU AI、エフェクト、HUD
- `lib/three.module.js` … Three.js r160（MIT License、`lib/three.LICENSE`）

## GitHub Pages の設定

Settings → Pages → Source: 「Deploy from a branch」、Branch: `main` / `(root)`
