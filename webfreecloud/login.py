import os
import json
import requests
import re
import random
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import time
from urllib.parse import urlparse

# ---------------------------- 配置区域 ----------------------------
TG_BOT_TOKEN = os.getenv("TG_BOT_TOKEN", "")
TG_CHAT_ID = os.getenv("TG_CHAT_ID", "" )
USER_CONFIGS = json.loads(os.getenv("USER_CONFIGS_JSON"))
LOGIN_URL = 'https://web.freecloud.ltd/index.php?rp=/login'
DASHBOARD_URL = 'https://web.freecloud.ltd/clientarea.php'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': LOGIN_URL,
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Origin': 'https://web.freecloud.ltd',
    'Connection': 'keep-alive'
}
# ---------------------------------------------------------------

# 获取北京时间
def get_beijing_time() -> str:
    utc_now = datetime.utcnow()
    return (utc_now + timedelta(hours=8)).strftime('%Y-%m-%d %H:%M:%S')

# 发送Telegram通知
def send_telegram_alert(username: str, is_success: bool, error_msg: str = None) -> None:
    timestamp = get_beijing_time()
    status = "✅ 验证成功" if is_success else "❌ 验证失败"
    message = (
        f"*📩 WebFreeCloud 登录验证通知* \n\n"
        f"🔐 账户: `{username}` \n"
        f"🛡️ 状态: {status} \n"
        f"🕒 时间: {timestamp}"
    )
    
    if not is_success and error_msg:
        message += f"\n📊 错误原因: `{error_msg}`"
    
    if not TG_BOT_TOKEN or not TG_CHAT_ID:
        return

    try:
        response = requests.post(
            f'https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage',
            json={
                'chat_id': TG_CHAT_ID,
                'text': message,
                'parse_mode': 'Markdown'
            },
            timeout=10
        )
        response.raise_for_status()
    except Exception as e:
        print(f"⚠️ Telegram通知发送失败: {str(e)}")

# 执行用户验证，返回是否成功,及错误信息)
def validate_user(session: requests.Session, user: dict) -> tuple:
    try:
        print(f"\n🔑 开始验证用户: {user['username']}")
        
        # 获取登录页面
        login_page = session.get(LOGIN_URL)
        login_page.raise_for_status()

        # 提取CSRF Token
        csrf_match = re.search(r"var\s+csrfToken\s*=\s*'([a-f0-9]+)'", login_page.text)
        if not csrf_match:
            return (False, "CSRF Token提取失败")
        
        # 构造登录请求
        login_data = {
            'username': user['username'],
            'password': user['password'],
            'token': csrf_match.group(1),
            'rememberme': 'on'
        }
        login_res = session.post(LOGIN_URL, data=login_data)
        
        # 验证跳转
        parsed_url = urlparse(login_res.url)
        if parsed_url.path != urlparse(DASHBOARD_URL).path:
            return (False, f"异常跳转至 {login_res.url}")

        # 提取用户信息
        dashboard_page = session.get(DASHBOARD_URL)
        soup = BeautifulSoup(dashboard_page.text, 'html.parser')
        
        # 定位信息元素
        if not (panel := soup.find('div', class_='panel-body')):
            return (False, "未找到用户信息面板")
            
        if not (strong_tag := panel.find('strong')):
            return (False, "未找到信息标签")
        
        # 验证文本内容
        actual_info = strong_tag.get_text(strip=True)
        if user['expected_text'] not in actual_info:
            return (False, f"信息不匹配 | 期望: {user['expected_text']} | 实际: {actual_info}")
            
        return (True, None)

    except requests.exceptions.RequestException as e:
        return (False, f"网络请求异常: {str(e)}")
    except Exception as e:
        return (False, f"系统错误: {str(e)}")

# 主流程
def main():
    # 环境变量校验
    required_vars = ["USER_CONFIGS_JSON"]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        raise ValueError(f"缺失环境变量: {', '.join(missing)}")
    if not TG_BOT_TOKEN or not TG_CHAT_ID:
        print("⚠️ 未配置 Telegram 通知参数，结果将不会推送")
    
    try:
        global USER_CONFIGS
        USER_CONFIGS = json.loads(os.getenv("USER_CONFIGS_JSON"))
    except Exception as e:
        raise ValueError(f"用户配置解析失败: {str(e)}")

    total_users = len(USER_CONFIGS)
    print(f"✅ 加载用户数量: {total_users}")
    print("🔔 开始批量验证用户...")
    
    for idx, user in enumerate(USER_CONFIGS, 1):
        start_time = time.time()
        if idx > 1:  # 首个用户无需延迟
            time.sleep(random.uniform(2, 5))
        with requests.Session() as session:
            session.headers.update({
                **HEADERS,
                'Referer': LOGIN_URL,
                'Origin': urlparse(LOGIN_URL).scheme + '://' + urlparse(LOGIN_URL).netloc
            })
            username = user['username']
            
            # 执行验证
            success, error_msg = validate_user(session, user)
            duration = time.time() - start_time
            
            # 发送通知
            send_telegram_alert(username, success, error_msg)
            
            # 控制台输出
            status = "成功" if success else f"失败 ({error_msg})"
            print(f"🔄 [{idx}/{total_users}] {username} 验证{status} [耗时: {duration:.2f}s]")
    
    print("\n🔔 所有用户验证完成")

if __name__ == "__main__":
    main()
