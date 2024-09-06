#!/bin/bash

red="\033[1;91m"
reading() { read -p "$(red "$1")" "$2"; }
USERNAME=$(whoami)
HOSTNAME=$(hostname)
WORKDIR="/home/${USERNAME}/logs"
chmod 755 "${WORKDIR}"
cd "${WORKDIR}" || { echo "无法切换到工作目录 ${WORKDIR}"; exit 1; }

# 确保脚本和程序有执行权限
[ -x "${WORKDIR}/nezha.sh" ] || chmod +x "${WORKDIR}/nezha.sh"
[ -x "${WORKDIR}/npm" ] || chmod +x "${WORKDIR}/npm"
[ -x "${WORKDIR}/web" ] || chmod +x "${WORKDIR}/web"
[ -x "${WORKDIR}/argo.sh" ] || chmod +x "${WORKDIR}/argo.sh"
[ -x "${WORKDIR}/bot" ] || chmod +x "${WORKDIR}/bot"

# 清理所有进程并重启所有服务
reading "\n清理并重启所有进程，继续吗？【y/n】: " choice
case "$choice" in
    [Yy])
        ps aux | grep "$(whoami)" | grep -v 'sshd\|bash\|grep' | awk '{print $2}' | xargs -r kill -9 > /dev/null 2>&1
        nohup ./nezha.sh >/dev/null 2>&1 &
        sleep 2
        if pgrep -x 'npm' > /dev/null; then
            echo "NEZHA 已重启"
        fi
        nohup ./web run -c config.json >/dev/null 2>&1 &
        sleep 2
        if pgrep -x 'web' > /dev/null; then
            echo "singbox 已重启"
        fi
        nohup ./argo.sh >/dev/null 2>&1 &
        sleep 2
        if pgrep -x 'bot' > /dev/null; then
            echo "ARGO 隧道已重启"
        fi
        ;;
    [Nn]) exit 0 ;;
    *) echo "无效的选择，请输入 y 或 n" && exit 1 ;;
esac
