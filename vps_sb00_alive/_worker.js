// 定义定时任务的 cron 调度配置
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event.scheduledTime));
});

// 定时任务的具体实现
async function handleScheduled(dateTime) {
  const vpsData = await fetch(env.VPS_JSON_URL).then(res => res.json());
  const results = await checkStatusWithRetries(vpsData, env.NEZHA_SERVER, env.NEZHA_APITOKEN, JSON.parse(env.ACCOUNTS_JSON), MAX_RETRIES, RETRY_INTERVAL);
  await saveResultsToKV(env.KV_NAMESPACE, results);
  console.log(`Scheduled task completed at ${dateTime}`);
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env));
});

async function handleRequest(request, env) {
  const url = new URL(request.url);

  // 从环境变量中读取配置
  const VPS_JSON_URL = env.VPS_JSON_URL;
  const NEZHA_SERVER = env.NEZHA_SERVER;
  const NEZHA_APITOKEN = env.NEZHA_APITOKEN;
  const ACCOUNTS_JSON = JSON.parse(env.ACCOUNTS_JSON);
  const KV_NAMESPACE = env.KV_NAMESPACE; // 替换为你的 KV 命名空间 ID
  const MAX_RETRIES = 5;
  const RETRY_INTERVAL = 30000; // 30秒

  // 定义处理不同路径的逻辑
  if (url.pathname === '/check-status') {
    return await handleCheckStatus(VPS_JSON_URL, NEZHA_SERVER, NEZHA_APITOKEN, ACCOUNTS_JSON, KV_NAMESPACE, MAX_RETRIES, RETRY_INTERVAL);
  } else if (url.pathname === '/login' && request.method === 'POST') {
    return await handleLogin(request, ACCOUNTS_JSON);
  } else if (url.pathname === '/results' && request.method === 'GET') {
    if (!isAuthenticated(request)) {
      return new Response(JSON.stringify({ authenticated: false }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const results = await KV_NAMESPACE.get('lastResults', 'json');
    return new Response(JSON.stringify({ authenticated: true, results: results || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else if (url.pathname === '/check-auth' && request.method === 'GET') {
    return new Response(JSON.stringify({ authenticated: isAuthenticated(request) }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    // 对于其他路径，返回 404
    return new Response('Not Found', { status: 404 });
  }
}

// 处理 /check-status 请求的逻辑
async function handleCheckStatus(VPS_JSON_URL, NEZHA_SERVER, NEZHA_APITOKEN, ACCOUNTS_JSON, KV_NAMESPACE, MAX_RETRIES, RETRY_INTERVAL) {
  try {
    // 执行检查
    const vpsResponse = await fetch(VPS_JSON_URL);
    if (!vpsResponse.ok) throw new Error('无法获取 VPS JSON 文件');
    const vpsData = await vpsResponse.json();
    const results = await checkStatusWithRetries(vpsData, NEZHA_SERVER, NEZHA_APITOKEN, ACCOUNTS_JSON, MAX_RETRIES, RETRY_INTERVAL);

    // 将结果保存到 KV 存储
    await saveResultsToKV(KV_NAMESPACE, results);

    // 返回结果
    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}

// 处理登录请求
async function handleLogin(request, accountsJson) {
  const formData = await request.formData();
  const panelUrl = formData.get('panel');
  const username = formData.get('username');
  const password = formData.get('password');

  // 从 ACCOUNTS_JSON 中获取存储的密码
  const account = accountsJson.find(acc => acc.panel === panelUrl && acc.username === username);

  if (account && password === account.password) {
    const response = new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    response.headers.set('Set-Cookie', `auth=${password}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);
    return response;
  } else {
    return new Response(JSON.stringify({ success: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 检查请求是否已认证
function isAuthenticated(request) {
  const cookies = request.headers.get('Cookie');
  if (cookies) {
    const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth='));
    if (authCookie) {
      const authValue = authCookie.split('=')[1];
      return authValue === 'your_password'; // 替换为你的密码
    }
  }
  return false;
}

// 检查状态，带重试机制
async function checkStatusWithRetries(vpsData, nezhaServer, nezhaApiToken, accountsJson, MAX_RETRIES, RETRY_INTERVAL) {
  let retries = 0;
  let allChecks = false;

  while (retries < MAX_RETRIES) {
    const agentList = await checkNezhaStatus(nezhaServer, nezhaApiToken);

    allChecks = await Promise.all(vpsData.map(async server => {
      const { HOST, VMESS_PORT, SOCKS_PORT, HY2_PORT, ARGO_DOMAIN } = server;
      return await checkTCPPort(HOST, VMESS_PORT) &&
             await checkArgoStatus(ARGO_DOMAIN) &&
             await checkNezhaStatus(nezhaServer, nezhaApiToken);
    })).then(results => results.every(check => check));

    if (allChecks) {
      return { status: '所有检查项通过' };
    }

    retries++;
    if (retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
    }
  }

  // 如果仍有检查项不通，登录服务器检查 cron 任务
  await checkCronJobs(vpsData, accountsJson);

  return { status: '检查失败，所有检查项都未通过' };
}

// 检查 TCP 端口
async function checkTCPPort(host, port) {
  const url = `http://${host}:${port}`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// 检查 Argo 状态
async function checkArgoStatus(domain) {
  const url = `https://${domain}`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status !== 530; // 状态码 530 表示不可达
  } catch {
    return false;
  }
}

// 检查 Nezha 状态
async function checkNezhaStatus(apiUrl, apiToken) {
  const idsFound = ["13", "14", "17", "23", "24"];  // 需要检测的探针 ID
  const response = await fetch(`${apiUrl}/api/v1/server/list`, {
    headers: { 'Authorization': `Bearer ${apiToken}` }
  });

  if (!response.ok) {
    throw new Error('无法访问 Nezha 面板，请检查 API 地址和 Token');
  }

  const agentList = await response.json();
  const currentTime = Math.floor(Date.now() / 1000);

  const filteredAgents = agentList.result.filter(agent => {
    const { id, last_active } = agent;
    if (idsFound.includes(id) && !isNaN(last_active)) {
      const activeTime = currentTime - last_active;
      return activeTime <= 30;
    }
    return false;
  }).map(agent => {
    return {
      server_name: agent.name,
      last_active: agent.last_active,
      valid_ip: agent.valid_ip,
      server_id: agent.id
    };
  });

  if (filteredAgents.length === 0) {
    throw new Error('没有找到符合条件的 Nezha 探针，请检查 ID 列表');
  }

  return filteredAgents;
}

// 将结果保存到 KV 存储
async function saveResultsToKV(namespace, results) {
  await namespace.put('status', JSON.stringify(results));
}

// 检查 cron 任务
async function checkCronJobs(vpsData, accountsJson) {
  for (const server of vpsData) {
    const panelUrl = server.panel; // 从 server 对象获取 panel URL
    const account = accountsJson.find(acc => acc.panel === panelUrl);

    if (!account) {
      console.error(`找不到与面板 ${panelUrl} 匹配的登录信息`);
      continue;
    }

    const { panel, username, password } = account;

    try {
      // 登录到面板
      const loginResponse = await fetch(`https://${panel}/api/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!loginResponse.ok) throw new Error('面板登录失败');

      // 使用登录成功后的 Token 检查 cron 任务
      const token = (await loginResponse.json()).token;

      const cronResponse = await fetch(`https://${panel}/api/cron`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!cronResponse.ok) throw new Error('无法获取 cron 任务');

      const cronData = await cronResponse.json();
      console.log(`面板 ${panel} 的 cron 任务数据:`, cronData);

    } catch (error) {
      console.error(`检查 cron 任务失败: ${error.message}`);
    }
  }
}
