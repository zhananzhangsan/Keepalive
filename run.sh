#!/bin/bash

USERNAME=$(whoami)
WORKDIR="/home/${USERNAME}/logs"
chmod 777 "$WORKDIR"

# 检查 NEZHA 服务运行状态并启动
if pgrep -x "npm" >/dev/null; then
   green "NEZHA 正在运行"
else
   red "NEZHA 未运行，重启中……"
   pkill -x "npm" && nohup $WORKDIR/nezha.sh >/dev/null 2>&1 & sleep 1
   green "NEZHA 已重启"
fi

# 检查 singbox 服务运行状态并启动
if pgrep -x "web" >/dev/null; then
   green "singbox 正在运行"
else
   red "singbox 未运行，重启中……"
   pkill -x "web" && nohup $WORKDIR/web run -c $WORKDIR/config.json >/dev/null 2>&1 & sleep 1
   green "singbox 已重启"
fi

# 检查 argo 服务运行状态并启动
if pgrep -x "bot" >/dev/null; then
   green "ARGO 正在运行"
else
   red "singbox 未运行，重启中……"
   pkill -x "bot" && nohup $WORKDIR/argo.sh >/dev/null 2>&1 & sleep 1
   green "ARGO 已重启"
fi
