# 雾渡 · The Other Shore

一款可直接游玩的原创 **RPG Maker 风格 2D 网格探索 / 视觉小说 Web 游戏**。故事发生在 1968 年深秋的上海：归国后遭受政治迫害的沈砚，循着失踪弟弟的一封信回到旧里弄，在监视与沉默中寻找真相。

采用 **TypeScript + HTML5 Canvas + Vite**，以 32 × 32 像素网格、俯视地图、四向行走、底部头像对话框呈现。它模拟经典 RPG Maker 的游玩方式，**不是需要 RPG Maker 软件打开的编辑器工程**。全部人物、地点与具体情节均为原创虚构；无战斗、无倒计时。

![雾渡：上海里弄像素地图与 RPG 对话窗口](docs/preview.png)

## 直接打开游戏

1. [下载 main 分支的完整游戏 ZIP](https://github.com/LBLing114/rpg-game/archive/refs/heads/main.zip) 并**解压**，或在仓库点击 **Code → Download ZIP**。
2. 用 Chrome、Edge 或 Firefox 打开根目录的 **`play.html`**。

`play.html` 是包含代码、剧情、样式和程序化美术的单文件游戏，无需安装 Node.js。也可在 GitHub 的 `play.html` 页面点击 **Download raw file** 单独下载；不要保存 GitHub 预览网页。浏览器可能限制本地文件存档，稳定保存进度可使用下方本地服务。

## 开发与本地预览

需要 **Node.js 22.12 或更新版本**。在项目文件夹中打开终端：

```bash
npm install
npm run dev
```

保持终端开启，在**运行这些命令的同一台电脑**打开终端给出的地址，默认 `http://localhost:5173`。已有锁文件时可用 `npm ci` 做可重复安装。云端运行时，请使用平台的 **5173 端口转发地址**；自己电脑上的 `localhost` 无法访问云端进程。

```bash
npm run build
npm run preview -- --port 4173
```

构建执行 TypeScript 检查、生成 `dist/`，并更新可双击运行的 `play.html`。预览默认 `http://localhost:4173`。`dist/` 可部署到静态网站，支持仓库子路径；请通过 HTTP 打开 `dist/index.html`。

运行时无需 CDN、外部图片或字体、账号、API 密钥或后端；安装完成后可离线游玩。

## 内容与操作

- **六张地图**：槐生里、沈家旧屋、长明印刷铺、仁安诊所、旧档案室、黄浦江岸。使用砖墙、旧海报、石板路、室内木地板和家具，没有大片草地。
- **完整序章**：四章流程、多个角色与推理分支、六个任务、七件可查看和使用的剧情道具、四种结局。
- **网格探索**：平滑四向移动、地形与家具碰撞、点击地面寻路、走近人物后交互；角色与场景按脚底 Y 坐标遮挡。
- **经典对话**：深色半透明白边窗口、左侧像素头像、逐字文字、分支选择、可开启的文字与菜单提示音。
- **双语与存档**：界面和全文中英文切换；自动存档、独立手动槽、已发现结局收集；支持键盘、鼠标和触屏。

| 操作 | 键盘 | 鼠标 / 触屏 |
| --- | --- | --- |
| 行走 | WASD / 方向键 | 点击可行走地面，自动绕过障碍 |
| 与附近人物或物件交互 | Enter / Space / E | 点击标记，角色走近后触发 |
| 显示整段文字 | Enter / Space / E | 点击对话框的继续按钮 |
| 推进单选段落 | 文字显示完成后 Enter / Space / E | 点击对应选项 |
| 选择分支 | 文字显示完成后 1–5 | 点击选项 |
| 背包 / 使用道具 | I | 点击背包，再选择物品和使用按钮 |
| 任务手记 | J | 点击手记 |
| 街区地图 | M | 点击地图，选择已解锁地点 |
| 设置 / 关闭菜单 | Esc | 设置 / 关闭按钮 |
| 中英文与音效 | 设置或界面按钮 | 中 / EN、音效按钮 |

先和周姨交谈取得旧屋钥匙，再到印刷铺寻找校样。地图会显示地点解锁条件。背包中的物品会提示使用地点；到达相应场景使用，可引导角色走到目标并开启相关对话。场景时间仅用于叙事，没有限时选择。

进度保存在浏览器当前站点的 `localStorage`，不跨设备同步。重新开始保留手动存档和结局收集；结局后可返回最后选择，或回访角色补齐线索。旧版连续坐标存档会恢复到当前地图的可行走网格。

## 剧情与地图扩展

```text
src/
  data/storyData.json  双语剧情、对话分支、任务、物品、结局与条件
  story.ts        JSON 数据适配与条件判断
  grid.ts         32px 网格、六张地图、碰撞、路径查找与交互位置
  art.ts          程序化像素绘制、人物动画、Y 排序与天气
  engine.ts       状态转换、地点解锁、存档校验
  main.ts         界面、逐字对话、操作与道具使用
  audio.ts        合成环境音与交互音效
  style.css      RPG 窗口、菜单与响应式布局
```

文字均采用 `{ "zh": "中文", "en": "English" }`。编辑 `src/data/storyData.json` 的 `dialogues` 添加节点；每个节点提供 `speaker`、`portrait`、`text`、`choices`。选择可包含 `next`（节点 ID）、`items`（赠送道具）、`flags`（决定）、`note`（手记）、`ending`（结局 ID）。条件是声明式数据，不执行字符串代码：

```json
{
  "label": { "zh": "让他看旧照片", "en": "Show him the old photograph" },
  "requires": { "item": "photo" },
  "flags": ["remembered"],
  "next": "guMemory"
}
```

条件支持 `item`、`flag`、`all`、`any`、`not`、`evidenceAtLeast`、`endingReached` 和命名 `rule`。在 `scenes` 中定义交互事件和对话，在 `grid.ts` 配置事件网格位置、地形、障碍与出生点。道具的 `use` 指定 `scene`、`event`、双语操作名和提示。添加新的地图、道具或结局 ID 时，同时更新 `types.ts` 和相关校验。修改后执行构建，让 `play.html` 与源码同步。

## 构建与测试

```bash
npm test          # 剧情、条件、存档、地图碰撞与寻路
npm run build    # TypeScript + Vite + 单文件游戏
npm run test:e2e # Chromium 中完成剧情与交互检查
```

浏览器测试自动启动开发服务，覆盖逐字对话、键盘与鼠标、背包使用、双语、存读档、移动端、全部结局，以及单文件离线运行。截图和失败跟踪输出到被 Git 忽略的 `test-results/`。

首次运行浏览器测试可执行 `npx playwright install chromium`。也可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指向已安装的 Chromium；Linux 默认优先使用 `/usr/bin/chromium`。缺少系统依赖时使用 Playwright 官方的 `npx playwright install --with-deps chromium`。

<details>
<summary>结局条件（剧透）</summary>

- **留名**：收集第三份校样、转运名册、医生证言，并信任林岚；到江岸分存证据。
- **余灯**：取得转运名册、承诺保护罗医生，并用旧合影唤回顾先生的记忆；选择留下。
- **渡雾**：取得转运名册与船票；选择渡江。
- **无声**：抵达江岸后选择烧毁证据。

可回访角色补作信任、保护等决定。最终选择允许继续探索，不会永久锁住存档。

</details>

## English

**The Other Shore** is an original bilingual narrative RPG set in a fictional Shanghai lane in 1968. Shen Yan, a returning overseas student facing political persecution, follows a letter from his missing brother. Explore six urban and interior maps, collect seven story items, complete six quests, and reach four endings. There is no combat or time limit.

This is a **TypeScript / Canvas / Vite web game inspired by classic RPG Maker presentation**, with 32px grid movement, collision and click pathfinding, Y-sorted pixel art, portraits and typewriter dialogue. It does not require the RPG Maker editor.

Download and open **`play.html`** to play immediately, or run `npm install && npm run dev` and open the printed localhost address on the same computer. For a cloud server, use its forwarded port URL. Run `npm run build` to generate both `dist/` and `play.html`; use `npm run preview` to preview the production build.

Use **WASD / arrows** to walk, **Enter / Space / E** to interact or reveal dialogue, **1–5** for choices, **I** for belongings, **J** for quests, **M** for the map, and **Escape** for settings. Click terrain to navigate, or an event marker to approach and interact. Inventory items have a use action and a location hint. **中 / EN** switches language without resetting progress. Audio is optional. Saves stay in the current browser.

Edit `src/data/storyData.json` to extend bilingual dialogue, choices, items, quests and endings; conditions are JSON data, not executable strings. Map geometry and event coordinates live in `src/grid.ts`. Run `npm test`, `npm run build`, and `npm run test:e2e` after changes. All artwork and audio are generated locally; no external runtime assets or services are required.
