// 定时触发器
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduledEvent());
});

async function handleScheduledEvent() {
  // 1. 从 Secrets 读取 VPS_JSON_URL 和 SCRIPT_URL
  const SCRIPT_URL = env.SCRIPT_URL;
  const VPS_JSON_URL = env.VPS_JSON_URL;

  if (!SCRIPT_URL || !VPS_JSON_URL) {
    console.error("缺少环境变量 SCRIPT_URL 或 VPS_JSON_URL");
    return;
  }

  // 2. 拉取 VPS JSON 文件
  const vpsData = await fetchVpsJson(VPS_JSON_URL);
  if (!vpsData) return;

  // 3. 遍历每个服务器，进行端口检测并执行远程命令
  for (const server of vpsData) {
    const { HOST, SSH_USER, SSH_PASS, VMESS_PORT } = server;

    // 检测 TCP 端口
    const portStatus = await checkPort(HOST, VMESS_PORT);
    if (!portStatus) {
      // 尝试 SSH 连接并执行远程命令
      const sshStatus = await runRemoteCommand(server, SCRIPT_URL);
      if (sshStatus) {
        console.log(`成功执行命令：服务器 ${HOST}，用户名${SSH_USER}`);
      } else {
        console.log(`SSH 连接失败：服务器 ${HOST}，用户名${SSH_USER}`);
      }
    } else {
      console.log(`端口 ${VMESS_PORT} 通畅：服务器 ${HOST}，用户名${SSH_USER}`);
    }
  }
}

// 拉取 VPS JSON 文件
async function fetchVpsJson(VPS_JSON_URL) {
  try {
    const response = await fetch(VPS_JSON_URL);
    if (response.ok) {
      return await response.json();
    } else {
      console.error('无法获取 VPS JSON 文件');
      return null;
    }
  } catch (error) {
    console.error('错误:', error);
    return null;
  }
}

// 检测 TCP 端口是否通畅
async function checkPort(host, port) {
  try {
    const response = await fetch(`https://api.portchecker.io/${HOST}:${VMESS_PORT}`);
    return response.ok;  // 端口通畅时返回 true
  } catch (error) {
    console.error(`端口检测失败 ${HOST}:${VMESS_PORT} - 错误: ${error}`);
    return false;
  }
}

// 通过第三方API执行远程命令
async function runRemoteCommand(server, SCRIPT_URL) {
  const { HOST, SSH_USER, SSH_PASS, VMESS_PORT, SOCKS_PORT, HY2_PORT, SOCKS_USER, SOCKS_PASS, ARGO_DOMAIN, ARGO_AUTH, NEZHA_SERVER, NEZHA_PORT, NEZHA_KEY } = server;
  const payload = {
    hostname: HOST,
    username: SSH_USER,
    password: SSH_PASS,
    command: `VMESS_PORT=${VMESS_PORT} HY2_PORT=${HY2_PORT} SOCKS_PORT=${SOCKS_PORT} ARGO_DOMAIN=${ARGO_DOMAIN} ARGO_AUTH="${ARGO_AUTH}" NEZHA_SERVER=${NEZHA_SERVER} NEZHA_PORT=${NEZHA_PORT} NEZHA_KEY=${NEZHA_KEY} bash <(curl -Ls ${SCRIPT_URL})`
  };

  try {
    const response = await fetch("https://ssh.yzong.us.kg/?hostname=HOST&port=22&username=SSH_USER&password=SSH_PASS&command=", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error(`远程命令执行失败: ${error}`);
    return false;
  }
}
