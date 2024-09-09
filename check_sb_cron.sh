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
WORKDIR="/home/${USERNAME}/logs"
chmod 777 "${WORKDIR}"
CRON_NEZHA="nohup ${WORKDIR}/nezha.sh >/dev/null 2>&1 &"
CRON_SB="nohup ${WORKDIR}/web run -c ${WORKDIR}/config.json >/dev/null 2>&1 &"
CRON_ARGO="nohup ${WORKDIR}/argo.sh >/dev/null 2>&1 &"

green "检查并添加 crontab 任务"
# 先清除旧的相关任务
(crontab -l | grep -v -E "@reboot pkill -kill -u $(whoami)|pgrep -x \"npm\"|pgrep -x \"web\"|pgrep -x \"bot\"") | crontab -

# 判断文件是否存在，并根据情况添加任务
if [ -e "${WORKDIR}/nezha.sh" ] && [ -e "${WORKDIR}/config.json" ] && [ -e "${WORKDIR}/argo.sh" ]; then
  green "添加 nezha & singbox & argo 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && ${CRON_NEZHA} ${CRON_SB} ${CRON_ARGO}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"npm\" > /dev/null || ${CRON_NEZHA}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"web\" > /dev/null || ${CRON_SB}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"bot\" > /dev/null || ${CRON_ARGO}") | crontab -

elif [ -e "${WORKDIR}/nezha.sh" ]; then
  green "添加 nezha 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"npm\" > /dev/null || ${CRON_NEZHA}") | crontab -

elif [ -e "${WORKDIR}/config.json" ]; then
  green "添加 singbox 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_SB}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"web\" > /dev/null || ${CRON_SB}") | crontab -

elif [ -e "${WORKDIR}/argo.sh" ]; then
  green "添加 argo 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_ARGO}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"bot\" > /dev/null || ${CRON_ARGO}") | crontab -
fi
