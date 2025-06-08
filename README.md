# 四川省

[Akashic Engine](https://akashic-games.github.io/) で作られたミニゲームです。

## 利用方法

https://akashic-games.github.io/tutorial/v2/


## 幾星霜を経て荒廃していたのでメモ

アツマールが終了したので、ローカルで動かすところまでの手順。

```
$ node -v
v22.16.0
```

akashic 2系の最新版をインストール https://www.npmjs.com/package/@akashic/akashic-cli/v/2.17.26

```
npm install -g @akashic/akashic-cli@2.17.26
```

動作確認。以下のコマンドで出来上がった html をブラウザで開く。

```
akashic export html -o ../exported-my-game
```

## License

MIT
