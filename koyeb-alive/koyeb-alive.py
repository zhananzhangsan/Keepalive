import os
import requests
import json
import time

# 从环境变量获取 Koyeb 账户信息（以 JSON 字符串格式存储）
koyeb_accounts_env = os.getenv("KOYEB_ACCOUNTS")
if not koyeb_accounts_env:
    raise ValueError("KOYEB_ACCOUNTS 环境变量未设置或格式错误")
KOYEB_ACCOUNTS = json.loads(koyeb_accounts_env)

def send_tg_message(message):
    bot_token = os.getenv("TG_BOT_TOKEN")
    chat_id = os.getenv("TG_CHAT_ID")
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }
    response = requests.post(url, data=data)
    return response.json()

def login_koyeb(email, password):
    login_url = "https://app.koyeb.com/v1/account/login"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(login_url, headers=headers, json=data, timeout=30)  # 添加超时设置
        response.raise_for_status()
        return True, f"登录成功 (状态码: {response.status_code})"
    except requests.Timeout:
        return False, "请求超时"
    except requests.RequestException as e:
        return False, f"请求失败: {str(e)}"

# 登录并记录所有账户的结果
results = []
current_time = time.strftime("%Y-%m-%d %H:%M:%S")
for account in KOYEB_ACCOUNTS:
    email = account['email']
    password = account['password']
    time.sleep(5)  # 保持原有延迟
    
    success, message = login_koyeb(email, password)
    results.append(f"账户: {email}\n状态: {'✅' if success else '❌'}\n消息: {message}\n")

# 发送 Telegram 消息
tg_message = f"🤖 Koyeb 登录状态报告\n⏰ 检查时间: {current_time}\n\n" + "\n".join(results)
