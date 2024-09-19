addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 从环境变量中读取配置
  const VPS_JSON_URL = ENV_VPS_JSON_URL;
  const NEZHA_URL = ENV_NEZHA_URL;
  const NEZHA_APITOKEN = ENV_NEZHA_APITOKEN;
  const ACCOUNTS_JSON = JSON.parse(ENV_ACCOUNTS_JSON);
  const KV_NAMESPACE = 'YOUR_KV_NAMESPACE'; // 替换为你的 KV 员名空间 ID
  const MAX_RETRIES = 5;
  const RETRY_INTERVAL = 30000; // 30秒

  try {
    // 下载 JSON 文件
    const vpsResponse = await fetch(VPS_JSON_URL);
    if (!vpsResponse.ok) throw new Error('无法获取 VPS JSON 文件');
    const vpsData = await vpsResponse.json();

    // 执行检查
    const results = await checkStatusWithRetries(vpsData, NEZHA_URL, NEZHA_APITOKEN, ACCOUNTS_JSON);

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

async function checkStatusWithRetries(vpsData, nezhaUrl, nezhaApiToken, accountsJson) {
  let retries = 0;
  let allChecks = false;

  while (retries < MAX_RETRIES) {
    const agentList = await checkNezhaStatus(nezhaUrl, nezhaApiToken);

    allChecks = await Promise.all(vpsData.map(async server => {
      const { HOST, VMESS_PORT, SOCKS_PORT, HY2_PORT, ARGO_DOMAIN } = server;
      return await checkTCPPort(HOST, VMESS_PORT) &&
             await checkArgoStatus(ARGO_DOMAIN) &&
             await checkNezhaStatus(agentList);
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

async function checkTCPPort(host, port) {
  const url = `http://${host}:${port}`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkArgoStatus(domain) {
  const url = `https://${domain}`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.status !== 530; // 状态码 530 表示不可达
  } catch {
    return false;
  }
}

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

async function saveResultsToKV(namespace, results) {
  // 将结果保存到 KV 存储
  await MY_KV_NAMESPACE.put('status', JSON.stringify(results));
}

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
      const loginResponse = await fetch(`https://${panel}/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!loginResponse.ok) throw new Error('面板登录失败');

      const loginResult = await loginResponse.json();
      // 假设登录成功后可以用来检查 cron 任务的 API
      const cronResponse = await fetch(`https://${panel}/api/cron-jobs`, {
        headers: { 'Authorization': `Bearer ${loginResult.token}` }  // 使用登录时获得的 Token
      });

      if (!cronResponse.ok) throw new Error('无法检查 cron 任务');

      const cronResult = await cronResponse.json();
      console.log(`面板 ${panel} 的 cron 任务:`, cronResult);

    } catch (error) {
      console.error(`检查面板 ${panel} 的 cron 任务失败: ${error.message}`);
    }
  }
}
