import os
import requests
import json
import time

def validate_env_variables():
    """验证必要的环境变量"""
    koyeb_accounts_env = os.getenv("KOYEB_ACCOUNTS")
    if not koyeb_accounts_env:
        raise ValueError("KOYEB_ACCOUNTS 环境变量未设置或格式错误")
    try:
        return json.loads(koyeb_accounts_env)
    except json.JSONDecodeError:
        raise ValueError("KOYEB_ACCOUNTS JSON 格式无效")

def send_tg_message(message):
    bot_token = os.getenv("TG_BOT_TOKEN")
    chat_id = os.getenv("TG_CHAT_ID")

    if not bot_token or not chat_id:
        print("TG_BOT_TOKEN 或 TG_CHAT_ID 未设置，跳过发送 Telegram 消息")
        return None
        
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }
    try:
        response = requests.post(url, data=data, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"发送 Telegram 消息失败: {str(e)}")
        return None

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
        response = requests.post(login_url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        return True, f"登录成功 (状态码: {response.status_code})"
    except requests.Timeout:
        return False, "请求超时"
    except requests.RequestException as e:
        return False, f"请求失败: {str(e)}"

def main():
    try:
        # 验证并获取账户信息
        KOYEB_ACCOUNTS = validate_env_variables()
        
        # 登录并记录所有账户的结果
        results = []
        current_time = time.strftime("%Y-%m-%d %H:%M:%S")
        
        for account in KOYEB_ACCOUNTS:
            email = account.get('email')
            password = account.get('password')
            
            if not email or not password:
                print(f"警告: 账户信息不完整，跳过该账户")
                continue
                
            time.sleep(5)  # 保持原有延迟
            
            success, message = login_koyeb(email, password)
            results.append(f"账户: {email}\n状态: {'✅' if success else '❌'}\n消息: {message}\n")

        # 生成报告消息
        tg_message = f"🤖 Koyeb 登录状态报告\n⏰ 检查时间: {current_time}\n\n" + "\n".join(results)
        
        # 打印消息到控制台
        print(tg_message)
        
        # 尝试发送到 Telegram
        send_tg_message(tg_message)
        
    except Exception as e:
        error_message = f"程序执行出错: {str(e)}"
        print(error_message)
        send_tg_message(f"❌ {error_message}")

if __name__ == "__main__":
    main()
