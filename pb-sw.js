/* PokéBonk 镜像 Service Worker v12 — b64媒体层 + 运行时缓存 + 预热 + 同源静态m5兜底
 * v12: 同源静态(assets/data) 404/网络失败 -> pokebonk-m5 同路径兜底 (play2 文件数配额内
 *      无法容纳 env atlas.json 等, 副本存媒体站; 命中后写入本地缓存, 之后零跨站)
 * v9: 媒体缓存键改为 pathname (主机无关+查询无关):
 * v9: 媒体缓存键改为 pathname (主机无关+查询无关):
 *     页面预热(pokebonk-res)与游戏请求(m2-m10/?v=hash)命中同一缓存条目;
 *     预热清单 pb-warmlist.json (宝可梦模型/图标优先)
 * v8: 全新缓存名(孤立v1-v7一切旧缓存, 用户端毒缓存一次性清零);
 *     fetchB64 多主机容灾(映射主机失败自动尝试全部b64主机);
 *     其余策略与v5-v7一致
 * v5: 平台二进制存储不稳定(清除/截断/丢失) -> 全媒体 base64 文本层:
 *  - 媒体请求(图片/音频/模型/字体/gz): SW 内嵌路由表定位 .b64.txt -> 解码返回 (CORS-clean)
 *  - b64 失败 -> 回退原二进制 fetch
 *  - 解码结果写入 pb-media-v9 缓存, 二次访问零网络
 *  - 同源静态 SWR 保持; /pbapi.py 与 /admin 永不拦截
 */
const CACHE = 'pb-static-v12';
const MEDIA = 'pb-media-v9';
const MEDIA_RE = /^https:\/\/pokebonk-(res|a2|cdn1|game|m1|m2|m3|m4|m5|m6|m7|m8|m9|m10|m11|m12)\.rth1\.xyz\//;
const B64_EXT = /\.(png|ogg|glb|jpg|jpeg|webp|mp3|wav|woff2?|ico|gz)(\?|$)/i;
var PBH = ["pokebonk-m10.rth1.xyz/", "pokebonk-m5.rth1.xyz/", "pokebonk-m6.rth1.xyz/", "pokebonk-m7.rth1.xyz/", "pokebonk-m8.rth1.xyz/", "pokebonk-m9.rth1.xyz/"];
var PBMDM = {"assets": 5, "assets/cries": 2, "assets/env": 4, "assets/front": 4, "assets/icons": 4, "assets/items": 5, "assets/models": 5, "assets/music": 5, "assets/pmd": 0, "assets/pmd-shiny": 5, "assets/portraits": 3, "assets/portraits-shiny": 0, "assets/ui": 3, "data": 1};
var PBMDX = {"assets/ui/icons/map-ball.png": 1,"assets/ui/icons/map-bill.png": 1,"assets/ui/icons/map-boss.png": 1,"assets/ui/icons/map-cage.png": 1,"assets/ui/icons/map-challenge.png": 1,"assets/ui/icons/map-cursedball.png": 1,"assets/ui/icons/map-freeball.png": 1,"assets/ui/icons/map-portal.png": 1,"assets/ui/icons/map-rock.png": 1,"assets/ui/icons/map-shrine.png": 1,"assets/ui/icons/map-shroom.png": 1,"assets/ui/icons/map-unown.png": 1,"assets/items/tm-electric.png": 1,"assets/items/tm-fighting.png": 1,"assets/items/tm-normal.png": 1,"assets/items/tm-psychic.png": 1,"assets/items/tm-steel.png": 1,"assets/music/ingame1.ogg": 1,"assets/music/ingame2.ogg": 1,"assets/music/ingame3.ogg": 1,"assets/env/common/hazards.png": 1,"assets/ui/icons/coin.png": 1,"assets/ui/icons/ofrenda.png": 1,"assets/items/comet-shard.png": 1,"assets/items/magnet.png": 1,"assets/items/oran-berry.png": 1,"assets/items/poke-ball.png": 1,"assets/700-C0uOpRep-mvkwzlv4.css": 2, "assets/800-Bo1eKVau-mvkwzlv4.css": 2, "assets/900-pAEnL1PA-mvkwzlv4.css": 2, "assets/cries/965.ogg": 4, "assets/cries/966.ogg": 4, "assets/cries/967.ogg": 4, "assets/cries/968.ogg": 4, "assets/cries/969.ogg": 4, "assets/cries/97.ogg": 4, "assets/cries/970.ogg": 4, "assets/cries/971.ogg": 4, "assets/cries/972.ogg": 4, "assets/cries/973.ogg": 4, "assets/cries/974.ogg": 4, "assets/cries/975.ogg": 4, "assets/cries/976.ogg": 4, "assets/cries/977.ogg": 4, "assets/cries/978.ogg": 4, "assets/cries/979.ogg": 4, "assets/cries/98.ogg": 4, "assets/cries/980.ogg": 4, "assets/cries/981.ogg": 4, "assets/cries/982.ogg": 4, "assets/cries/983.ogg": 4, "assets/cries/984.ogg": 4, "assets/cries/985.ogg": 4, "assets/cries/986.ogg": 4, "assets/cries/987.ogg": 4, "assets/cries/988.ogg": 4, "assets/cries/989.ogg": 4, "assets/cries/99.ogg": 4, "assets/cries/990.ogg": 4, "assets/cries/991.ogg": 4, "assets/cries/992.ogg": 4, "assets/cries/993.ogg": 4, "assets/cries/994.ogg": 4, "assets/cries/995.ogg": 4, "assets/cries/996.ogg": 4, "assets/cries/997.ogg": 4, "assets/cries/998.ogg": 4, "assets/cries/999.ogg": 4, "assets/cyrillic-600-CStX56Aq-mvkwzlv4.css": 4, "assets/cyrillic-700-BlbDeK1m-mvkwzlv4.css": 4, "assets/cyrillic-800-DDlHMZTd-mvkwzlv4.css": 4, "assets/cyrillic-900-DkHbazAH-mvkwzlv4.css": 4, "assets/en-nVLaC0zQ-mvkwzlv4.js": 4, "assets/en-nVLaC0zQ-mvkwzlv4.js.gz": 4, "assets/fr-q5eyEuwJ-mvkwzlv4.js": 4, "assets/fr-q5eyEuwJ-mvkwzlv4.js.gz": 4, "assets/i18n-Bjw6RPm7-mvkwzlv4.js": 4, "assets/icons/683.png": 5, "assets/icons/687.png": 5, "assets/icons/688.png": 5, "assets/icons/689.png": 5, "assets/icons/69.png": 5, "assets/icons/690.png": 5, "assets/icons/691.png": 5, "assets/icons/692.png": 5, "assets/icons/693.png": 5, "assets/icons/694.png": 5, "assets/icons/695.png": 5, "assets/icons/696.png": 5, "assets/icons/697.png": 5, "assets/icons/698.png": 5, "assets/icons/699.png": 5, "assets/icons/7.png": 5, "assets/icons/70.png": 5, "assets/icons/700.png": 5, "assets/icons/701.png": 5, "assets/icons/702.png": 5, "assets/icons/703.png": 5, "assets/icons/704.png": 5, "assets/icons/705.png": 5, "assets/icons/706.png": 5, "assets/icons/707.png": 5, "assets/icons/708.png": 5, "assets/icons/709.png": 5, "assets/icons/71.png": 5, "assets/icons/710.png": 5, "assets/icons/711.png": 5, "assets/icons/712.png": 5, "assets/icons/713.png": 5, "assets/icons/714.png": 5, "assets/icons/715.png": 5, "assets/icons/716.png": 5, "assets/icons/717.png": 5, "assets/icons/718.png": 5, "assets/icons/719.png": 5, "assets/icons/72.png": 5, "assets/icons/720.png": 5, "assets/icons/721.png": 5, "assets/icons/722.png": 5, "assets/icons/723.png": 5, "assets/icons/724.png": 5, "assets/icons/725.png": 5, "assets/icons/726.png": 5, "assets/icons/727.png": 5, "assets/icons/728.png": 5, "assets/icons/729.png": 5, "assets/icons/73.png": 5, "assets/icons/730.png": 5, "assets/icons/731.png": 5, "assets/icons/732.png": 5, "assets/icons/733.png": 5, "assets/icons/734.png": 5, "assets/icons/735.png": 5, "assets/icons/736.png": 5, "assets/icons/737.png": 5, "assets/icons/738.png": 5, "assets/icons/739.png": 5, "assets/icons/74.png": 5, "assets/icons/740.png": 5, "assets/icons/741.png": 5, "assets/icons/742.png": 5, "assets/icons/743.png": 5, "assets/icons/744.png": 5, "assets/icons/745.png": 5, "assets/icons/746.png": 5, "assets/icons/747.png": 5, "assets/icons/748.png": 5, "assets/icons/749.png": 5, "assets/icons/75.png": 5, "assets/icons/750.png": 5, "assets/icons/751.png": 5, "assets/icons/752.png": 5, "assets/icons/753.png": 5, "assets/icons/754.png": 5, "assets/icons/755.png": 5, "assets/icons/756.png": 5, "assets/icons/757.png": 5, "assets/icons/758.png": 5, "assets/icons/759.png": 5, "assets/icons/76.png": 5, "assets/icons/760.png": 5, "assets/icons/761.png": 5, "assets/icons/762.png": 5, "assets/icons/763.png": 5, "assets/icons/764.png": 5, "assets/icons/765.png": 5, "assets/icons/766.png": 5, "assets/icons/767.png": 5, "assets/icons/768.png": 5, "assets/icons/769.png": 5, "assets/icons/77.png": 5, "assets/icons/770.png": 5, "assets/icons/771.png": 5, "assets/icons/772.png": 5, "assets/icons/773.png": 5, "assets/icons/774.png": 5, "assets/icons/775.png": 5, "assets/icons/776.png": 5, "assets/icons/777.png": 5, "assets/icons/778.png": 5, "assets/icons/779.png": 5, "assets/icons/78.png": 5, "assets/icons/780.png": 5, "assets/icons/781.png": 5, "assets/icons/782.png": 5, "assets/icons/783.png": 5, "assets/icons/784.png": 5, "assets/icons/785.png": 5, "assets/icons/786.png": 5, "assets/icons/787.png": 5, "assets/icons/788.png": 5, "assets/icons/789.png": 5, "assets/icons/79.png": 5, "assets/icons/790.png": 5, "assets/icons/791.png": 5, "assets/icons/792.png": 5, "assets/icons/793.png": 5, "assets/icons/794.png": 5, "assets/icons/795.png": 5, "assets/icons/796.png": 5, "assets/icons/797.png": 5, "assets/icons/798.png": 5, "assets/icons/799.png": 5, "assets/icons/8.png": 5, "assets/icons/80.png": 5, "assets/icons/800.png": 5, "assets/icons/801.png": 5, "assets/icons/802.png": 5, "assets/icons/803.png": 5, "assets/icons/804.png": 5, "assets/icons/805.png": 5, "assets/icons/806.png": 5, "assets/icons/807.png": 5, "assets/icons/808.png": 5, "assets/icons/809.png": 5, "assets/icons/81.png": 5, "assets/icons/810.png": 5, "assets/icons/811.png": 5, "assets/icons/812.png": 5, "assets/icons/813.png": 5, "assets/icons/814.png": 5, "assets/icons/815.png": 5, "assets/icons/816.png": 5, "assets/icons/817.png": 5, "assets/icons/818.png": 5, "assets/icons/819.png": 5, "assets/icons/82.png": 5, "assets/icons/820.png": 5, "assets/icons/821.png": 5, "assets/icons/822.png": 5, "assets/icons/823.png": 5, "assets/icons/824.png": 5, "assets/icons/825.png": 5, "assets/icons/826.png": 5, "assets/icons/827.png": 5, "assets/icons/828.png": 5, "assets/icons/829.png": 5, "assets/icons/83.png": 5, "assets/icons/830.png": 5, "assets/icons/831.png": 5, "assets/icons/832.png": 5, "assets/icons/833.png": 5, "assets/icons/834.png": 5, "assets/icons/835.png": 5, "assets/icons/836.png": 5, "assets/icons/837.png": 5, "assets/icons/838.png": 5, "assets/icons/839.png": 5, "assets/icons/84.png": 5, "assets/icons/840.png": 5, "assets/icons/841.png": 5, "assets/icons/842.png": 5, "assets/icons/843.png": 5, "assets/icons/844.png": 5, "assets/icons/845.png": 5, "assets/icons/846.png": 5, "assets/icons/847.png": 5, "assets/icons/848.png": 5, "assets/icons/849.png": 5, "assets/icons/85.png": 5, "assets/icons/850.png": 5, "assets/icons/851.png": 5, "assets/icons/852.png": 5, "assets/icons/853.png": 5, "assets/icons/854.png": 5, "assets/icons/855.png": 5, "assets/icons/856.png": 5, "assets/icons/857.png": 5, "assets/icons/858.png": 5, "assets/icons/859.png": 5, "assets/icons/86.png": 5, "assets/icons/860.png": 5, "assets/icons/861.png": 5, "assets/icons/862.png": 5, "assets/icons/863.png": 5, "assets/icons/864.png": 5, "assets/icons/865.png": 5, "assets/icons/866.png": 5, "assets/icons/867.png": 5, "assets/icons/868.png": 5, "assets/icons/869.png": 5, "assets/icons/87.png": 5, "assets/icons/870.png": 5, "assets/icons/871.png": 5, "assets/icons/872.png": 5, "assets/icons/873.png": 5, "assets/icons/874.png": 5, "assets/icons/875.png": 5, "assets/icons/876.png": 5, "assets/icons/877.png": 5, "assets/icons/878.png": 5, "assets/icons/879.png": 5, "assets/icons/88.png": 5, "assets/icons/880.png": 5, "assets/icons/881.png": 5, "assets/icons/882.png": 5, "assets/icons/883.png": 5, "assets/icons/884.png": 5, "assets/icons/885.png": 5, "assets/icons/886.png": 5, "assets/icons/887.png": 5, "assets/icons/888.png": 5, "assets/icons/889.png": 5, "assets/icons/89.png": 5, "assets/icons/890.png": 5, "assets/icons/891.png": 5, "assets/icons/892.png": 5, "assets/icons/893.png": 5, "assets/icons/894.png": 5, "assets/icons/895.png": 5, "assets/icons/896.png": 5, "assets/icons/897.png": 5, "assets/icons/898.png": 5, "assets/icons/899.png": 5, "assets/icons/9.png": 5, "assets/icons/90.png": 5, "assets/icons/900.png": 5, "assets/icons/901.png": 5, "assets/icons/902.png": 5, "assets/icons/903.png": 5, "assets/icons/904.png": 5, "assets/icons/905.png": 5, "assets/icons/906.png": 5, "assets/icons/907.png": 5, "assets/icons/908.png": 5, "assets/icons/909.png": 5, "assets/icons/91.png": 5, "assets/icons/910.png": 5, "assets/icons/911.png": 5, "assets/icons/912.png": 5, "assets/icons/913.png": 5, "assets/icons/914.png": 5, "assets/icons/915.png": 5, "assets/icons/916.png": 5, "assets/icons/917.png": 5, "assets/icons/918.png": 5, "assets/icons/919.png": 5, "assets/icons/92.png": 5, "assets/icons/920.png": 5, "assets/icons/921.png": 5, "assets/icons/922.png": 5, "assets/icons/923.png": 5, "assets/icons/924.png": 5, "assets/icons/925.png": 5, "assets/icons/926.png": 5, "assets/icons/927.png": 5, "assets/icons/928.png": 5, "assets/icons/929.png": 5, "assets/icons/93.png": 5, "assets/icons/930.png": 5, "assets/icons/931.png": 5, "assets/icons/932.png": 5, "assets/icons/933.png": 5, "assets/icons/934.png": 5, "assets/icons/935.png": 5, "assets/icons/936.png": 5, "assets/icons/937.png": 5, "assets/icons/938.png": 5, "assets/icons/939.png": 5, "assets/icons/94.png": 5, "assets/icons/940.png": 5, "assets/icons/941.png": 5, "assets/icons/942.png": 5, "assets/icons/943.png": 5, "assets/icons/944.png": 5, "assets/icons/945.png": 5, "assets/icons/946.png": 5, "assets/icons/947.png": 5, "assets/icons/948.png": 5, "assets/icons/949.png": 5, "assets/icons/95.png": 5, "assets/icons/950.png": 5, "assets/icons/951.png": 5, "assets/icons/952.png": 5, "assets/icons/953.png": 5, "assets/icons/954.png": 5, "assets/icons/955.png": 5, "assets/icons/956.png": 5, "assets/icons/957.png": 5, "assets/icons/958.png": 5, "assets/icons/959.png": 5, "assets/icons/96.png": 5, "assets/icons/960.png": 5, "assets/icons/961.png": 5, "assets/icons/962.png": 5, "assets/icons/963.png": 5, "assets/icons/964.png": 5, "assets/icons/965.png": 5, "assets/icons/966.png": 5, "assets/icons/967.png": 5, "assets/icons/968.png": 5, "assets/icons/969.png": 5, "assets/icons/97.png": 5, "assets/icons/970.png": 5, "assets/icons/971.png": 5, "assets/icons/972.png": 5, "assets/icons/973.png": 5, "assets/icons/974.png": 5, "assets/icons/975.png": 5, "assets/icons/976.png": 5, "assets/icons/977.png": 5, "assets/icons/978.png": 5, "assets/icons/979.png": 5, "assets/icons/98.png": 5, "assets/icons/980.png": 5, "assets/icons/981.png": 5, "assets/icons/982.png": 5, "assets/icons/983.png": 5, "assets/icons/984.png": 5, "assets/icons/985.png": 5, "assets/icons/986.png": 5, "assets/icons/987.png": 5, "assets/icons/988.png": 5, "assets/icons/989.png": 5, "assets/icons/99.png": 5, "assets/icons/990.png": 5, "assets/icons/991.png": 5, "assets/icons/992.png": 5, "assets/icons/993.png": 5, "assets/icons/994.png": 5, "assets/icons/995.png": 5, "assets/icons/996.png": 5, "assets/icons/997.png": 5, "assets/icons/998.png": 5, "assets/icons/999.png": 5, "assets/pmd/1.png": 5, "assets/pmd/10.png": 5, "assets/pmd/100.png": 5, "assets/pmd/1000.png": 5, "assets/pmd/1004.png": 5, "assets/pmd/1005.png": 5, "assets/pmd/1006.png": 5, "assets/pmd/1007.png": 5, "assets/pmd/1009.png": 5, "assets/pmd/101.png": 5, "assets/pmd/1010.png": 5, "assets/pmd/1011.png": 5, "assets/pmd/1012.png": 5, "assets/pmd/1013.png": 5, "assets/pmd/1015.png": 5, "assets/pmd/1016.png": 5, "assets/pmd/1017.png": 5, "assets/pmd/1018.png": 5, "assets/pmd/1019.png": 5, "assets/pmd/102.png": 5, "assets/pmd/1024.png": 5, "assets/pmd/1025.png": 5, "assets/pmd/103.png": 5, "assets/pmd/104.png": 5, "assets/pmd/105.png": 5, "assets/pmd/106.png": 5, "assets/pmd/107.png": 5, "assets/pmd/108.png": 5, "assets/pmd/109.png": 5, "assets/pmd/11.png": 5, "assets/pmd/110.png": 5, "assets/pmd/111.png": 5, "assets/pmd/112.png": 5, "assets/pmd/113.png": 5, "assets/pmd/114.png": 5, "assets/pmd/115.png": 5, "assets/pmd/116.png": 5, "assets/pmd/117.png": 5, "assets/pmd/118.png": 5, "assets/pmd/119.png": 5, "assets/pmd/12.png": 5, "assets/pmd/120.png": 5, "assets/pmd/121.png": 5, "assets/pmd/122.png": 5, "assets/pmd/123.png": 5, "assets/pmd/124.png": 5, "assets/pmd/125.png": 5, "assets/pmd/126.png": 5, "assets/pmd/127.png": 5, "assets/pmd/128.png": 5, "assets/pmd/129.png": 5, "assets/pmd/13.png": 5, "assets/pmd/130.png": 5, "assets/pmd/131.png": 5, "assets/pmd/132.png": 5, "assets/pmd/133.png": 5, "assets/pmd/134.png": 5, "assets/pmd/135.png": 5, "assets/pmd/136.png": 5, "assets/pmd/137.png": 5, "assets/pmd/138.png": 5, "assets/pmd/139.png": 5, "assets/pmd/14.png": 5, "assets/pmd/140.png": 5, "assets/pmd/141.png": 5, "assets/pmd/142.png": 5, "assets/pmd/143.png": 5, "assets/pmd/144.png": 5, "assets/pmd/145.png": 5, "assets/pmd/146.png": 5, "assets/pmd/147.png": 5, "assets/pmd/148.png": 5, "assets/pmd/149.png": 5, "assets/pmd/15.png": 5, "assets/pmd/150.png": 5, "assets/pmd/151.png": 5, "assets/pmd/152.png": 5, "assets/pmd/153.png": 5, "assets/pmd/154.png": 5, "assets/pmd/155.png": 5, "assets/pmd/156.png": 5, "assets/pmd/157.png": 5, "assets/pmd/158.png": 5, "assets/pmd/159.png": 5, "assets/pmd/16.png": 5, "assets/pmd/160.png": 5, "assets/pmd/161.png": 5, "assets/pmd/162.png": 5, "assets/pmd/163.png": 5, "assets/pmd/164.png": 5, "assets/pmd/165.png": 5, "assets/pmd/166.png": 5, "assets/pmd/167.png": 5, "assets/pmd/168.png": 5, "assets/pmd/169.png": 5, "assets/pmd/17.png": 5, "assets/pmd/170.png": 5, "assets/pmd/171.png": 5, "assets/pmd/172.png": 5, "assets/pmd/173.png": 5, "assets/pmd/174.png": 5, "assets/pmd/175.png": 5, "assets/pmd/176.png": 5, "assets/pmd/177.png": 5, "assets/pmd/178.png": 5, "assets/pmd/179.png": 5, "assets/pmd/18.png": 5, "assets/pmd/180.png": 5, "assets/pmd/181.png": 5, "assets/pmd/182.png": 5, "assets/pmd/183.png": 5, "assets/pmd/184.png": 5, "assets/pmd/185.png": 5, "assets/pmd/186.png": 5, "assets/pmd/187.png": 5, "assets/pmd/188.png": 5, "assets/pmd/189.png": 5, "assets/pmd/19.png": 5, "assets/pmd/190.png": 5, "assets/pmd/191.png": 5, "assets/pmd/192.png": 5, "assets/pmd/193.png": 5, "assets/pmd/194.png": 5, "assets/pmd/195.png": 5, "assets/pmd/196.png": 5, "assets/pmd/197.png": 5, "assets/pmd/198.png": 5, "assets/pmd/199.png": 5, "assets/pmd/2.png": 5, "assets/pmd/20.png": 5, "assets/pmd/200.png": 5, "assets/pmd/201.png": 5, "assets/pmd/202.png": 5, "assets/pmd/203.png": 5, "assets/pmd/204.png": 5, "assets/pmd/205.png": 5, "assets/pmd/206.png": 5, "assets/pmd/207.png": 5, "assets/pmd/208.png": 5, "assets/pmd/209.png": 5, "assets/pmd/21.png": 5, "assets/pmd/210.png": 5, "assets/pmd/211.png": 5, "assets/pmd/212.png": 5, "assets/pmd/213.png": 5, "assets/pmd/214.png": 5, "assets/pmd/215.png": 5, "assets/pmd/216.png": 5, "assets/pmd/217.png": 5, "assets/pmd/218.png": 5, "assets/pmd/219.png": 5, "assets/pmd/22.png": 5, "assets/pmd/220.png": 5, "assets/pmd/221.png": 5, "assets/pmd/222.png": 5, "assets/pmd/223.png": 5, "assets/pmd/224.png": 5, "assets/pmd/225.png": 5, "assets/pmd/226.png": 5, "assets/pmd/227.png": 5, "assets/pmd/228.png": 5, "assets/pmd/229.png": 5, "assets/pmd/23.png": 5, "assets/pmd/230.png": 5, "assets/pmd/231.png": 5, "assets/pmd/232.png": 5, "assets/pmd/233.png": 5, "assets/pmd/234.png": 5, "assets/pmd/235.png": 5, "assets/pmd/236.png": 5, "assets/pmd/237.png": 5, "assets/pmd/238.png": 5, "assets/pmd/239.png": 5, "assets/pmd/24.png": 5, "assets/pmd/240.png": 5, "assets/pmd/241.png": 5, "assets/pmd/242.png": 5, "assets/pmd/243.png": 5, "assets/pmd/244.png": 5, "assets/pmd/245.png": 5, "assets/pmd/246.png": 5, "assets/pmd/247.png": 5, "assets/pmd/248.png": 5, "assets/pmd/249.png": 5, "assets/pmd/25.png": 5, "assets/pmd/250.png": 5, "assets/pmd/251.png": 5, "assets/pmd/252.png": 5, "assets/pmd/253.png": 5, "assets/pmd/254.png": 5, "assets/pmd/255.png": 5, "assets/pmd/256.png": 5, "assets/pmd/257.png": 5, "assets/pmd/258.png": 5, "assets/pmd/259.png": 5, "assets/pmd/26.png": 5, "assets/pmd/260.png": 5, "assets/pmd/261.png": 5, "assets/pmd/262.png": 5, "assets/pmd/263.png": 5, "assets/pmd/264.png": 5, "assets/pmd/265.png": 5, "assets/pmd/266.png": 5, "assets/pmd/267.png": 5, "assets/pmd/268.png": 5, "assets/pmd/269.png": 5, "assets/pmd/27.png": 5, "assets/pmd/270.png": 5, "assets/pmd/271.png": 5, "assets/pmd/272.png": 5, "assets/pmd/273.png": 5, "assets/pmd/274.png": 5, "assets/pmd/275.png": 5, "assets/pmd/276.png": 5, "assets/pmd/277.png": 5, "assets/pmd/278.png": 5, "assets/pmd/279.png": 5, "assets/pmd/28.png": 5, "assets/pmd/280.png": 5, "assets/pmd/281.png": 5, "assets/pmd/282.png": 5, "assets/pmd/283.png": 5, "assets/pmd/284.png": 5, "assets/pmd/285.png": 5, "assets/pmd/286.png": 5, "assets/pmd/287.png": 5, "assets/pmd/288.png": 5, "assets/pmd/289.png": 5, "assets/pmd/29.png": 5, "assets/pmd/290.png": 5, "assets/pmd/291.png": 5, "assets/pmd/292.png": 5, "assets/pmd/293.png": 5, "assets/portraits/1.png": 0, "assets/portraits/10.png": 0, "assets/portraits/100.png": 0, "assets/portraits/1000.png": 0, "assets/portraits/1004.png": 0, "assets/portraits/1005.png": 0, "assets/portraits/1006.png": 0, "assets/portraits/1007.png": 0, "assets/portraits/1009.png": 0, "assets/portraits/101.png": 0, "assets/portraits/1010.png": 0, "assets/portraits/1011.png": 0, "assets/portraits/1012.png": 0, "assets/portraits/1013.png": 0, "assets/portraits/1015.png": 0, "assets/portraits/1016.png": 0, "assets/portraits/1017.png": 0, "assets/portraits/1018.png": 0, "assets/portraits/1019.png": 0, "assets/portraits/102.png": 0, "assets/portraits/1024.png": 0, "assets/portraits/1025.png": 0, "assets/portraits/103.png": 0, "assets/portraits/104.png": 0, "assets/portraits/105.png": 0, "assets/portraits/106.png": 0, "assets/portraits/107.png": 0, "assets/portraits/108.png": 0, "assets/portraits/109.png": 0, "assets/portraits/11.png": 0, "assets/portraits/110.png": 0, "assets/portraits/111.png": 0, "assets/portraits/112.png": 0, "assets/portraits/113.png": 0, "assets/portraits/114.png": 0, "assets/portraits/115.png": 0, "assets/portraits/116.png": 0, "assets/portraits/117.png": 0, "assets/portraits/118.png": 0, "assets/portraits/119.png": 0, "assets/portraits/12.png": 0, "assets/portraits/120.png": 0, "assets/portraits/121.png": 0, "assets/portraits/122.png": 0, "assets/portraits/123.png": 0, "assets/portraits/124.png": 0, "assets/portraits/125.png": 0, "assets/portraits/126.png": 0, "assets/portraits/127.png": 0, "assets/portraits/128.png": 0, "assets/portraits/129.png": 0, "assets/portraits/13.png": 0, "assets/portraits/130.png": 0, "assets/portraits/131.png": 0, "assets/portraits/132.png": 0, "assets/portraits/133.png": 0, "assets/portraits/134.png": 0, "assets/portraits/135.png": 0, "assets/portraits/136.png": 0, "assets/portraits/137.png": 0, "assets/portraits/138.png": 0, "assets/portraits/139.png": 0, "assets/portraits/14.png": 0, "assets/portraits/140.png": 0, "assets/portraits/141.png": 0, "assets/portraits/142.png": 0, "assets/portraits/143.png": 0, "assets/portraits/144.png": 0, "assets/portraits/145.png": 0, "assets/portraits/146.png": 0, "assets/portraits/147.png": 0, "assets/portraits/148.png": 0, "assets/portraits/149.png": 0, "assets/portraits/15.png": 0, "assets/portraits/150.png": 0, "assets/portraits/151.png": 0, "assets/portraits/152.png": 0, "assets/portraits/153.png": 0, "assets/portraits/154.png": 0, "assets/portraits/155.png": 0, "assets/portraits/156.png": 0, "assets/portraits/157.png": 0, "assets/portraits/158.png": 0, "assets/portraits/159.png": 0, "assets/portraits/16.png": 0, "assets/portraits/160.png": 0, "assets/portraits/161.png": 0, "assets/portraits/162.png": 0, "assets/portraits/163.png": 0, "assets/portraits/164.png": 0, "assets/portraits/165.png": 0, "assets/portraits/166.png": 0, "assets/portraits/167.png": 0, "assets/portraits/168.png": 0, "assets/portraits/169.png": 0, "assets/portraits/17.png": 0, "assets/portraits/170.png": 0, "assets/portraits/171.png": 0, "assets/portraits/172.png": 0, "assets/portraits/173.png": 0, "assets/portraits/174.png": 0, "assets/portraits/176.png": 0, "assets/pt-D6NoTqaM-mvkwzlv4.js": 3, "assets/pt-D6NoTqaM-mvkwzlv4.js.gz": 3, "assets/ru-BqAZrZxo-mvkwzlv4.js": 3, "assets/ru-BqAZrZxo-mvkwzlv4.js.gz": 3, "assets/three-DmSYIDKK.js": 3, "assets/ui/icons/silver.png": 1, "assets/ui/icons/skip.png": 1, "assets/ui/icons/stardust.png": 1, "assets/ui/icons/streak.png": 1, "assets/ui/icons/target.png": 1, "assets/ui/icons/torre.png": 1, "assets/ui/icons/unlock.png": 1, "assets/ui/icons/vela.png": 1, "assets/ui/ranks/elite.png": 1, "assets/ui/ranks/master.png": 1, "assets/ui/ranks/top10.png": 1, "assets/ui/ranks/top100.png": 1, "assets/ui/ranks/top25.png": 1, "assets/ui/ranks/top50.png": 1, "assets/ui/types/bug.png": 1, "assets/ui/types/dark.png": 1, "assets/ui/types/dragon.png": 1, "assets/ui/types/electric.png": 1, "assets/ui/types/fairy.png": 1, "assets/ui/types/fighting.png": 1, "assets/ui/types/fire.png": 1, "assets/ui/types/flying.png": 1, "assets/ui/types/ghost.png": 1, "assets/ui/types/grass.png": 1, "assets/ui/types/ground.png": 1, "assets/ui/types/ice.png": 1, "assets/ui/types/normal.png": 1, "assets/ui/types/poison.png": 1, "assets/ui/types/psychic.png": 1, "assets/ui/types/rock.png": 1, "assets/ui/types/steel.png": 1, "assets/ui/types/water.png": 1, "assets/zh-Bu0FoiTX-mvkwzlv4.js": 1, "assets/zh-Bu0FoiTX-mvkwzlv4.js.gz": 1, "assets/zht-DLeV0lMg-mvkwzlv4.js": 1, "assets/zht-DLeV0lMg-mvkwzlv4.js.gz": 1};
function b64Host(p) {
  var x = PBMDX[p];
  if (x !== undefined) return PBH[x];
  var parts = p.split("/");
  var d = parts[0] === "assets" && parts.length > 2 ? parts.slice(0, 2).join("/") : parts[0];
  var m = PBMDM[d];
  return PBH[m === undefined ? 0 : m];
}

self.__dbgBuf = [];
self.__dbg = (m) => { try { self.__dbgBuf.push(Date.now() % 100000 + " " + m); if (self.__dbgBuf.length > 200) self.__dbgBuf.shift(); } catch {} };
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'getdbg') e.source.postMessage({type: 'dbg', lines: self.__dbgBuf.slice(-40)});
});
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE && n !== MEDIA).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function fetchWithRetry(req, n) {
  let last;
  for (let i = 0; i < n; i++) {
    try {
      const r = await fetch(req);
      if (r && (r.status === 200 || r.type === 'opaque')) return r;
      if (r && (r.status === 429 || r.status >= 500)) { last = r; await new Promise((x) => setTimeout(x, 350 * (i + 1))); continue; }
      return r;
    } catch (e) { last = e; await new Promise((x) => setTimeout(x, 350 * (i + 1))); }
  }
  return last instanceof Response ? last : Response.error();
}

/* b64 解码通道: 双主机链(映射站 -> 原始请求站) */
function b64Response(bytes, pathname) {
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": pathname.endsWith(".ogg") || pathname.endsWith(".mp3") || pathname.endsWith(".wav") ? "audio/mpeg"
        : pathname.endsWith(".glb") ? "model/gltf-binary"
        : pathname.endsWith(".woff2") ? "font/woff2"
        : pathname.endsWith(".woff") ? "font/woff"
        : pathname.endsWith(".gz") ? "application/gzip"
        : pathname.endsWith(".ico") ? "image/x-icon"
        : "image/png",
      "content-length": String(bytes.length),
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
async function tryB64(b64Url) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(b64Url, { cache: "force-cache" });
      if (self.__dbg) self.__dbg("tryB64 " + b64Url.slice(-50) + " -> " + r.status);
      if (r.ok && r.status === 200) {
        const txt = (await r.text()).replace(/[\s]+/g, "");
        const bin = atob(txt);
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        return b64Response(bytes, new URL(b64Url).pathname.replace(/\.b64\.txt$/, ""));
      }
      if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 400)); continue; }
      return null;
    } catch (e) { if (self.__dbg) self.__dbg("tryB64 ERR " + b64Url.slice(-50) + " " + String(e).slice(0,80)); await new Promise((x) => setTimeout(x, 400)); }
  }
  return null;
}
async function fetchB64(pathKey, origReq, origUrl) {
  const host = b64Host(pathKey);
  const tried = new Set();
  if (host) {
    tried.add(host);
    const r = await tryB64("https://" + host + origUrl.pathname + ".b64.txt");
    if (r) return r;
  }
  // 原始请求主机也试一次 (部分 b64 同时存在于原始站)
  if (MEDIA_RE.test(origUrl.origin + "/")) {
    tried.add(origUrl.host + "/");
    const r2 = await tryB64(origUrl.origin + origUrl.pathname + ".b64.txt");
    if (r2) return r2;
  }
  // v8容灾: 映射主机失败 -> 依次尝试其余全部 b64 主机 (单站限流/故障不再阻断资源)
  for (const h of PBH) {
    if (tried.has(h)) continue;
    tried.add(h);
    const r = await tryB64("https://" + h + origUrl.pathname + ".b64.txt");
    if (r) return r;
  }
  return null;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.pathname.startsWith('/pbapi.py') || url.pathname.startsWith('/admin')) return;
  if (req.cache === 'reload' || req.cache === 'no-cache' || req.cache === 'no-store') return;

  const isCrossMedia = url.origin !== self.location.origin && MEDIA_RE.test(req.url);
  const isSameMedia = url.origin === self.location.origin && B64_EXT.test(url.pathname);
  const pathKey = url.pathname.replace(/^\//, '');

  // ---------- 媒体: b64优先, 二进制兜底 ----------
  if ((isCrossMedia || isSameMedia) && B64_EXT.test(url.pathname)) {
    e.respondWith((async () => {
    try {
      const cKey = url.pathname;
      let c = null;
      try { c = await caches.open(MEDIA); const hit = await c.match(cKey, { ignoreVary: true }); if (hit) return hit; } catch {}
      const b64 = await fetchB64(pathKey, req, url);
      if (b64 && b64.status === 200) {
        try { if (c) await c.put(cKey, b64.clone()); } catch {}
        return b64;
      }
      // 二进制兜底
      const fresh = await fetchWithRetry(req, 2);
      if (fresh && fresh.status === 200 && fresh.type === 'cors') {
        try { if (c) await c.put(cKey, fresh.clone()); } catch {}
      }
      if (fresh && (fresh.type === 'opaque' || fresh.status === 200 || fresh.status === 302)) return fresh;
      try { const h2 = c && await c.match(cKey, { ignoreVary: true }); if (h2) return h2; } catch {}
      return fresh || Response.error();
    } catch (err) {
      return new Response(JSON.stringify({sw_err: String(err && err.message || err).slice(0,200), path: url.pathname.slice(-50)}),
        {status: 599, headers: {"content-type": "application/json", "access-control-allow-origin": "*"}});
    }
    })());
    return;
  }

  // ---------- 跨域非媒体(罕见): 直通 ----------
  if (url.origin !== self.location.origin) return;

  const STATIC_RE = /^\/(assets|data|icons|social)\//;
  const isStatic = STATIC_RE.test(url.pathname) || url.pathname === '/favicon.ico';
  if (!isStatic) {
    if (req.mode === 'navigate') {
      e.respondWith((async () => {
        try { return await fetch(req); } catch (_) {
          try {
            const c = await caches.open(CACHE);
            return (await c.match(req)) || (await c.match(url.pathname)) || Response.error();
          } catch { return Response.error(); }
        }
      })());
    }
    return;
  }
  // 同源静态: SWR (v12: 404/失败 -> m5 同路径兜底)
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreVary: true });
    const put = (res) => { if (res && res.ok && res.status === 200 && (res.type === 'basic' || res.type === 'cors' || res.type === 'opaque')) { try { c.put(req, res.clone()); } catch {} } };
    const net = fetch(req).then((res) => { put(res); return res; }).catch(() => undefined);
    if (hit) { net.catch(() => {}); return hit; }
    let fresh = await net;
    if (fresh && fresh.ok) return fresh;
    // v12 兜底: 同源缺失/失败 -> 媒体站同路径 (m5 优先, 依次试其余主机)
    for (const h of PBH) {
      try {
        const r2 = await fetch("https://" + h + url.pathname + url.search, { redirect: 'follow' });
        if (self.__dbg) self.__dbg("fb " + h + url.pathname + " -> " + (r2 ? r2.status : "null"));
        if (r2 && r2.ok) { put(r2); return r2; }
      } catch (e) { if (self.__dbg) self.__dbg("fb ERR " + h + " " + String(e).slice(0,80)); }
    }
    if (fresh) return fresh;
    throw new Error("offline");
  })());
});
