## 在 cf worker 部署网页自动化访问工具

## 特点
- 支持 url 方位 和 curl 请求
- 支持在前端网页可视化操作
- 支持通过 curl 命令发送 TG 通知
- 支持自定义前端网页访问密码
- 支持前端手动执行和后端自动执行

## 部署
- 在 cf 新建一个 worker 项目
- 复制 `cornbin.js` 代码到 worker 项目
- 在js文件第一行自行修改 `APIKEY` 的值，保存并部署
- 创建一个KV空间，键名 `CRONBIN`
- 在 worker 设置中绑定 KV 空间，KV变量名 `CRONBIN`
- 访问 `https://worker域名/?key=变量APIKEY的值`（默认为root）进入前端网页
- 在前端页面手动添加需要自动化运行的任务，保存，并可手动运行
- 支持自动访问URL或通过CURL命令自动执行

## CURL命令使用示例
- 访问哪吒面板
```bash
curl -s -H "Authorization: 哪吒面板的APITOKEN" "https://哪吒面板域名(或ip:端口)/api/v1/server/list"
```

- 访问 argo 隧道
```bash
curl -o /dev/null -s -w "%{http_code}" https://example.trycloudflare.com | grep -qE "^(404)$" && echo "隧道正常" || echo "隧道异常"
```

- 更多用法请自行搜索

## 发送通知
- 失败时通知的消息模板，以TG消息为例：
```bash
curl --location 'https://api.telegram.org/bot<填入TG的token>/sendMessage' \
--header 'Content-Type: application/json' \
--data '{
    "chat_id":"填入TG的ID",
    "text":"{{message}}"
}'
```
