import os
import json
import random
import time
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

# ---------------------------- 配置区域 ----------------------------
TG_BOT_TOKEN = os.getenv("TG_BOT_TOKEN", "")
TG_CHAT_ID = os.getenv("TG_CHAT_ID", "")
USER_CONFIGS = json.loads(os.getenv("USER_CONFIGS_JSON"))
LOGIN_URL = 'https://web.freecloud.ltd/index.php?rp=/login'
DASHBOARD_URL = 'https://web.freecloud.ltd/clientarea.php'
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

# 执行浏览器自动化验证
def validate_user(user: dict) -> tuple:
    try:
        with sync_playwright() as p:
            # 配置浏览器参数
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox'
                ]
            )
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = context.new_page()
            
            try:
                # 访问登录页面
                page.goto(LOGIN_URL, timeout=15000)
                
                # 等待关键元素加载
                page.wait_for_selector('input[name="username"]', state="attached", timeout=5000)
                
                # 填充登录表单
                page.fill('input[name="username"]', user['username'])
                page.fill('input[name="password"]', user['password'])
                
                # 提交表单
                with page.expect_navigation(timeout=15000) as navigation:
                    page.click('button[type="submit"]')
                
                # 验证跳转
                if not page.url.startswith(DASHBOARD_URL):
                    return (False, f"异常跳转至 {page.url}")
                
                # 提取用户信息
                content = page.inner_text('.panel-body strong', timeout=5000)
                if user['expected_text'] not in content:
                    return (False, f"信息不匹配 | 期望: {user['expected_text']} | 实际: {content}")
                
                return (True, None)
                
            except Exception as e:
                return (False, f"浏览器自动化异常: {str(e)}")
            finally:
                browser.close()
                
    except Exception as e:
        return (False, f"浏览器启动失败: {str(e)}")

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
        
        # 添加随机延迟 (首次也延迟)
        if idx > 1:
            time.sleep(random.uniform(5, 10))
            
        # 执行验证
        success, error_msg = validate_user(user)
        duration = time.time() - start_time
        
        # 发送通知
        send_telegram_alert(user['username'], success, error_msg)
        
        # 控制台输出
        status = "成功" if success else f"失败 ({error_msg})"
        print(f"🔄 [{idx}/{total_users}] {user['username']} 验证{status} [耗时: {duration:.2f}s]")
    
    print("\n🔔 所有用户验证完成")

if __name__ == "__main__":
    main()
