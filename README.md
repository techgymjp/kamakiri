# 格闘カマキリ（KAKUTO KAMAKIRI 3D）

日本語 / English 対応（タイトル画面右上で切り替え。初回はブラウザの言語設定に合わせて自動選択）

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

## ゲームモード：勝ち抜きバトル（1P vs CPU）

実在のカマキリ6種が順番に登場し、勝つほど相手が強くなります（各ステージ2本先取）。

| STAGE | 相手 | 特徴 |
|---|---|---|
| 1 | コカマキリ | 小柄ですばしっこい |
| 2 | ハラビロカマキリ | 幅広の腹 |
| 3 | チョウセンカマキリ | バランス型 |
| 4 | ハナカマキリ | 動きが速い |
| 5 | カレハカマキリ | 守りが固い |
| FINAL | ニセハナマオウカマキリ | 大型・攻守とも最強のボス |

結果画面の「結果をシェア」で、スマホでは端末の共有メニュー、PCでは X（旧Twitter）の投稿画面から結果をシェアできます。

負けても「コンティニュー」で同じステージから再挑戦できます。到達ステージは保存され、タイトルの「つづきから」で再開できます。

## 操作

| 操作 | キーボード | スマホ |
|---|---|---|
| 移動 | A / D（← / →） | 左のパッド |
| ジャンプ | W（↑） | 「ジャンプ」ボタン／パッドを上へ |
| ガード | S（↓） | 「ガード」ボタン／パッドを下へ |
| カマジャブ（弱） | J | 「弱」 |
| 大鎌斬り（強） | K | 「強」 |
| 旋風鎌（必殺・気力50消費） | L | 「必」（使えるときに光る） |
| 一時停止 | P / Esc | Ⅱ ボタン |
| 消音 | M | ♪ ボタン |
| 全画面 | — | ⛶ ボタン（対応端末のみ） |

- 空中で攻撃 → 急降下鎌
- BGM：タイトル／バトル（ステージが進むほどテンポアップ）／ボス戦／勝利／ゲームオーバー。すべて WebAudio でその場で合成するオリジナル曲です
- スマホは横向き推奨（縦向きでも操作ボタンが画面下に出ます）

## ファイル構成

- `index.html` … 画面・メニュー
- `style.css` … スタイル
- `game.js` … 3Dモデル、戦闘ロジック、CPU AI、エフェクト、HUD
- `lib/three.module.js` … Three.js r160（MIT License、`lib/three.LICENSE`）

## GitHub Pages の設定

Settings → Pages → Source: 「Deploy from a branch」、Branch: `main` / `(root)`

---

## English

**Kakuto Kamakiri** is a 3D fighting game starring realistic, procedurally modeled praying mantises. Battle six real mantis species in a row — each stronger than the last — and become the true Mantis King.

- Controls: A/D (or ←/→) move, W jump, S guard, J Scythe Jab, K Great Slash, L Whirlwind Scythe (costs 50 spirit). Touch controls appear on phones.
- Opponents: Small Brown Mantis → Broad-bellied Mantis → Narrow-winged Mantis → Orchid Mantis → Dead Leaf Mantis → Devil's Flower Mantis (boss)
- Original BGM synthesized live with WebAudio
- Share your result from the result screen
- Switch language with the button at the top-right of the title screen
