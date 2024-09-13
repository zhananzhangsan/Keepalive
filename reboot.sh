#!/bin/bash

re="\033[0m"
red="\033[1;91m"
green="\e[1;32m"
yellow="\e[1;33m"
purple="\e[1;35m"
red() { echo -e "\e[1;91m$1\033[0m"; }
green() { echo -e "\e[1;32m$1\033[0m"; }
yellow() { echo -e "\e[1;33m$1\033[0m"; }
purple() { echo -e "\e[1;35m$1\033[0m"; }
reading() { read -p "$(red "$1")" "$2"; }
USERNAME=$(whoami)
HOSTNAME=$(hostname)
WORKDIR="/home/${USERNAME}/logs"
chmod 777 "${WORKDIR}"
cd ${WORKDIR} || { echo "无法切换到工作目录 ${WORKDIR}"; exit 1; }
export TMPDIR=$(pwd)

# 确保脚本和程序有执行权限
[ -x "${WORKDIR}/nezha.sh" ] || chmod +x "${WORKDIR}/nezha.sh"
[ -x "${WORKDIR}/npm" ] || chmod +x "${WORKDIR}/npm"
[ -x "${WORKDIR}/web" ] || chmod +x "${WORKDIR}/web"
[ -e "${WORKDIR}/config.json" ] || chmod 777 "${WORKDIR}/config.json"
[ -x "${WORKDIR}/argo.sh" ] || chmod +x "${WORKDIR}/argo.sh"
[ -x "${WORKDIR}/bot" ] || chmod +x "${WORKDIR}/bot"

ps aux | grep $(whoami) | grep -v "sshd\|bash\|grep" | awk '{print $2}' | xargs -r kill -9 > /dev/null 2>&1
red "已清理所有进程"

# 重启哪吒探针
if pgrep -x 'npm' > /dev/null; then
   green "NEZHA 正在运行"
else
   red "NEZHA 已停止，尝试重启……"
   pkill -x 'npm' && nohup ./nezha.sh >/dev/null 2>&1 &
   sleep 2
   if pgrep -x 'npm' > /dev/null; then
      green "NEZHA 重启成功"
   else
      red "NEZHA 重启失败！"
   fi
fi

# 重启singbox
if pgrep -x 'web' > /dev/null; then
   green "singbox 正在运行"
else
   red "singbox 已停止，尝试重启……"
   pkill -x 'web' && nohup ./web run -c config.json >/dev/null 2>&1 &
   sleep 2
   if pgrep -x 'web' > /dev/null; then
      green "singbox 重启成功"
   else
      red "singbox 重启失败！"
   fi
fi

# 重启argo
if pgrep -x 'bot' > /dev/null; then
   green "ARGO 正在运行"
else
   red "ARGO 已停止，尝试重启……"
   pkill -x 'bot' && nohup ./argo.sh >/dev/null 2>&1 &
   sleep 2
   if pgrep -x 'bot' > /dev/null; then
      green "ARGO 重启成功"
   else
      red "ARGO 重启失败！"
   fi
fi
