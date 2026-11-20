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
| ジャンプ | W（↑） | パッドを上へ |
| ガード | S（↓） | パッドを下へ |
| カマジャブ（弱） | J | 「弱」 |
| 大鎌斬り（強） | K | 「強」 |
| 旋風鎌（必殺・気力50消費） | L | 「必」（使えるときに光る） |
| 一時停止 | P / Esc | Ⅱ ボタン |
| 消音 | M | ♪ ボタン |
| 全画面 | — | ⛶ ボタン（対応端末のみ） |

- 空中で攻撃 → 急降下鎌
- カメラ演出：必殺技の発動時は時間が止まり、カメラが技を出した側の正面へ回り込んで技名をカットイン表示。K.O. 時はスローモーションの中で倒れる相手の周りを回り込み、続けて勝者を斜め前から映します
- BGM：タイトル／バトル（ステージが進むほどテンポアップ）／ボス戦／勝利／ゲームオーバー。すべて WebAudio でその場で合成するオリジナル曲です
- スマホは横向き推奨（縦向きでも操作ボタンが画面下に出ます）

## ファイル構成

- `index.html` … 画面・メニュー
- `style.css` … スタイル
- `game.js` … 3Dモデル、戦闘ロジック、CPU AI、BGM、エフェクト、HUD、アプリ向けの処理
- `ads.js` … Google AdMob 広告（Android アプリのときだけ動く。Web 版では何もしない）
- `ads-config.js` / `build-info.js` … ビルド時に生成される設定（リポジトリにあるのは Web 版の既定値）
- `lib/three.module.js` … Three.js r160（MIT License、`lib/three.LICENSE`）
- `android/` … Android アプリ（Capacitor）
- `assets/` … アプリのアイコン・起動画面の元画像
- `scripts/build-web.js` … Web 版・アプリ用のファイルを `www/` にまとめる

## Android アプリ

Web 版をそのまま Capacitor で Android アプリにしています（パッケージ名 `jp.techgym.kamakiri`、横画面専用）。ゲームのファイルはアプリに同梱しているので、オフラインでも遊べます。

- 動作確認用 APK（デバッグ署名・テスト広告）のリリース画面：https://github.com/techgymjp/kamakiri/releases/tag/android-latest
- APK を直接ダウンロード：https://github.com/techgymjp/kamakiri/releases/latest/download/kamakiri.apk
- スマホで読み取る QR コード（リリース画面）：

  ![Android APK のリリース画面](docs/apk-qr.png)

ストアの掲載文の下書きは `docs/store/listing.md` にあります。

main ブランチに push すると GitHub Actions（`.github/workflows/android.yml`）が APK を作り、上のリリース画面の APK を差し替えます。
GitHub Secrets にアップロード鍵（`ANDROID_KEYSTORE_BASE64` など 4 つ）を登録すると、Google Play 用の署名付き AAB も作られます（Actions の実行結果の Artifacts に `kamakiri-release-aab`）。

アプリ版で加わるもの：

- 広告（AdMob）
  - バナー：トップ・あそびかた・ポーズ・結果画面の下中央だけ（プレイ中は出さない）
  - 全画面広告：プレイ開始、タイトルへ戻る、ポーズからの再開、結果画面からの「次の相手へ／コンティニュー／もう一度」のたび
  - リワード広告：負けたラウンドの直後に「広告を見てやり直す」を出す（1 ゲーム 3 回まで）。最後まで見ると、そのラウンドを負ける前の状態からやり直せる。使った回数は結果画面とシェア文に出る
- Android の戻るボタン：プレイ中はポーズ（ポーズ中は再開）、トップと結果画面ではアプリを終了
- 別のアプリに切り替えると自動でポーズし、音を止める
- シェアは Android の共有メニュー
- トップ画面にバージョン、プライバシーポリシー、（EU など同意が必要な地域では）広告の設定

開発用のコマンド：

```bash
npm ci
```

```bash
npm run android:sync
```

本番の AdMob ID は、アプリ ID を `android/app/src/main/res/values/strings.xml` の `admob_app_id` に、広告ユニット ID を `ads.js` の `UNITS.android.production` に入れます。ID が空の種類は本番ビルドでは出しません。

## ライセンス

このゲームのソースコード・画像・音声などの著作権はテックジム株式会社に帰属します（All rights reserved）。許可なく複製・改変・再配布すること、Web サイトやアプリとして公開・販売することを禁止します。テックジムの受講生が学習目的で複製・改変することは許可します（アプリストアでの公開・広告・販売などの商用利用は不可）。詳しくは `LICENSE` を見てください。同梱の Three.js は MIT License です。

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
