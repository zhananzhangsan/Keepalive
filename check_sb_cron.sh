#!/bin/bash

green() { echo -e "\e[1;32m$1\033[0m"; }
USERNAME=$(whoami)
WORKDIR="/home/${USERNAME}/logs"
CRON_NEZHA="nohup ./nezha.sh >/dev/null 2>&1 &"
CRON_SB="nohup ./web run -c config.json >/dev/null 2>&1 &"
CRON_ARGO="nohup ./argo.sh >/dev/null 2>&1 &"

# 确保脚本和程序有执行权限
chmod 777 "${WORKDIR}"
[ -x "${WORKDIR}/nezha.sh" ] || chmod +x "${WORKDIR}/nezha.sh"
[ -x "${WORKDIR}/npm" ] || chmod +x "${WORKDIR}/npm"
[ -x "${WORKDIR}/web" ] || chmod +x "${WORKDIR}/web"
[ -e "${WORKDIR}/config.json" ] || chmod 777 "${WORKDIR}/config.json"
[ -x "${WORKDIR}/argo.sh" ] || chmod +x "${WORKDIR}/argo.sh"
[ -x "${WORKDIR}/bot" ] || chmod +x "${WORKDIR}/bot"

green "检查已存在的特定任务并清除"
(crontab -l | grep -v -E "@reboot pkill -kill -u $(whoami)|pgrep -x \"npm\"|pgrep -x \"web\"|pgrep -x \"bot\"") | crontab -
#green "清除所有已存在的 crontab 任务"
#crontab -r

# 初始化一个新的 crontab 文件内容
NEW_CRONTAB=""

# 判断文件是否存在，并根据情况添加任务
if [ -e "${WORKDIR}/npm" ] && [ -e "${WORKDIR}/web" ] && [ -e "${WORKDIR}/bot" ]; then
  green "添加 nezha & singbox & argo 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA} ${CRON_SB} ${CRON_ARGO}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"npm\" > /dev/null || cd ${WORKDIR} && ${CRON_NEZHA}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"web\" > /dev/null || cd ${WORKDIR} && ${CRON_SB}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"bot\" > /dev/null || cd ${WORKDIR} && ${CRON_ARGO}\n"

elif [ -e "${WORKDIR}/nezha.sh" ]; then
  green "添加 nezha 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"npm\" > /dev/null || cd ${WORKDIR} && ${CRON_NEZHA}\n"

elif [ -e "${WORKDIR}/config.json" ]; then
  green "添加 singbox 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) cd ${WORKDIR} && ${CRON_SB}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"web\" > /dev/null || cd ${WORKDIR} && ${CRON_SB}\n"

elif [ -e "${WORKDIR}/argo.sh" ]; then
  green "添加 argo 的 crontab 重启任务"
  NEW_CRONTAB+="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_ARGO}\n"
  NEW_CRONTAB+="*/10 * * * * pgrep -x \"bot\" > /dev/null || cd ${WORKDIR} && ${CRON_ARGO}\n"
fi

# 将 crontab 任务更新一次性添加
(crontab -l; echo -e "$NEW_CRONTAB") | crontab -
green "Crontab 任务已添加完成"
