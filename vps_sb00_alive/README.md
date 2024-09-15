## 用vps保活serv00 & ct8

## 重要说明

- 脚本用途：用vps保活 serv00 & ct8，支持多个服务器批量操作，仅支持安装我修改过的四合一无交互脚本，不支持带交互的脚本

- 也可以支持安装老王原版的四合一无交互脚本，但是需要自己修改代码。因为我的代码里没有TUIC协议，而增加了socks5协议

- 本人修改的[四合一无交互脚本地址](https://github.com/yutian81/serv00-ct8-ssh/blob/main/vps_sb00_alive/sb00-sk5.sh)

- 必须将你所有的serv00服务器的ssh地址、用户名、密码以及四合一无交互脚本所需的外部变量（如端口等）存入到一个可直链下载的 json 文件，json 内容模板见下文

## 脚本原理

- 使用vps每5分钟检查一次serv00服务器（已安装好四合一）上vmess端口、argo隧道、哪吒探针，判断是否可连通

- 如果其中一项不可连通，则间隔30秒重新检查一次

- 连续5次均有某一项不可连通，则远程登录serv00的SSH，并读取 json 文件内的参数，重新安装四合一无交互脚本

-----

### 一、将serv00的登录信息和无交互脚本的外部变量保存在json数组中

**注意:务必将 json 文件存入私库或其他支持直链的云盘，避免信息泄露。git私库文件可用CM的私库项目获取可访问的直链**

json 格式如下，注意最后一组`{}`后面没有`,`：

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


### 二、在vps中运行本脚本

> [!IMPORTANT]  
> **首先，需要修改`sb00_alive.sh`中20行的 VPS_JSON_URL 变量为上述 json 文件的直链地址**
> 
> 如：`VPS_JSON_URL="https://raw.githubusercontent.com/yutian81/Wanju-Nodes/main/serv00/sb00ssh.json"`
> 
> **其次，需要修改114行 `ids_found=("13" "14" "17" "23" "24")`中的数字，该数字为你需要检测的哪吒探针的ID，可以在面板管理后台查看**
> 

**然后，运行一键安装命令**

```
curl -s https://raw.githubusercontent.com/yutian81/serv00-ct8-ssh/main/vps_sb00_alive/sb00_alive.sh -o sb.sh && bash sb.sh
```
再次运行输入：`bash sb.sh`即可

**模拟输出效果**

![17264015029571726401502712.png](https://fastly.jsdelivr.net/gh/yutian81/yutian81.github.io@master/assets/images/17264015029571726401502712.png)

----

## 文件说明

- `sb00-sk5.sh`：在老王四合一无交互一键脚本基础上修改而来，去掉了tuic协议，增加了socks5协议

- `_worker.js`：是本脚本`sb00_alive.sh`的`worker版`，尚未完工，当前不可用
