# IP Pages

Vue 3 + TypeScript + Vite 与 Cloudflare Pages Functions 实现的 IPv4 离线归属地查询。无需独立服务器。页面在浏览器中查询 XDB；需要 API Key 的 HTTP API 在 Workers 中使用相同的查询实现。

## 准备数据库

官方 IPv4 XDB 放在 [ip2region 仓库 data/ip2region_v4.xdb](https://github.com/lionsoul2014/ip2region/blob/v3.18.0/data/ip2region_v4.xdb)，可通过页面 Raw 下载。官方最新 release 请参阅 [releases](https://github.com/lionsoul2014/ip2region/releases)，不要假定 Release 有固定名称的附件。下载官方文件后执行：

```bash
./scripts/update-xdb.sh /path/to/ip2region_v4.xdb
```

脚本先复制到临时文件，检查大小、IPv4 版本、头部、段索引、向量索引及区域文本，输出大小和 SHA-256，验证成功后原子替换 `public/data/ip2region.xdb`。格式检查不能证明来源或检测所有可能的内容篡改，请从官方来源下载，并在官方提供可信校验值时自行核对 SHA-256。提交该 XDB 到 GitHub；它不会被 .gitignore 忽略。构建前必须提供数据库；缺失或验证失败时构建会终止。单文件大于 25 MiB 将被拒绝，因为超出 Pages 静态资源限制。

## 本地运行

需要 Node.js 22.18 或更新版本和 npm。

```bash
npm install
./scripts/update-xdb.sh /path/to/ip2region_v4.xdb
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，设置 API_KEY；此文件已被 Git 忽略
npm run build
npm run pages:dev
```

Pages 本地地址由 Wrangler 输出；此方式同时运行静态页面和 Functions。`npm run dev` 只运行 Vite，不包含 Pages Functions，因此自动获取当前 IP 和 API 无法使用。运行 `npm test` 执行无需网络的核心测试。数据库替换后重新运行 `npm run build`，提交并推送即可触发部署。

## API

```bash
curl 'https://YOUR-SITE.pages.dev/api/ip?ip=114.114.114.114' \
  -H 'X-API-Key: YOUR_API_KEY'
curl 'https://YOUR-SITE.pages.dev/api/health'
```

成功返回 HTTP 200 和 `{"code":0,"message":"success","data":{"ip":"...","region":"..."}}`。未找到匹配段时 region 为空字符串；缺少密钥 401、密钥错误 403、IP 参数错误 400，数据库不可用或未配置服务端密钥时返回 503。API 响应均为 `Cache-Control: no-store`，避免密钥认证结果被共享缓存。健康检查只报告加载状态和 XDB 头部的创建时间；这不是保证数据准确或数据实际更新的日期。

`/api/me` 只返回 Cloudflare 提供的 `CF-Connecting-IP` 中的 IPv4。IPv6 访问者可能没有可用的 IPv4，界面会提示并允许手动查询。本地 Wrangler 不代表真实公网访客，请在部署后验证该功能。查询仅支持 IPv4；保留地址和未知地址依照 XDB 原始内容展示，不推断地理位置。

## 部署到 Cloudflare Pages

1. 把项目及官方 XDB 提交并推送到自己的 GitHub 仓库，确保 `.dev.vars` 未提交。
2. 在 Cloudflare Workers & Pages 中创建 Pages 项目并连接该仓库。项目根目录为仓库根目录，构建命令填 `npm run build`，输出目录填 `dist`。选择 Node.js 22.18 以上版本（例如在构建环境设置 `NODE_VERSION=22.22.0`）。
3. 在 Pages 项目的设置中添加服务端 secret `API_KEY`，为 Production 和需要的 Preview 环境分别配置。使用足够长的随机值，切勿使用 `VITE_` 前缀，部署或重新部署使其生效。
4. 打开部署地址检查页面及 `/api/health`，并用上面的 curl 示例测试 API。

Pages 自动编译根目录 `functions/`。`env.ASSETS` 将同一部署的静态数据库加载到 Worker isolate 的内存，后续请求复用；isolate 冷启动、回收或部署后会重新加载。浏览器也会下载一份数据库。静态文件可被公开下载，API Key 只保护 `/api/ip`，并不限制本地数据库查询。

## 配置限流和免费计划

项目没有全局一致的应用内限流：Worker isolate 内存不能用于跨实例限流。请在 Cloudflare 安全规则中针对 `/api/ip`（以及需要时 `/api/me`、`/api/health`）配置 WAF Rate limiting rule，按客户端 IP 限制请求并阻止或挑战，具体可用条件、阈值和规则数取决于 Cloudflare 计划。保护 X-API-Key、按需轮换；禁止将它写进前端代码或提交到仓库。

Pages 单静态文件最大 25 MiB；Functions 计入 Workers 免费额度，免费额度、CPU 时间、内存和构建次数受 Cloudflare 当前计划限制。参阅 [Pages 限制](https://developers.cloudflare.com/pages/platform/limits/) 和 [Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)。XDB 以完整内存方式读取，多个 isolate 和浏览器会各自占用约一个文件的内存，冷启动会有加载成本。数据由上游不定期更新，归属地可能不准确。

## 目录与兼容性

- `src/services/ip-query.ts`：共享 IPv4 XDB 查询器与浏览器加载器。
- `functions/api/`：密钥查询、健康检查、访客 IP。
- `scripts/`：数据库验证和安全替换。
- `public/data/`：部署用数据库。
- `tests/`：合成 XDB 和 API 逻辑测试；测试数据不会用于产品结果。

已核对 [ip2region v3.18.0 官方 JavaScript 客户端](https://github.com/lionsoul2014/ip2region/tree/v3.18.0/binding/javascript)。该客户端依赖 Node.js `fs` 和 `Buffer`，不能直接运行在浏览器及默认 Workers 环境；本项目根据官方内存查询实现和 XDB 格式用标准 `DataView`/`TextDecoder` 做 IPv4 适配，保留 Apache-2.0 署名。支持 XDB 2.0 IPv4 和 3.0 IPv4、4 字节指针；上游未来格式改变时需要升级适配器，不应盲目替换。XDB 的地区字段采用官方 `国家|省份|城市|运营商|国家代码`；旧格式或自定义字段可能不同。
