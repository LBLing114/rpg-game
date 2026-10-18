# 雾渡 · The Other Shore

一款可以直接游玩的原创 2D 像素叙事 RPG 原型。故事发生在 **1968 年深秋的上海**：曾在里昂学习建筑、归国后遭受政治迫害的沈砚，循着失踪弟弟留下一封没有邮戳的信，重新走进故居所在的里弄。

游戏以 **探索 + 视觉小说式对话 + 选择分支** 推进，全程无战斗、无倒计时。人物、里弄名称与具体事件均属原创虚构；历史背景为中国文化大革命时期，不将虚构事件作为史实。

## 立即运行

**无需安装开发工具：下载仓库中的 `play.html`，用 Chrome、Edge 或 Firefox 打开即可游玩。** 这是包含全部代码和像素绘制内容的单文件版本，可直接双击打开，不需要 Node.js、终端或 localhost。请下载原始文件，而不是保存 GitHub 的文件预览网页。浏览器可能限制本地文件存档；需要稳定的存档隔离时使用下方 HTTP 启动方式。

开发或修改源码时，使用以下步骤。

需要 **Node.js 22.12 或更新版本**（本环境使用 Node.js 24）。

```bash
cd /workspace/rpg-game
npm ci
npm run dev
```

在自己的电脑上运行时，进入克隆仓库的实际目录，再运行相同命令。浏览器打开终端显示的地址，默认是 `http://localhost:5173`。开发服务绑定 `0.0.0.0`；远程机器需要通过所在平台提供的端口转发访问 5173，不能直接在本机用 localhost 访问远程进程。

### 构建与预览

```bash
npm run build
npm run preview -- --port 4173
```

浏览器打开预览服务显示的地址，默认 `http://localhost:4173`。生产文件输出到 `dist/`，可托管到任意静态站点服务。使用相对资源路径，支持部署到仓库子路径。请通过 HTTP 服务预览，不要直接双击 `dist/index.html`。

运行时不请求任何 CDN、图片服务、字体服务或 API，不需要账号、密钥、数据库。安装依赖后可断网游玩。

## 原型内容

- **六个可探索场景**：槐生里、沈家旧屋、长明印刷铺、仁安诊所、旧档案室、黄浦江岸。每处均有独立绘制的像素背景、可交互人物或物件。
- **四章剧情、四个结局**：留下证据、渡江离开、沉默、守护留下的人。结局由收集到的线索和信任、保护、记忆等决定。
- **五位主要人物**：主角沈砚，邻居周姨、排字工林岚、罗医生、昔日老师顾文山；失踪弟弟沈泊通过书信、照片和记录贯穿故事。
- **任务与背包**：六个任务、七件可读物品、随选择更新的手记；物品在对话中自动使用。
- **中英文**：剧情、地点、物品、任务、结局、帮助和界面均可即时切换；切换不重置进度。
- **存档**：对话、选择和场景变化自动保存；一个独立手动存档槽；刷新可继续。重新开始保留手动存档和已解锁结局。到达结局后可返回最后选择，或回访场景补齐线索。
- **原创视听**：Canvas 像素建筑、人物、湿石板、石库门、旧铺面、灯光、细雨；Web Audio 合成雨声与低音氛围（默认关闭）。没有使用 Black Souls 或参考图的游戏素材。
- **桌面与移动端**：键盘、鼠标、触屏操作；响应式布局、模态窗口焦点管理、减少动态选项、纯文本剧情可访问。

## 操作

| 操作             | 键盘                | 鼠标 / 触屏                              |
| ---------------- | ------------------- | ---------------------------------------- |
| 移动             | WASD / 方向键       | 点击地面                                 |
| 交互             | 靠近后按 E          | 点击人物、物件或出口标记，角色走近后交互 |
| 对话选择         | 1–5（对应显示编号） | 点击选项                                 |
| 推进单选段落     | 空格 / E            | 点击选项                                 |
| 手记             | J                   | 顶部「手记」或侧栏                       |
| 背包             | I                   | 「查看行囊」或物品格                     |
| 地图             | M                   | 场景上方「街区地图」                     |
| 设置 / 关闭菜单  | Esc                 | 右上角设置 / 关闭按钮                    |
| 语言、存档、音效 | 设置内操作          | 右上角「中 / EN」与设置                  |

先与周姨交谈取得钥匙，然后前往印刷铺。场景中的 `···` 为人物，眼睛为可观察物，箭头为出口。地点清单支持快速旅行，锁定地点会说明解锁条件。

场景显示的时刻用于叙事氛围，**没有实际时间限制**。不需要快速操作，也不会因停留而错过剧情。

## 测试

```bash
npm test          # 20 项剧情、分支、地图解锁、行走边界、存档校验测试
npm run test:e2e  # Chromium 真实浏览器测试（自动启动开发服务器）
npm run build    # TypeScript 严格检查 + Vite 生产打包
```

`npm run build` 同时通过 `scripts/build-standalone.mjs` 生成根目录的 `play.html`。提交源码更新时请一并更新它，让下载的版本与源码保持一致。

浏览器测试优先使用 `/usr/bin/chromium`，也可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定系统浏览器。没有系统 Chromium 时先执行：

```bash
npx playwright install chromium
```

在缺少浏览器系统库的 Linux 主机上，可使用 Playwright 官方的 `npx playwright install --with-deps chromium`。普通开发与构建不要求安装浏览器测试工具。

端到端测试覆盖：正常鼠标路径抵达全部四个结局、七件物品、六张地图、键盘移动与附近交互、语言切换、背包与手记、自动存档刷新、手动保存 / 重开 / 读取、窄屏布局、音效与减少动态、损坏存档恢复。截图与失败跟踪保存在被 Git 忽略的 `test-results/`。

## 代码结构

```text
src/
  main.ts       界面、键鼠事件、对话、背包、菜单、存读档
  story.ts      双语原创剧本、地图交互点、物品、任务、结局条件
  engine.ts     无 DOM 的状态转换、地图解锁、存档格式校验
  types.ts      游戏状态与内容类型
  art.ts        原创像素绘制、六张地图、人物、移动、雨景
  audio.ts      用户手动启用的程序化环境音
  style.css     响应式视觉界面
tests/
  engine.test.ts        剧情与存档测试
  browser/game.spec.ts  浏览器完整游玩与交互测试
```

`story.ts` 中每个文本使用 `{ zh, en }` 双语形式。对话选项可赠送物品、记录决定、追加手记、跳转对话或触发结局。`engine.ts` 统一验证选项条件，UI 与测试共享相同规则。

存档保存在当前浏览器、当前站点的 `localStorage`，不会跨设备同步；清除站点数据会丢失进度。存档键分别为 `wudu-save-v1`、`wudu-manual-v1`、`wudu-endings`。禁用浏览器本地存储时仍可游玩，但无法保存，游戏会提示。

<details>
<summary>结局条件（剧透）</summary>

1. **留名**：取得第三份校样、转运名册、医生证言，并选择信任林岚。到江岸选择与她分存证据。
2. **渡雾**：取得转运名册与罗医生提供的船票，在江岸登船。
3. **无声**：抵达江岸，选择烧毁证据。
4. **余灯**：取得转运名册、承诺保护罗医生，并将旧屋合影交给顾先生看。在江岸选择留下。

错过信任或保护承诺后，可以回访林岚或罗医生补作决定。缺少照片时，顾先生会提示回旧屋寻找。最终选项中可以返回探索；结局不会永久锁住存档。

</details>

## English

**The Other Shore** is a playable, original bilingual pixel narrative RPG set in a fictional Shanghai lane in autumn 1968. Shen Yan, an architect who returned from studying in Lyon and faced political persecution, follows an unsent letter from his missing brother. Explore six places, speak with their inhabitants, collect seven keepsakes and documents, and make choices that lead to four endings. There is no combat or time limit.

Run `npm ci && npm run dev`, then open the address printed by Vite. Use WASD / arrows to move, E to interact, 1–5 to choose, J / I / M for journal / belongings / map, and Escape for settings. Mouse and touch are also supported. Use **中 / EN** to change language at any point. Progress is saved locally in your browser.

Build with `npm run build`; test with `npm test` and `npm run test:e2e`. The artwork, writing, and procedural ambience are original. No external runtime assets, API keys, or backend services are required.
