#!/bin/bash

USERNAME=$(whoami)
WORKDIR="/home/${USERNAME}/logs"
chmod 777 "$WORKDIR"

# 检查 argo 服务运行状态并启动
if pgrep -x "bot" >/dev/null; then
   green "ARGO 正在运行"
else
   red "ARGO 未运行，重启中……"
   pkill -x "bot" && nohup $WORKDIR/argo.sh >/dev/null 2>&1 & sleep 1
   green "ARGO 已重启"
fi
