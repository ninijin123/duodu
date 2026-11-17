对读 Duodu — 安装说明

【上传】把整个 duodu-app 文件夹拖到 Netlify 项目的 Deploys 页面（或 app.netlify.com/drop）。
注意：文件夹里有 netlify 子文件夹和 netlify.toml，是翻译功能需要的，不要删。

【开启 DeepSeek 翻译】
1. platform.deepseek.com 注册，充值少量金额，在 API Keys 里创建密钥（sk- 开头）。
2. Netlify → 你的项目 → Project configuration → Environment variables → Add a variable：
   DEEPSEEK_API_KEY = 你的密钥
   APP_PASSCODE     = 自己想一个口令（比如 nina1984）
   如果用淘宝等中转服务，再加两个：
   DEEPSEEK_BASE_URL = 卖家给的接口地址（如 https://xxx.com/v1）
   DEEPSEEK_MODEL    = 卖家给的模型名称
3. 回到 Deploys，再拖一次 duodu-app 文件夹，让设置生效。
4. iPad 上打开对读 → 阅读设置 → 填访问口令 → 点“测试翻译”。

【装到 iPad】Safari 打开网址 → 分享 → 添加到主屏幕 → 从桌面图标打开再导入书。

【多设备同步】需要通过 GitHub 部署（拖拽上传不支持同步）。
在“阅读设置 → 多设备同步”里，第一台设备点“开启同步”，其他设备输入同一个同步码。

【查词用 Claude（可选）】
整章翻译仍然用 DeepSeek。点词、选中短语查词可以改用 Claude：
1. console.anthropic.com 注册并充值，创建 API Key。
2. Netlify → Environment variables 新增：
   ANTHROPIC_API_KEY = 你的密钥
   ANTHROPIC_MODEL   = 想用的模型名（不填默认 claude-haiku-5-5）
3. 重新部署。没填 ANTHROPIC_API_KEY 时，查词会自动继续用 DeepSeek。

【Claude 来自淘宝中转时】
再加：ANTHROPIC_BASE_URL = 卖家给的接口地址
如果卖家说只支持 OpenAI 格式：再加 ANTHROPIC_FORMAT = openai，并把 ANTHROPIC_MODEL 设成卖家给的模型名。
