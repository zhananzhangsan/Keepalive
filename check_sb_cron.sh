#!/bin/bash

red() { echo -e "\e[1;91m$1\033[0m"; }
green() { echo -e "\e[1;32m$1\033[0m"; }
USERNAME=$(whoami)
WORKDIR="/home/${USERNAME}/logs"
CRON_NEZHA="nohup ./nezha.sh >/dev/null 2>&1 &"
CRON_SB="nohup ./web run -c config.json >/dev/null 2>&1 &"
CRON_ARGO="nohup ./argo.sh >/dev/null 2>&1 &"
chmod -R 755 "${WORKDIR}"

#(crontab -l | grep -v -E "@reboot pkill -kill -u $(whoami)|pgrep -x \"npm\"|pgrep -x \"web\"|pgrep -x \"bot\"") | crontab -
#red "检查已存在的特定任务并清除"
crontab -r
red "清除所有已存在的 crontab 任务"

# 初始化一个新的 crontab 文件内容
NEW_CRONTAB=""

# 判断文件是否存在，并根据情况添加任务
if [ -e "${WORKDIR}/npm" ] && [ -e "${WORKDIR}/web" ] && [ -e "${WORKDIR}/bot" ]; then
  green "正在添加 nezha & singbox & argo 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA} ${CRON_SB} ${CRON_ARGO}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"npm\" > /dev/null || cd ${WORKDIR} && ${CRON_NEZHA}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"web\" > /dev/null || cd ${WORKDIR} && ${CRON_SB}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"bot\" > /dev/null || cd ${WORKDIR} && ${CRON_ARGO}\n"

elif [ -e "${WORKDIR}/nezha.sh" ]; then
  green "正在添加 nezha 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"npm\" > /dev/null || cd ${WORKDIR} && ${CRON_NEZHA}\n"

elif [ -e "${WORKDIR}/web" ]; then
  green "正在添加 singbox 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) cd ${WORKDIR} && ${CRON_SB}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"web\" > /dev/null || cd ${WORKDIR} && ${CRON_SB}\n"

elif [ -e "${WORKDIR}/argo.sh" ]; then
  green "正在添加 argo 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_ARGO}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"bot\" > /dev/null || cd ${WORKDIR} && ${CRON_ARGO}\n"
fi

# 将 crontab 任务更新一次性添加
(crontab -l; echo -e "$NEW_CRONTAB") | crontab -
green "Crontab 任务已添加完成"
