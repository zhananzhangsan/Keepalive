在cf worker部署

设置环境变量 APIKEY

绑定KV空间  CRONBIN

默认密码为 root，在js文件第一行自行修改

访问 https://域名/?key=变量APIKEY的值（默认为root）

完成

失败时通知的消息模板：

```bash
curl --location 'https://api.telegram.org/bot<填入TG的token>/sendMessage' \
--header 'Content-Type: application/json' \
--data '{
    "chat_id":"填入TG的ID",
    "text":"{{message}}"
}'
```
