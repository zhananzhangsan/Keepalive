#!/bin/bash

red() { echo -e "\e[1;91m$1\033[0m"; }
green() { echo -e "\e[1;32m$1\033[0m"; }
USERNAME=$(whoami)
WORKDIR="/home/${USERNAME}/logs"
CRON_NEZHA="nohup ./nezha.sh >/dev/null 2>&1 &"
CRON_SB="nohup ./web run -c config.json >/dev/null 2>&1 &"
CRON_ARGO="nohup ./argo.sh >/dev/null 2>&1 &"
REBOOT_TASK="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA} ${CRON_SB} ${CRON_ARGO}"
REBOOT_NEZHA="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_NEZHA}"
REBOOT_SB="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_SB}"
REBOOT_ARGO="@reboot pkill -kill -u $(whoami) && cd ${WORKDIR} && ${CRON_ARGO}"
TIMING_NEZHA="*/10 * * * * pgrep -x \"npm\" > /dev/null || cd ${WORKDIR} && ${CRON_NEZHA}"
TIMING_SB="*/10 * * * * pgrep -x \"web\" > /dev/null || cd ${WORKDIR} && ${CRON_SB}"
TIMING_ARGO="*/10 * * * * pgrep -x \"bot\" > /dev/null || cd ${WORKDIR} && ${CRON_ARGO}"

chmod -R 755 "${WORKDIR}"

check_and_add_crontab() {
    local process_name=$1
    local reboot_task=$2
    local timing_task=$3
    local required_files=("${@:4}")

    for file in "${required_files[@]}"; do
        if [ ! -e "${WORKDIR}/${file}" ]; then
            red "${process_name} 的文件 ${file} 缺失，请检查节点搭建是否成功"
            return
        fi
    done
    
    green "${process_name} 的进程和配置文件都已存在，正在检查相关任务是否存在"
    
    current_cron=$(crontab -l 2>/dev/null)
    if echo "$current_cron" | grep -qF "$reboot_task" && echo "$current_cron" | grep -qF "$timing_task"; then
        green "${process_name} 的重启和定时任务已存在"
    else
        red "${process_name} 的重启或定时任务不存在，正在添加任务"
        (echo "$current_cron" | grep -v -E "@reboot pkill -kill -u $(whoami)|pgrep -x \"npm\"|pgrep -x \"web\"|pgrep -x \"bot\"") | crontab -
        (echo "$current_cron"; echo "$reboot_task"; echo "$timing_task") | crontab -      
        green "${process_name} 的重启和定时任务都已添加成功"
    fi
}

cd "${WORKDIR}"
check_and_add_crontab "nezha & singbox & argo" "$REBOOT_TASK" "$TIMING_NEZHA" "npm" "nezha.sh" "web" "config.json" "bot" "argo.sh"
check_and_add_crontab "nezha" "$REBOOT_NEZHA" "$TIMING_NEZHA" "npm" "nezha.sh"
check_and_add_crontab "singbox" "$REBOOT_SB" "$TIMING_SB" "web" "config.json"
check_and_add_crontab "argo" "$REBOOT_ARGO" "$TIMING_ARGO" "bot" "argo.sh"
green "corntab 重启和定时任务添加完成"
