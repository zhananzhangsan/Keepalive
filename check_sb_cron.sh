#!/bin/bash

USERNAME=$(whoami)
WORKDIR="/home/${USERNAME}/logs"
chmod 777 "${WORKDIR}"
CRON_NEZHA="nohup ${WORKDIR}/nezha.sh >/dev/null 2>&1 &"
CRON_SB="nohup ${WORKDIR}/web run -c ${WORKDIR}/config.json >/dev/null 2>&1 &"
CRON_ARGO="nohup ${WORKDIR}/argo.sh >/dev/null 2>&1 &"

echo "检查并添加 crontab 任务"
# 先清除旧的相关任务
(crontab -l | grep -v -E "@reboot pkill -kill -u $(whoami)|pgrep -x \"npm\"|pgrep -x \"web\"|pgrep -x \"bot\"") | crontab -

# 判断文件是否存在，并根据情况添加任务
if [ -e "${WORKDIR}/nezha.sh" ] && [ -e "${WORKDIR}/config.json" ] && [ -e "${WORKDIR}/argo.sh" ]; then
  echo "添加 nezha & singbox & argo 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && ${CRON_NEZHA} ${CRON_SB} ${CRON_ARGO}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"npm\" > /dev/null || ${CRON_NEZHA}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"web\" > /dev/null || ${CRON_SB}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"bot\" > /dev/null || ${CRON_ARGO}") | crontab -

elif [ -e "${WORKDIR}/nezha.sh" ]; then
  echo "添加 nezha 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"npm\" > /dev/null || ${CRON_NEZHA}") | crontab -

elif [ -e "${WORKDIR}/config.json" ]; then
  echo "添加 singbox 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_SB}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"web\" > /dev/null || ${CRON_SB}") | crontab -

elif [ -e "${WORKDIR}/argo.sh" ]; then
  echo "添加 argo 的 crontab 重启任务"
  (crontab -l; echo "@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_ARGO}") | crontab -
  (crontab -l; echo "*/10 * * * * pgrep -x \"bot\" > /dev/null || ${CRON_ARGO}") | crontab -
fi
