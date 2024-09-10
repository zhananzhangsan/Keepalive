const SCRIPT_URL = "https://raw.githubusercontent.com/eooce/sing-box/main/sb_00.sh";
const VPS_JSON_URL = "https://github.yutian81.top/yutian81/Wanju-Nodes/main/serv00-panel3/sb00ssh.json";

// 定时触发器
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduledEvent());
});

async function handleScheduledEvent() {
  // 1. 拉取 VPS JSON 文件
  const vpsData = await fetchVpsJson();
  if (!vpsData) return;

  // 2. 遍历每个服务器，进行端口检测并执行远程命令
  for (const server of vpsData) {
    const { HOST, SSH_USER, SSH_PASS, VMESS_PORT } = server;

    // 检测 TCP 端口
    const portStatus = await checkPort(HOST, VMESS_PORT);
    if (!portStatus) {
      // 尝试 SSH 连接并执行远程命令
      const sshStatus = await runRemoteCommand(server);
      if (sshStatus) {
        console.log(`成功执行命令：服务器 ${HOST}`);
      } else {
        console.log(`SSH 连接失败：服务器 ${HOST}`);
      }
    } else {
      console.log(`端口 ${VMESS_PORT} 通畅：服务器 ${HOST}`);
    }
  }
}

// 拉取 VPS JSON 文件
async function fetchVpsJson() {
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
    const response = await fetch(`https://api.portchecker.io/${host}:${port}`);
    return response.ok;  // 端口通畅时返回 true
  } catch (error) {
    console.error(`端口检测失败 ${host}:${port} - 错误: ${error}`);
    return false;
  }
}

// 模拟执行远程命令（可通过第三方API实现）
async function runRemoteCommand(server) {
  const { SSH_USER, SSH_PASS, HOST, VMESS_PORT, SOCKS_PORT, HY2_PORT, ARGO_DOMAIN, ARGO_AUTH, NEZHA_SERVER, NEZHA_PORT, NEZHA_KEY } = server;

  // 假设你有一个 API 能通过 SSH 执行命令，下面是伪代码：
  const payload = {
    host: HOST,
    user: SSH_USER,
    password: SSH_PASS,
    command: `VMESS_PORT=${VMESS_PORT} HY2_PORT=${HY2_PORT} SOCKS_PORT=${SOCKS_PORT} ARGO_DOMAIN=${ARGO_DOMAIN} ARGO_AUTH="${ARGO_AUTH}" NEZHA_SERVER=${NEZHA_SERVER} NEZHA_PORT=${NEZHA_PORT} NEZHA_KEY=${NEZHA_KEY} bash <(curl -Ls ${SCRIPT_URL})`
  };

  try {
    const response = await fetch("https://your-ssh-api.com/execute", {
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
