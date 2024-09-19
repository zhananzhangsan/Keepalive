#!/bin/bash

red() { echo -e "\e[1;91m$1\033[0m"; }
green() { echo -e "\e[1;32m$1\033[0m"; }
USERNAME=$(whoami)
WORKDIR="/home/${USERNAME}/logs"
CRON_NEZHA="nohup ./nezha.sh >/dev/null 2>&1 &"
CRON_SB="nohup ./web run -c config.json >/dev/null 2>&1 &"
CRON_ARGO="nohup ./argo.sh >/dev/null 2>&1 &"

# 检查是否存在指定的 crontab 任务
check_crontab() {
  crontab -l 2>/dev/null | grep -q "$1"
  return $?
}

# 添加新的 crontab 任务
add_crontab() {
  (crontab -l 2>/dev/null; echo "$1") | crontab -
}

# 添加 crontab 任务
add_service_crontab() {
  local service_name=$1
  local cron_cmd=$2
  local pgrep_cmd=$3
  local reboot_cmd="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${cron_cmd}"

  # 检查重启和定时任务
  if check_crontab "$reboot_cmd" && check_crontab "$pgrep_cmd"; then
    green "${service_name} 任务已存在"
  else
    if ! check_crontab "$reboot_cmd"; then
      add_crontab "$reboot_cmd"
      green "${service_name} 重启任务添加完成"
    fi
    if ! check_crontab "$pgrep_cmd"; then
      add_crontab "*/10 * * * * $pgrep_cmd > /dev/null || cd ${WORKDIR} && ${cron_cmd}"
      green "${service_name} 定时任务添加完成"
    fi
  fi
}

# 检查文件并添加相应的 crontab 任务
if [ -e "${WORKDIR}/nezha.sh" ] && [ -e "${WORKDIR}/web" ] && [ -e "${WORKDIR}/argo.sh" ]; then
  green "启动文件均存在，正在检查并添加 crontab 任务"  
  add_service_crontab "nezha" "${CRON_NEZHA}" "pgrep -x \"npm\""
  add_service_crontab "singbox" "${CRON_SB}" "pgrep -x \"web\""
  add_service_crontab "argo" "${CRON_ARGO}" "pgrep -x \"bot\""
else
  green "启动文件部分存在，正在检查并添加对应的 crontab 任务"
  [ -e "${WORKDIR}/nezha.sh" ] && add_service_crontab "nezha" "${CRON_NEZHA}" "pgrep -x \"npm\"" || red "nezha 未安装, 启动文件不存在"
  [ -e "${WORKDIR}/web" ] && add_service_crontab "singbox" "${CRON_SB}" "pgrep -x \"web\"" || red "singbox 未安装, 启动文件不存在"
  [ -e "${WORKDIR}/argo.sh" ] && add_service_crontab "argo" "${CRON_ARGO}" "pgrep -x \"bot\"" || red "argo 未安装, 启动文件不存在"
fi

green "所有 crontab 任务已添加完成"
