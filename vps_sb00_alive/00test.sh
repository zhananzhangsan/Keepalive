#!/bin/bash

SCRIPT_PATH="/root/sb00_alive.sh"  # 脚本路径
export HOST=${HOST:-'s11.serv00.com'}   # serv00服务器或IP
export VMESS_PORT=${VMESS_PORT:-'1234'}     # 四合一vmess端口
export SOCKS_PORT=$SOCKS_PORT:-'5678'}   # 四合一socks5端口
export HY2_PORT=${HY2_PORT:-'6789'}   # 四合一hy2端口
export SSH_USER=${SSH_USER:-'abcd'}  # serv00或ct8账号
export SSH_PASS=${SSH_PASS:-'12345678'}  # serv00或ct8密码

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
        package_manager="apk add"
    else
        echo -e "${red}不支持的系统架构！${reset}"
        exit 1
    fi
    $package_manager sshpass curl netcat-openbsd cron jq > /dev/null
}
install_packages

# 拉取远程 json 文件
curl -s https://github.yutian81.top/yutian81/Wanju-Nodes/main/serv00-panel3/sb00ssh.json -o sb00ssh.json

# 读取 JSON 文件并遍历每个服务器的配置
jq -c '.[]' "sb00ssh.json" | while IFS= read -r server; do
    HOST=$(echo "$server" | jq -r '.HOST')
    SSH_USER=$(echo "$server" | jq -r '.SSH_USER')
    SSH_PASS=$(echo "$server" | jq -r '.SSH_PASS')
    VMESS_PORT=$(echo "$server" | jq -r '.VMESS_PORT')
    SOCKS_PORT=$(echo "$server" | jq -r '.SOCKS_PORT')
    HY2_PORT=$(echo "$server" | jq -r '.HY2_PORT')
    ARGO_DOMAIN=$(echo "$server" | jq -r '.ARGO_DOMAIN')
    ARGO_AUTH=$(echo "$server" | jq -r '.ARGO_AUTH')
    NEZHA_SERVER=$(echo "$server" | jq -r '.NEZHA_SERVER')
    NEZHA_PORT=$(echo "$server" | jq -r '.NEZHA_PORT')
    NEZHA_KEY=$(echo "$server" | jq -r '.NEZHA_KEY')

# 打印正在处理的服务器信息
echo "Processing server: $HOST"

# 添加定时任务的函数
add_cron_job() {
  if ! crontab -l | grep -q "$SCRIPT_PATH"; then
    (crontab -l; echo "*/2 * * * * /bin/bash $SCRIPT_PATH >> /root/keep.log 2>&1") | crontab -
    echo -e "\e[1;32m已添加定时任务，每两分钟执行一次\e[0m"
  else
    echo -e "\e[1;35m定时任务已存在，跳过添加计划任务\e[0m"
  fi
}
add_cron_job

# 检测 TCP 端口是否通畅
check_vmess_port() {
  nc -zv $HOST $VMESS_PORT &> /dev/null
  return $?
}

# 连接并执行远程命令的函数
run_remote_command() {
   sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$HOST" \
     "ps aux | grep $(whoami) | grep -v 'sshd\|bash\|grep' | awk '{print \$2}' | xargs -r kill -9 > /dev/null 2>&1 && \
     cd /home/$SSH_USER/logs && \
     nohup ./nezha.sh >/dev/null 2>&1 & \
     nohup ./web run -c config.json >/dev/null 2>&1 & \
     nohup ./argo.sh >/dev/null 2>&1 &"
}

# 循环检测
while [ $attempt -lt $MAX_ATTEMPTS ]; do
  if check_vmess_port; then
    echo -e "\e[1;32m程序已运行，TCP 端口 $VMESS_PORT 通畅\e[0m\n"
    exit 0
  else
    echo -e "\e[1;33mTCP 端口 $VMESS_PORT 不通畅，进程可能不存在，休眠30s后重试\e[0m"
    sleep 30
    attempt=$((attempt+1))
  fi
done

# 如果达到最大尝试次数，连接服务器并执行远程命令
if [ $attempt -ge $MAX_ATTEMPTS ]; then
  echo -e "\e[1;33m多次检测失败，尝试通过 SSH 连接并执行命令\e[0m"
  if sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$HOST -q exit; then
    echo -e "\e[1;32mSSH远程连接成功!\e[0m"
    output=$(run_remote_command)
    echo -e "\e[1;35m远程命令执行结果：\e[0m\n"
    echo "$output"
  else
    echo -e "\e[1;33m连接失败，请检查你的账户和密码\e[0m\n"
  fi
fi
