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
    if not email or not password:
        return False, "邮箱或密码为空"
        
    login_url = "https://app.koyeb.com/v1/account/login"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    data = {
        "email": email.strip(),  # 去除可能的空格
        "password": password
    }
    
    try:
        response = requests.post(login_url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        return True, "登录成功"
    except requests.Timeout:
        return False, "请求超时"
    except requests.RequestException as e:
        return False, str(e)

def main():
    try:
        # 验证账户信息并逐个登录
        KOYEB_ACCOUNTS = validate_env_variables()  
        
        # 检查账户列表是否为空
        if not KOYEB_ACCOUNTS:
            raise ValueError("没有找到有效的 Koyeb 账户信息")
            
        results = []
        current_time = time.strftime("%Y-%m-%d %H:%M:%S")
        total_accounts = len(KOYEB_ACCOUNTS)
        success_count = 0
        
        for index, account in enumerate(KOYEB_ACCOUNTS, 1):
            email = account.get('email', '').strip()  # 去除可能的空格
            password = account.get('password', '')
            
            if not email or not password:
                print(f"警告: 账户信息不完整，跳过该账户")
                continue        
                
            try:
                print(f"正在处理第 {index}/{total_accounts} 个账户: {email}")
                time.sleep(8)  # 登录8秒间隔
                success, message = login_koyeb(email, password)
                if success:
                    status_line = f"状态: ✅ {message}"
                    success_count += 1
                else:
                    status_line = f"状态: ❌ 登录失败\n原因：{message}"
            except Exception as e:
                status_line = f"状态: ❌ 登录失败\n原因：执行异常 - {str(e)}"
                
            results.append(f"账户: {email}\n{status_line}\n")
        
        # 检查是否有处理结果
        if not results:
            raise ValueError("没有任何账户处理结果")
            
        # 生成TG消息内容模板，添加统计信息
        summary = f"📊 总计: {total_accounts} 个账户\n✅ 成功{success_count}个 | ❌ 失败{total_accounts - success_count}个\n\n"
        tg_message = f"🤖 Koyeb 登录状态报告\n⏰ 检查时间: {current_time}\n\n{summary}" + "\n".join(results)
        print(tg_message)
        send_tg_message(tg_message)
        
    except Exception as e:
        error_message = f"程序执行出错: {str(e)}"
        print(error_message)
        send_tg_message(f"❌ {error_message}")

if __name__ == "__main__":
    main()
