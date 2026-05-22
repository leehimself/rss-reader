# RSS Reader

妗岄潰 RSS 鑱氬悎闃呰鍣紝鍩轰簬 Electron + React + Express + SQLite 鏋勫缓銆?
## 鍔熻兘鐗规€?
- **璁㈤槄绠＄悊** 鈥?鏀寔 RSS 2.0 / Atom / JSON Feed锛屾敮鎸?RSSHub 闀滃儚棰勮锛岃嚜鍔ㄥ彂鐜扮綉椤?Feed 閾炬帴
- **鏂囩珷闃呰** 鈥?宸︿晶鍒嗙被/Feed 鏍?+ 鏂囩珷鍒楄〃 + 鍙充晶鏂囩珷璇︽儏鐨勪笁鏍忓竷灞€锛涢€氳繃 @mozilla/readability 鎻愬彇鍏ㄦ枃
- **鍏ㄦ枃鎼滅储** 鈥?SQLite FTS5 鍏ㄦ枃妫€绱㈠紩鎿庯紝鎼滅储鏍囬/鎽樿/姝ｆ枃
- **鍒嗙被鏁寸悊** 鈥?鑷畾涔夊垎绫伙紝鎸?Feed 鎴栧垎绫绘煡鐪嬫湭璇绘枃绔?- **闃呰鐘舵€?* 鈥?鏈/宸茶鏍囪锛屾枃绔犳敹钘忥紙鏄熸爣锛夛紝鎵归噺鏍囪宸茶
- **鑷姩鍒锋柊** 鈥?鍙厤缃埛鏂伴棿闅旂殑鍚庡彴瀹氭椂鍒锋柊锛岄敊璇?Feed 鎸囨暟閫€閬块噸璇?- **鍐呭娓呯悊** 鈥?鑷姩娓呯悊杩囨湡宸茶鏂囩珷锛堝彲閰嶇疆淇濈暀澶╂暟鍜屾瘡 Feed 鏈€澶ф潯鏁帮級
- **鍥剧墖浠ｇ悊** 鈥?HMAC 璁よ瘉鐨勬湰鍦板浘鐗囩紦瀛樹唬鐞嗭紝寤惰繜鍔犺浇
- **瑙嗛宓屽叆** 鈥?YouTube / Bilibili / Vimeo 鑷姩杞崲涓哄祵鍏ュ紡鎾斁鍣?- **CCTV 澶瑙嗛** 鈥?閫氳繃 hls.js 鎾斁澶瑙嗛
- **鍐呭閫傞厤** 鈥?閽堝澶缃戙€佹編婀冩柊闂荤瓑绔欑偣鐨勫畾鍒跺唴瀹规彁鍙?- **OPML 瀵煎叆瀵煎嚭** 鈥?鏍囧噯 OPML 2.0 鏍煎紡锛屽紓姝ュ鍏ュ甫杩涘害璺熻釜
- **鏁版嵁搴撳浠?* 鈥?鍒涘缓/鎭㈠鏁版嵁搴撳浠?- **妗岄潰闆嗘垚** 鈥?绯荤粺鎵樼洏銆佸崟瀹炰緥閿併€佸紑鏈鸿嚜鍚€乨eep link锛坒eed://锛?- **妗岄潰閫氱煡** 鈥?鏂版枃绔犳闈㈤€氱煡锛堝彲閰嶇疆锛?- **涓婚鍒囨崲** 鈥?娴呰壊/娣辫壊/璺熼殢绯荤粺涓婚
- **閿洏蹇嵎閿?* 鈥?`j/k` 瀵艰埅锛宍m` 鍒囨崲宸茶锛宍s` 鍒囨崲鏄熸爣锛宍r` 鍒锋柊
- **绂荤嚎妫€娴?* 鈥?缃戠粶鐘舵€佹彁绀烘í骞?- **浠ｇ悊鏀寔** 鈥?鏀寔 HTTPS_PROXY / HTTP_PROXY 鐜鍙橀噺
- **缁撴瀯鍖栨棩蹇?* 鈥?Winston 鏃ュ織锛屾瘡鏃ヨ疆杞紝14 澶╀繚鐣?
## 鎶€鏈爤

| 灞?| 鎶€鏈?|
|---|---|
| 鍓嶇 | React 18, TypeScript, React Router 7, Zustand, Tailwind CSS 3, Vite 6 |
| 妗岄潰 | Electron 34, electron-builder 26 |
| 鍚庣 | Express 5, TypeScript锛堝唴宓屼簬 Electron 涓昏繘绋嬶級 |
| 鏁版嵁搴?| SQLite via better-sqlite3锛學AL 妯″紡锛孎TS5 |
| 娴嬭瘯 | Vitest锛堝崟鍏冿級锛孭laywright锛圗2E锛?|
| 宸ヤ綔绾跨▼ | worker_threads锛圧SS 鎶撳彇銆佹枃绔犲瘜鍖栥€佸浘鐗囦笅杞斤級 |

## 蹇€熷紑濮?
```bash
# 瀹夎渚濊禆
npm install

# 寮€鍙戞ā寮忥紙鍚姩 Vite + Electron锛?npm run dev

# 杩愯娴嬭瘯
npm test

# E2E 娴嬭瘯
npm run test:e2e
```

## 鏋勫缓

```bash
npm run electron:build
```

鏋勫缓浜х墿浣嶄簬 `release/` 鐩綍銆?
## 椤圭洰缁撴瀯

```
rss-reader/
鈹溾攢鈹€ electron/          # Electron 涓昏繘绋?鈹溾攢鈹€ preload/           # Electron preload 鑴氭湰
鈹溾攢鈹€ server/            # Express 鍚庣锛堣矾鐢便€丷SS 鎶撳彇銆佹暟鎹簱杩佺Щ銆佸伐浣滅嚎绋嬶級
鈹?  鈹溾攢鈹€ routes/        # API 璺敱锛坒eeds, articles, categories, opml, 绛夛級
鈹?  鈹溾攢鈹€ rss/           # RSS 鏍稿績閫昏緫锛堟姄鍙栥€佸瘜鍖栥€佽皟搴︺€佹竻鐞嗭級
鈹?  鈹斺攢鈹€ workers/       # 宸ヤ綔绾跨▼锛圧SS銆佸瘜鍖栥€佸浘鐗囷級
鈹溾攢鈹€ src/               # React 鍓嶇
鈹?  鈹溾攢鈹€ pages/         # 椤甸潰缁勪欢
鈹?  鈹溾攢鈹€ components/    # UI 缁勪欢
鈹?  鈹溾攢鈹€ hooks/         # React Hooks
鈹?  鈹溾攢鈹€ store/         # Zustand 鐘舵€佺鐞?鈹?  鈹斺攢鈹€ lib/           # 宸ュ叿搴?鈹溾攢鈹€ shared/            # 鍓嶅悗绔叡浜被鍨嬪拰宸ュ叿
鈹溾攢鈹€ public/            # 闈欐€佽祫婧?鈹溾攢鈹€ assets/            # 鍥炬爣璧勬簮
鈹斺攢鈹€ build/             # 鏋勫缓璧勬簮
```

## 閰嶇疆

| 鐜鍙橀噺 | 璇存槑 | 榛樿鍊?|
|---|---|---|
| `VITE_DEV_SERVER_PORT` | 寮€鍙戞湇鍔″櫒绔彛 | 5173 |
| `HTTPS_PROXY` / `HTTP_PROXY` | HTTP 浠ｇ悊鍦板潃 | - |

搴旂敤鍐呰缃紙瀛樺偍浜?`settings` 琛級锛?
| 璁剧疆椤?| 璇存槑 | 榛樿鍊?|
|---|---|---|
| `refresh_interval` | 鍒锋柊闂撮殧锛堝垎閽燂級 | 30 |
| `theme` | 涓婚 | system |
| `max_keep_days` | 鏂囩珷淇濈暀澶╂暟 | 90 |
| `max_articles_per_feed` | 姣?Feed 鏈€澶ф枃绔犳暟 | 500 |
| `enable_notifications` | 鍚敤閫氱煡 | true |
| `open_at_login` | 寮€鏈鸿嚜鍚?| false |
| `minimize_to_tray` | 鏈€灏忓寲鍒版墭鐩?| true |
| `log_level` | 鏃ュ織绾у埆 | info |

## 閿紶鎿嶄綔

| 蹇嵎閿?| 鍔熻兘 |
|---|---|
| `j` / `鈫揱 | 涓嬩竴鏉℃枃绔?|
| `k` / `鈫慲 | 涓婁竴鏉℃枃绔?|
| `m` | 鍒囨崲宸茶/鏈 |
| `s` | 鍒囨崲鏄熸爣 |
| `r` | 鍒锋柊褰撳墠 Feed |
| 鍙抽敭 | 涓婁笅鏂囪彍鍗曪紙澶嶅埗銆佹墦寮€閾炬帴銆佸叏閫夛級 |

## 璁稿彲璇?
MIT
