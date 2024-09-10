#!/bin/bash
#原始脚本仅支持单服务器保活：老王 https://github.com/eooce/scripts

# 定义颜色
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

# 定义变量
SCRIPT_PATH="/root/sb00_alive.sh"  # 本脚本路径，不要改变文件名
SCRIPT_URL="https://raw.githubusercontent.com/yutian81/serv00-ct8-ssh/main/vps_sb00_alive/sb00-sk5.sh"  # 一键脚本下载地址
VPS_JSON_URL="https://raw.githubusercontent.com/yutian81/Wanju-Nodes/main/serv00-panel3/sb00ssh.json"  # vps登录信息json文件
export LC_ALL=C
export HOST=${HOST:-'s11.serv00.com'}   # serv00服务器或IP
export SSH_USER=${SSH_USER:-'abcd'}  # serv00或ct8账号
export SSH_PASS=${SSH_PASS:-'12345678'}  # serv00或ct8密码
export VMESS_PORT=${VMESS_PORT:-'1234'}     # 四合一vmess端口
export SOCKS_PORT=${SOCKS_PORT:-'5678'}   # 四合一socks5端口
export HY2_PORT=${HY2_PORT:-'6789'}   # 四合一hy2端口
export SOCKS_USER=${SOCKS_USER:-'yutian'}  # SK5用户名
export SOCKS_PASS=${SOCKS_PASS:-'yutian=abcd'}  # SK5密码
export ARGO_DOMAIN=${ARGO_DOMAIN:-''}  # argo隧道域名
export ARGO_AUTH=${ARGO_AUTH:-''}  # argo隧道token
export NEZHA_PORT=${NEZHA_PORT:-'5555'}  # 哪吒探针端口，默认5555
export NEZHA_KEY=${NEZHA_KEY:-''}  # 哪吒探针密钥
export SOCKS_USER=${SOCKS_USER:-'yutian'}  # SK5用户名
export SOCKS_PASS=${SOCKS_PASS:-'yutian=abcd'}  # SK5密码

# 最大尝试检测次数
MAX_ATTEMPTS=5
attempt=0

# 根据对应系统安装依赖
install_packages() {
    if [ -f /etc/debian_version ]; then
        package_manager="DEBIAN_FRONTEND=noninteractive apt-get install -y"
    elif [ -f /etc/redhat-release ]; then
        package_manager="yum install -y"
    elif [ -f /etc/fedora-release ]; then
        package_manager="dnf install -y"
    elif [ -f /etc/alpine-release ]; then
        package_manager="apk add cronie jq"
    else
        red "不支持的系统架构！"
        exit 1
    fi
    $package_manager sshpass curl netcat-openbsd cron jq > /dev/null
}
install_packages

# 拉取远程 json 文件
curl -s ${VPS_JSON_URL} -o sb00ssh.json

# 读取 JSON 文件并遍历每个服务器的配置
jq -c '.[]' "sb00ssh.json" | while IFS= read -r server; do
    HOST=$(echo "$server" | jq -r '.HOST')
    SSH_USER=$(echo "$server" | jq -r '.SSH_USER')
    SSH_PASS=$(echo "$server" | jq -r '.SSH_PASS')
    VMESS_PORT=$(echo "$server" | jq -r '.VMESS_PORT')
    SOCKS_PORT=$(echo "$server" | jq -r '.SOCKS_PORT')
    HY2_PORT=$(echo "$server" | jq -r '.HY2_PORT')
    SOCKS_USER=$(echo "$server" | jq -r '.SOCKS_USER')
    SOCKS_PASS=$(echo "$server" | jq -r '.SOCKS_PASS')
    ARGO_DOMAIN=$(echo "$server" | jq -r '.ARGO_DOMAIN')
    ARGO_AUTH=$(echo "$server" | jq -r '.ARGO_AUTH')
    NEZHA_SERVER=$(echo "$server" | jq -r '.NEZHA_SERVER')
    NEZHA_PORT=$(echo "$server" | jq -r '.NEZHA_PORT')
    NEZHA_KEY=$(echo "$server" | jq -r '.NEZHA_KEY')
    green "正在处理服务器……服务器地址：$HOST；用户名：$SSH_USER；TCP端口：$VMESS_PORT"

# 判断系统架构，添加对应的定时任务的函数
add_cron_job() {
    if [ -f /etc/debian_version ] || [ -f /etc/redhat-release ] || [ -f /etc/fedora-release ]; then
        if crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
           red "定时任务已存在，跳过添加计划任务"
        else
           (crontab -l 2>/dev/null; echo "*/5 * * * * /bin/bash $SCRIPT_PATH >> /root/keep.log 2>&1") | crontab -
           green "已添加定时任务，每5分钟执行一次"
        fi
    elif [ -f /etc/alpine-release ]; then
        local new_cron="*/5 * * * * /bin/bash $SCRIPT_PATH >> /root/keep.log 2>&1"       
        local current_cron
        if [ -f /var/spool/cron/crontabs/root ]; then
            current_cron=$(cat /var/spool/cron/crontabs/root)
        else
            current_cron=""
        fi    
        if echo "$current_cron" | grep -q "$SCRIPT_PATH"; then
            red "定时任务已存在，跳过添加计划任务"
        else
            echo -e "$current_cron\n$new_cron" > /var/spool/cron/crontabs/root
            green "已添加定时任务，每5分钟执行一次"
        fi    
        rc-service crond restart
    fi
}
add_cron_job

# 检测 TCP 端口是否通畅
check_vmess_port() {
    nc -zv "$HOST" "$VMESS_PORT" &> /dev/null
    return $?
}

# 连接并执行远程命令的函数
run_remote_command() {
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$HOST" \
    "ps aux | grep $(whoami) | grep -v 'sshd\|bash\|grep' | awk '{print \$2}' | xargs -r kill -9 > /dev/null 2>&1 && \
    VMESS_PORT=$VMESS_PORT HY2_PORT=$HY2_PORT SOCKS_PORT=$SOCKS_PORT \
    ARGO_DOMAIN=$ARGO_DOMAIN ARGO_AUTH=\"$ARGO_AUTH\" \
    NEZHA_SERVER=$NEZHA_SERVER NEZHA_PORT=$NEZHA_PORT NEZHA_KEY=$NEZHA_KEY \
    bash <(curl -Ls ${SCRIPT_URL})"
    #cd /home/$SSH_USER/logs && \
    #nohup ./nezha.sh >/dev/null 2>&1 & \
    #nohup ./web run -c config.json >/dev/null 2>&1 & \
    #nohup ./argo.sh >/dev/null 2>&1 &"
}

# 循环检测
while [ $attempt -lt $MAX_ATTEMPTS ]; do
    if check_vmess_port; then
        green "程序已运行，TCP 端口 $VMESS_PORT 通畅"
        break
    else
        red "TCP 端口 $VMESS_PORT 不通畅，进程可能不存在，休眠30s后重试"
        sleep 30
        attempt=$((attempt+1))
    fi
done

# 如果达到最大尝试次数，连接服务器并执行远程命令
if [ $attempt -ge $MAX_ATTEMPTS ]; then
    red "多次检测失败，尝试通过 SSH 连接并一键安装脚本"
    if sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$HOST" -q exit; then
        green "SSH远程连接成功!"
        output=$(run_remote_command)
        green "正在处理服务器 $HOST 的命令执行结果："
        echo "$output"
    else
        red "SSH 连接失败，请检查你的用户名和密码"
    fi
fi
