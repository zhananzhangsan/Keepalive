#!/bin/bash

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
USERNAME=$(whoami)
HOSTNAME=$(hostname)

cd "/home/${USERNAME}"
reading "\n清理所有文件，重置服务器，确定继续吗？【y/n】: " choice
case "$choice" in
  [Yy])
    ps aux | grep $(whoami) | grep -v "sshd\|bash\|grep" | awk '{print $2}' | xargs -r kill -9 2>/dev/null
    chmod -R 755 ~/*
    chmod -R 755 ~/.* 
    rm -rf ~/.* 
    rm -rf ~/*
    green "清理已完成" ;;    
  [Nn]) exit 0 ;;
  *) red "无效的选择，请输入y或n"
  curl -s https://raw.githubusercontent.com/yutian81/serv00-ct8-ssh/main/sb_serv00_socks.sh -o sb00.sh && bash sb00.sh ;;
esac
