## action自动脚本需要配置的变量

- SOCKS5_HOST  # 代理服务器地址
- SOCKS5_PORT  # 代理端口
- SOCKS5_USER  # 代理用户名(如果有)
- SOCKS5_PASS  # 代理用户名(如果有)
- TG_BOT_TOKEN  # tg机器人token
- TG_CHAT_ID  # tg机器人ID
- USER_CONFIGS_JSON  # json格式的虚拟主机登录用户名密码

**USER_CONFIGS_JSON 格式示例**

```json
[
  {
    "username": "您的账号",
    "password": "您的密码",
    "expected_text": "账户信息中的特征文本"
  },
  {
    "username": "另一个账号",
    "password": "另一个密码",
    "expected_text": "其他特征文本"
  }
]
```

**expected_text 内容示例**

`#1683 Yanlin Liu`

即登陆后控制面板主页面显示的 `#订单编号+注册时的姓名`，用于验证登录是否成功
