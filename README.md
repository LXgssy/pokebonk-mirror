# PokéBonk 镜像站（非官方粉丝镜像）

> 本仓库是 [PokéBonk](https://pokebonk.com)（原站）的**非官方粉丝镜像**前端与资源备份，仅用于研究学习与大陆访问加速，与原作者/官方无任何关联。游戏内容版权归原站所有。

## 在线入口

| 站点 | 地址 | 说明 |
| --- | --- | --- |
| 游戏主站 | https://pokebonk-play2.rth1.xyz/ | WebOS 桌面 + 游戏完整可玩 |
| APK 下载页 | https://webos-cdn7.rth1.xyz/apk/download.html | 安卓客户端 v1.1 / v1.2 分片下载 |

## 仓库内容

```
index.html          WebOS 桌面入口（计算器彩蛋 67677891 进游戏）
game.html           游戏入口 + 下载门（预热/缓存/兜底链）
assets/             游戏全量静态资源（含 736 个 M PLUS Rounded 字体子集）
data/               游戏数据 JSON（宝可梦/招式/道具/特性/学习表）
apk/download.html   安卓 APK 分片下载页
pb-warmlist.json    资源预热清单 v5（6 站路由表）
pb-sw.js            Service Worker（历史 b64 媒体层，当前未注册）
```

## 账号与数据

- 账号/存档/排行榜由自建后端（`pokebonk-ops` 私有仓库中的 pbapi.py）+ 云 KV 提供，**与原站完全不互通**。
- 本仓库不含任何用户数据与后端代码。

## APK

- v1.1：历史版本（缺训练家卡 20 件套与字体）
- v1.2：内置全量资源 4635 件（含训练家卡 56 件套 + 736 字体 + 数据层），签名与 v1.1 相同（可直接覆盖安装）
- 下载渠道：热铁盒 CDN（大陆直连快）/ GitHub Releases（备用）

## 声明

- 本镜像 100% 静态前端 + 自建后端，运行时不连接原站 API（仅公告 /status /news 只读代理）。
- 如需支持原作者，请访问原站。
