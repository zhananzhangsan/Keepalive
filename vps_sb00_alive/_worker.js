addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const VPS_JSON_URL = 'https://raw.githubusercontent.com/yutian81/Wanju-Nodes/main/serv00-panel3/sb00ssh.json';
  const NEZHA_URL = 'https://nezha.yutian81.top';
  const NEZHA_APITOKEN = '';  // 替换为你的 API token（如果有的话）
  const NEZHA_API = `${NEZHA_URL}/api/v1/server/list`;

  try {
    // 下载 JSON 文件
    const vpsResponse = await fetch(VPS_JSON_URL);
    if (!vpsResponse.ok) throw new Error('无法获取 VPS JSON 文件');
    const vpsData = await vpsResponse.json();

    // 检查 Nezha 状态
    const agentList = await checkNezhaStatus(NEZHA_API, NEZHA_APITOKEN);
    if (!agentList) throw new Error('无法获取 Nezha 状态或没有找到符合条件的探针');

    // 处理服务器
    const filteredAgents = await processServers(vpsData, agentList);
    return new Response(JSON.stringify(filteredAgents, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}

async function processServers(vpsData, agentList) {
  const idsFound = ["13", "14", "17", "23", "24"];  // 要检查的服务器 ID
  const currentTime = Math.floor(Date.now() / 1000); // 当前时间（秒）

  return Promise.all(vpsData.map(async server => {
    const { HOST, VMESS_PORT, SOCKS_PORT, HY2_PORT, SOCKS_USER, SOCKS_PASS, ARGO_DOMAIN, ARGO_AUTH, NEZHA_SERVER, NEZHA_PORT, NEZHA_KEY } = server;

    const allChecks = await checkTCPPort(HOST, VMESS_PORT) &&
                      await checkArgoStatus(ARGO_DOMAIN) &&
                      await checkNezhaStatus(agentList, idsFound, currentTime);

    return {
      HOST,
      VMESS_PORT,
      SOCKS_PORT,
      HY2_PORT,
      SOCKS_USER,
      SOCKS_PASS,
      ARGO_DOMAIN,
      ARGO_AUTH,
      NEZHA_SERVER,
      NEZHA_PORT,
      NEZHA_KEY,
      status: allChecks ? '正常' : '发现问题'
    };
  }));
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
  const response = await fetch(apiUrl, {
    headers: { 'Authorization': `Bearer ${apiToken}` }
  });

  if (!response.ok) {
    throw new Error('无法访问 Nezha 面板，请检查 API 地址和 Token');
  }

  const agentList = await response.json();
  const currentTime = Math.floor(Date.now() / 1000);

  const filteredAgents = agentList.result.filter(agent => {
    const { id, last_active, valid_ip, name } = agent;
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
