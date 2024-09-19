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
    const nezhaResponse = await fetch(NEZHA_API, {
      headers: { 'Authorization': `Bearer ${NEZHA_APITOKEN}` }
    });
    if (!nezhaResponse.ok) throw new Error('无法获取 Nezha 状态');
    const agentList = await nezhaResponse.json();

    // 处理服务器
    const filteredAgents = processServers(vpsData, agentList);
    return new Response(JSON.stringify(filteredAgents, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}

function processServers(vpsData, agentList) {
  const idsFound = ["13", "14", "17", "23", "24"];  // 要检查的服务器 ID
  const currentTime = Math.floor(Date.now() / 1000); // 当前时间（秒）

  return vpsData.map(server => {
    const { HOST, VMESS_PORT, SOCKS_PORT, HY2_PORT, SOCKS_USER, SOCKS_PASS, ARGO_DOMAIN, ARGO_AUTH, NEZHA_SERVER, NEZHA_PORT, NEZHA_KEY } = server;

    const allChecks = checkTCPPort(HOST, VMESS_PORT) &&
                      checkArgoStatus(ARGO_DOMAIN) &&
                      checkNezhaStatus(agentList, idsFound, currentTime);

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
  });
}

function checkTCPPort(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let timeout = false;

    // 设置连接超时时间
    const timeoutId = setTimeout(() => {
      timeout = true;
      socket.destroy();
      reject(new Error('连接超时'));
    }, 5000); // 5秒超时

    socket.on('connect', () => {
      clearTimeout(timeoutId);
      socket.end();
      resolve(true);
    });

    socket.on('error', (err) => {
      clearTimeout(timeoutId);
      if (!timeout) {
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

function checkArgoStatus(domain) {
  // 模拟 Argo 状态检查（这里通常会使用服务来检查域名状态）
  // 目前仅为占位符
  return true;  // 替换为实际检查逻辑
}

function checkNezhaStatus(agentList, idsFound, currentTime) {
  return agentList.result.some(agent => {
    const { id, last_active } = agent;
    return idsFound.includes(id) &&
           (!isNaN(last_active) && (currentTime - last_active) <= 30);
  });
}
