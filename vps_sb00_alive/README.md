## 用vps保活serv00 & ct8

### 一、将serv00的登录信息保存在json数组中，支持多服务器

**注意:务必将json文件存入私库或其他支持直链的云盘，避免信息泄露。git私库文件可用CM的私库项目获取可访问的直链**

格式如下，注意最后一组`{}`后面没有`,`：

```
[
  { 
    "HOST": "panel3.serv00.com",
    "SSH_USER": "用户名",
    "SSH_PASS": "密码",
    "VMESS_PORT": "tcp端口1",
    "SOCKS_PORT": "tcp端口2",
    "HY2_PORT": "udp端口",
    "SOCKS_USER": "socks用户名",
    "SOCKS_PASS": "socks密码",
    "ARGO_DOMAIN": "argo域名",
    "ARGO_AUTH": "argo的token",
    "NEZHA_SERVER": "哪吒域名或ip",
    "NEZHA_PORT": "哪吒通信端口",
    "NEZHA_KEY": "哪吒密钥"
  },
  { 
    "HOST": "s4.serv00.com",
    "SSH_USER": "用户名",
    "SSH_PASS": "密码",
    "VMESS_PORT": "tcp端口1",
    "SOCKS_PORT": "tcp端口2",
    "HY2_PORT": "udp端口",
    "SOCKS_USER": "socks用户名",
    "SOCKS_PASS": "socks密码",
    "ARGO_DOMAIN": "argo域名",
    "ARGO_AUTH": "argo的token",
    "NEZHA_SERVER": "哪吒域名或ip",
    "NEZHA_PORT": "哪吒通信端口",
    "NEZHA_KEY": "哪吒密钥"
  },
  { 
    "HOST": "s5.serv00.com",
    "SSH_USER": "用户名",
    "SSH_PASS": "密码",
    "VMESS_PORT": "tcp端口1",
    "SOCKS_PORT": "tcp端口2",
    "HY2_PORT": "udp端口",
    "SOCKS_USER": "socks用户名",
    "SOCKS_PASS": "socks密码",
    "ARGO_DOMAIN": "argo域名",
    "ARGO_AUTH": "argo的token",
    "NEZHA_SERVER": "哪吒域名或ip",
    "NEZHA_PORT": "哪吒通信端口",
    "NEZHA_KEY": "哪吒密钥"
  }
]
```

**获取这个json文件的直链地址，例如：**
```
https://raw.githubusercontent.com/yutian81/serv00/main/alive/sb00ssh.json
```


### 二、在vps中安装以下脚本

**修改`sb00_alive.sh`中的VPS_JSON_URL变量为上述json文件的直链地址**

**在vps中安装`sb00_alive.sh`脚本**

```
curl -s https://raw.githubusercontent.com/yutian81/serv00-ct8-ssh/main/vps_sb00_alive/sb00_alive.sh -o sb.sh && bash sb.sh
```
再次运行输入：`bash sb.sh`即可

----

## 基本原理
通过vps远程检测serv的vmess端口是否通畅  
如果通畅，什么也不做  
如果不通，立即用vps远程连接serv的ssh，并执行无交互一键脚本  
本脚本设定每5分钟检测一次端口  

## 文件说明
- sb00-sk5.sh

在老王四合一无交互一键脚本基础上修改而来，去掉了tuic协议，增加了socks5协议

- _worker.js

是`vps_sb00_alive.sh`的`worker版`，尚未完工
