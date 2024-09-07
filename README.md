# 项目说明
在 Serv00 和 CT8 机器上一步到位地安装和配置 vmess+vmess&argo+socks5+哪吒探针，socks5 可用于 cmliu/edgetunnel 项目的`SOCKS5`变量实现反代，帮助解锁 ChatGPT 等服务。通过一键脚本实现代理安装，使用 Crontab 保持进程活跃，并借助 GitHub Actions 实现帐号续期与自动化管理，确保长期稳定运行。

## CM大佬的库
https://github.com/cmliu/socks5-for-serv00  

## CM大佬的[视频教程](https://youtu.be/L6gPyyD3dUw)

----

### 修改版：vmess-argo|socks5|hysteria2|nezha-agent 四合一：
- 在主菜单集成了**一键重置服务器**的功能  
- 执行`bash sb00.sh`即可再次进入主菜单
- 支持cm大佬的action保活，需要设置`ACCOUNTS_JSON`变量
```
curl -s https://raw.githubusercontent.com/yutian81/serv00-ct8-ssh/main/sb_serv00_socks.sh -o sb00.sh && bash sb00.sh
```
![主菜单截图](https://fastly.jsdelivr.net/gh/yutian81/yutian81.github.io@master/assets/images/17253518329711725351832428.png)


### 仅安装哪吒agent
```
bash <(curl -s https://raw.githubusercontent.com/k0baya/nezha4serv00/main/install-agent.sh)
```

----

## 一键卸载pm2
```bash
pm2 unstartup && pm2 delete all && npm uninstall -g pm2
```
## 清空重置服务器，逐行执行
```
pkill -kill -u $(whoami)
chmod -R 755 ~/*
chmod -R 755 ~/.*
rm -rf ~/.*
rm -rf ~/*
```
----

## Github Actions保活
添加 Secrets.`ACCOUNTS_JSON` 变量
```json
[
  {"username": "cmliusss", "password": "7HEt(xeRxttdvgB^nCU6", "panel": "panel4.serv00.com", "ssh": "s4.serv00.com"},
  {"username": "cmliussss2018", "password": "4))@cRP%HtN8AryHlh^#", "panel": "panel7.serv00.com", "ssh": "s7.serv00.com"},
  {"username": "4r885wvl", "password": "%Mg^dDMo6yIY$dZmxWNy", "panel": "panel.ct8.pl", "ssh": "s1.ct8.pl"}
]
```

# 致谢
[RealNeoMan](https://github.com/Neomanbeta/ct8socks)、[k0baya](https://github.com/k0baya/nezha4serv00)、[eooce](https://github.com/eooce)
