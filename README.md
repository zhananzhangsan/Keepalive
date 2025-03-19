# 项目说明
各种保活项目

## Serv00保活直接用老王的项目
- 老王[仓库地址](https://github.com/eooce/Sing-box)  
> 特点：全自动保活

----

## VPS版一键无交互脚本 5in1
vless+reality|vmess+argo|hy2|tuic|socks5
```
PORT=34766 bash <(curl -Ls https://raw.githubusercontent.com/yutian81/Keepalive/main/vps_sb5in1.sh)
```

## 测试socks5是否通畅
运行以下命令，若正确返回服务器ip则节点通畅
```
curl ip.sb --socks5 用户名:密码@localhost:端口
```
