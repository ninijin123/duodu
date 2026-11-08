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
