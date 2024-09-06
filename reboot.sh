#!/bin/bash

USERNAME=$(whoami)
HOSTNAME=$(hostname)
WORKDIR="/home/${USERNAME}/logs"
chmod 777 "${WORKDIR}"
cd "${WORKDIR}" || { red "无法切换到工作目录 ${WORKDIR}"; return 1; }
[ -x "${WORKDIR}/nezha.sh" ] || chmod +x "${WORKDIR}/nezha.sh" && chmod +x "${WORKDIR}/npm"
[ -x "${WORKDIR}/web" ] || chmod +x "${WORKDIR}/web"
[ -x "${WORKDIR}/argo.sh" ] || chmod +x "${WORKDIR}/argo.sh" && chmod +x "${WORKDIR}/bot"

# 清理所有进程并重启所有服务
reading "\n清理所有进程，但保留ssh连接，确定继续清理吗？【y/n】: " choice
  case "$choice" in
    [Yy])
        ps aux | grep "$(whoami)" | grep -v 'sshd\|bash\|grep' | awk '{print $2}' | xargs -r kill -9 > /dev/null 2>&1
        nohup ./nezha.sh >/dev/null 2>&1 &
        sleep 2
            if pgrep -x 'npm' > /dev/null; then
               green "NEZHA 已重启"
            fi
        nohup ./web run -c config.json >/dev/null 2>&1 &
        sleep 2
            if pgrep -x 'web' > /dev/null; then
               green "singbox 已重启"
            fi
        nohup ./argo.sh >/dev/null 2>&1 &
        sleep 2
            if pgrep -x 'bot' > /dev/null; then
               green "ARGO 隧道已重启"
            fi
        ;;
    [Nn]) menu ;;
    *) red "无效的选择，请输入y或n" && menu ;;
  esac
