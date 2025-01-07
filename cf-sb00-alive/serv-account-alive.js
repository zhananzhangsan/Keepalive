// 配置常量
const CONFIG = {
  RETRY_ATTEMPTS: 3,      // 重试次数
  RETRY_DELAY: 1000,      // 重试延迟（毫秒）
  MIN_RANDOM_DELAY: 1000, // 最小随机延迟（毫秒）
  MAX_RANDOM_DELAY: 9000, // 最大随机延迟（毫秒）
  RATE_LIMIT: {
    MAX_REQUESTS: 100,    // 每个时间窗口内的最大请求数
    WINDOW: 3600000       // 时间窗口大小（1小时，单位：毫秒）
  },
  COOKIE_MAX_AGE: 86400   // Cookie 过期时间（24小时，单位：秒）
};

// 请求频率限制
const rateLimit = {
  requests: new Map(),
  checkLimit: function(ip) {
    const now = Date.now();
    const userRequests = this.requests.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < CONFIG.RATE_LIMIT.WINDOW);
    this.requests.set(ip, [...recentRequests, now]);
    return recentRequests.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS;
  }
};

// User-Agent 缓存
const userAgentCache = {
  cache: new Map(),
  get: function() {
    const now = Math.floor(Date.now() / 3600000);
    if (!this.cache.has(now)) {
      this.cache.clear();
      this.cache.set(now, generateRandomUserAgent());
    }
    return this.cache.get(now);
  }
};

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
  async scheduled(event, env, ctx) {
    return handleScheduled(event.scheduledTime, env);
  }
};

// 处理 HTTP 请求的主函数
async function handleRequest(request, env) {
  try {
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP');

    if (rateLimit.checkLimit(clientIP)) {
      return new Response('Too Many Requests', { status: 429 });
    }

    switch(url.pathname) {
      case '/login':
        return handleLogin(request, env);
      case '/run':
        return handleRun(request, env);
      case '/results':
        return handleResults(request, env);
      case '/check-auth':
        return handleCheckAuth(request, env);
      default:
        return new Response(getHtmlContent(), {
          headers: { 'Content-Type': 'text/html' },
        });
    }
  } catch (error) {
    await logError(error, 'Request Handler', env);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 添加这个函数
async function handleCheckAuth(request, env) {
  return new Response(JSON.stringify({
    authenticated: isAuthenticated(request, env)
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// 处理登录请求
async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const formData = await request.formData();
    const password = formData.get('password');
    
    if (password === env.PASSWORD) {
      const response = new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
      response.headers.set('Set-Cookie', 
        `auth=${env.PASSWORD}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${CONFIG.COOKIE_MAX_AGE}`
      );
      return response;
    }
    
    return new Response(JSON.stringify({ success: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await logError(error, 'Login Handler', env);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 处理运行脚本请求
async function handleRun(request, env) {
  if (!isAuthenticated(request, env)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await handleScheduled(new Date().toISOString(), env);
    const results = await env.SERV_LOGIN.get('lastResults', 'json');
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await logError(error, 'Run Handler', env);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 处理结果请求
async function handleResults(request, env) {
  if (!isAuthenticated(request, env)) {
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const results = await env.SERV_LOGIN.get('lastResults', 'json');
    return new Response(JSON.stringify({ 
      authenticated: true, 
      results: results || [] 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await logError(error, 'Results Handler', env);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 处理认证检查请求
function isAuthenticated(request, env) {
  const cookies = request.headers.get('Cookie');
  if (cookies) {
    const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth='));
    if (authCookie) {
      const authValue = authCookie.split('=')[1];
      return authValue === env.PASSWORD;
    }
  }
  return false;
}

// 定时任务处理函数
async function handleScheduled(scheduledTime, env) {
  try {
    const response = await fetch(env.ACCOUNTS_URL);
    const accountsData = await response.json();
    const accounts = accountsData.accounts;
    
    let results = [];
    for (const account of accounts) {
      const result = await loginWithRetry(account, env);  // 添加 env 参数
      results.push(result);
      await delay(
        Math.floor(Math.random() * 
        (CONFIG.MAX_RANDOM_DELAY - CONFIG.MIN_RANDOM_DELAY)) + 
        CONFIG.MIN_RANDOM_DELAY
      );
    }

    await env.SERV_LOGIN.put('lastResults', JSON.stringify(results));
    await sendTelegramMessage(`定时任务完成，共处理 ${results.length} 个账号`, env);
  } catch (error) {
    await logError(error, 'Scheduled Handler', env);
  }
}

// 带重试机制的登录函数
async function loginWithRetry(account, env, attempts = CONFIG.RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await loginAccount(account, env);
      if (result.cronResults[0].success) {
        return result;
      }
      await delay(CONFIG.RETRY_DELAY * (i + 1));
    } catch (error) {
      if (i === attempts - 1) {
        throw error;
      }
      await delay(CONFIG.RETRY_DELAY * (i + 1));
    }
  }
  return createErrorResult(
    account.username, 
    account.type, 
    `登录失败，已重试 ${attempts} 次`
  );
}

// 账号登录检查函数
async function loginAccount(account, env) {
  const { username, password, panelnum, type } = account;
  const baseUrl = type === 'ct8' 
    ? 'https://panel.ct8.pl' 
    : `https://panel${panelnum}.serv00.com`;
  const loginUrl = `${baseUrl}/login/`;
  const userAgent = userAgentCache.get();

  try {
    const response = await fetch(loginUrl, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
      },
    });

    const pageContent = await response.text();
    const csrfToken = extractCsrfToken(pageContent);
    const initialCookies = response.headers.get('set-cookie') || '';

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': loginUrl,
        'User-Agent': userAgent,
        'Cookie': initialCookies,
      },
      body: new URLSearchParams({
        'username': username,
        'password': password,
        'csrfmiddlewaretoken': csrfToken,
        'next': '/'
      }).toString(),
      redirect: 'manual'
    });

    return handleLoginResponse(loginResponse, username, type, env);
  } catch (error) {
    await logError(error, `Login Account: ${username}`, env);
    return createErrorResult(username, type, error.message);
  }
}

// 提取 CSRF Token
function extractCsrfToken(pageContent) {
  const csrfMatch = pageContent.match(/name="csrfmiddlewaretoken" value="([^"]*)"/)
  if (!csrfMatch) {
    throw new Error('CSRF token not found');
  }
  return csrfMatch[1];
}

// 处理登录响应
function handleLoginResponse(response, username, type, env) {
  if (response.status === 302) {
    const message = '登录成功';
    sendTelegramMessage(`账号 ${username} (${type}) ${message}`, env);
    return createSuccessResult(username, type, message);
  } else {
    const message = '登录失败，未知原因。请检查账号和密码是否正确。';
    console.error(message);
    return createErrorResult(username, type, message);
  }
}

// 创建成功结果对象
function createSuccessResult(username, type, message) {
  return {
    username,
    type,
    cronResults: [{ success: true, message }],
    lastRun: new Date().toISOString()
  };
}

// 创建错误结果对象
function createErrorResult(username, type, message) {
  return {
    username,
    type,
    cronResults: [{ success: false, message }],
    lastRun: new Date().toISOString()
  };
}

// 发送 Telegram 通知
async function sendTelegramMessage(message, env) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TG_ID,
        text: message
      })
    });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

// 生成随机 User-Agent
function generateRandomUserAgent() {
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
  const browser = browsers[Math.floor(Math.random() * browsers.length)];
  const version = Math.floor(Math.random() * 100) + 1;
  const os = ['Windows NT 10.0', 'Macintosh', 'X11'];
  const selectedOS = os[Math.floor(Math.random() * os.length)];
  const osVersion = selectedOS === 'X11' ? 'Linux x86_64' : 
                   selectedOS === 'Macintosh' ? 'Intel Mac OS X 10_15_7' : 
                   'Win64; x64';

  return `Mozilla/5.0 (${selectedOS}; ${osVersion}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/${version}.0.0.0 Safari/537.36`;
}

// 日志记录函数
async function logError(error, context, env) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${context}: ${error.message}`;
  console.error(logMessage);
  await sendTelegramMessage(`错误警告: ${logMessage}`, env);
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTML 内容
function getHtmlContent() {
  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Serv00 账户批量登录</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background-color: #f0f0f0;
      }
      .container {
        text-align: center;
        padding: 20px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        max-width: 800px;
        width: 100%;
      }
      input, button {
        margin: 10px 0;
        padding: 10px;
        width: 200px;
        border-radius: 4px;
        border: 1px solid #ddd;
      }
      button {
        background-color: #4CAF50;
        border: none;
        color: white;
        cursor: pointer;
      }
      button:hover {
        background-color: #45a049;
      }
      button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
      #status {
        margin-top: 20px;
        font-weight: bold;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
      }
      #loginForm, #dashboard {
        display: none;
      }
      .error {
        color: #ff0000;
      }
      .success {
        color: #4CAF50;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Serv00登录控制面板</h1>
      <div id="loginForm">
        <input type="password" id="password" placeholder="请输入密码">
        <button onclick="login()">登录</button>
      </div>
      <div id="dashboard">
        <button onclick="runScript()" id="runButton">执行脚本</button>
        <div id="status"></div>
        <table id="resultsTable">
          <thead>
            <tr>
              <th>账号</th>
              <th>类型</th>
              <th>状态</th>
              <th>消息</th>
              <th>最后执行时间</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    <script>
      let password = '';

      function showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
      }

      function showDashboard() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        fetchResults();
      }

      async function checkAuth() {
        try {
          const response = await fetch('/check-auth');
          const data = await response.json();
          if (data.authenticated) {
            showDashboard();
          } else {
            showLoginForm();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          showLoginForm();
        }
      }

      async function login() {
        const passwordInput = document.getElementById('password');
        const formData = new FormData();
        formData.append('password', passwordInput.value);
        
        try {
          const response = await fetch('/login', { 
            method: 'POST',
            body: formData
          });
          const result = await response.json();
          
          if (result.success) {
            showDashboard();
          } else {
            alert('密码错误');
          }
        } catch (error) {
          console.error('Login failed:', error);
          alert('登录失败，请重试');
        }
        
        passwordInput.value = '';
      }

      async function runScript() {
        const statusDiv = document.getElementById('status');
        const runButton = document.getElementById('runButton');
        
        statusDiv.textContent = '正在执行脚本...';
        statusDiv.className = '';
        runButton.disabled = true;
        
        try {
          const response = await fetch('/run', { method: 'POST' });
          if (response.ok) {
            const results = await response.json();
            displayResults(results);
            statusDiv.textContent = '脚本执行成功！';
            statusDiv.className = 'success';
          } else if (response.status === 401) {
            statusDiv.textContent = '未授权，请重新登录。';
            statusDiv.className = 'error';
            showLoginForm();
          } else {
            throw new Error('Script execution failed');
          }
        } catch (error) {
          statusDiv.textContent = '脚本执行出错: ' + error.message;
          statusDiv.className = 'error';
        } finally {
          runButton.disabled = false;
        }
      }

      async function fetchResults() {
        try {
          const response = await fetch('/results');
          if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
              displayResults(data.results);
            } else {
              showLoginForm();
            }
          } else {
            throw new Error('Failed to fetch results');
          }
        } catch (error) {
          console.error('Error fetching results:', error);
          showLoginForm();
        }
      }

      function displayResults(results) {
        const tbody = document.querySelector('#resultsTable tbody');
        tbody.innerHTML = '';
        
        if (!results || results.length === 0) {
          const row = tbody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 5;
          cell.textContent = '暂无数据';
          cell.style.textAlign = 'center';
          return;
        }

        results.forEach(result => {
          result.cronResults.forEach((cronResult, index) => {
            const row = tbody.insertRow();
            if (index === 0) {
              row.insertCell(0).textContent = result.username;
              row.insertCell(1).textContent = result.type;
            } else {
              row.insertCell(0).textContent = '';
              row.insertCell(1).textContent = '';
            }
            const statusCell = row.insertCell(2);
            statusCell.textContent = cronResult.success ? '成功' : '失败';
            statusCell.className = cronResult.success ? 'success' : 'error';
            row.insertCell(3).textContent = cronResult.message;
            row.insertCell(4).textContent = new Date(result.lastRun).toLocaleString('zh-CN');
          });
        });
      }

      // 页面加载时检查认证状态
      document.addEventListener('DOMContentLoaded', checkAuth);
      
      // 添加回车键登录支持
      document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          login();
        }
      });
    </script>
  </body>
  </html>
  `;
}
