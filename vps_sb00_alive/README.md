## 用vps保活serv00 & ct8

### 一、将serv00的登录信息保存在json数组中，支持多服务器

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
