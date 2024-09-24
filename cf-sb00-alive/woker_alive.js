addEventListener('fetch', event => {
    event.respondWith(handleRequest(event));
});

addEventListener('scheduled', event => {
    event.waitUntil(handleScheduled(event));
});

async function handleRequest(event) {
    const { env } = event;
    const ACCOUNTS_JSON = JSON.parse(env.ACCOUNTS_JSON);
    const NEZHA_SERVER = env.NEZHA_SERVER;
    const NEZHA_APITOKEN = env.NEZHA_APITOKEN;
    const NEZHA_IDS = env.NEZHA_IDS ? env.NEZHA_IDS.split(',') : [];
    const KV_NAMESPACE = env.KV_NAMESPACE || 'SB00';
    const MAX_RETRIES = parseInt(env.MAX_RETRIES || 5);
    const RETRY_INTERVAL = parseInt(env.RETRY_INTERVAL || 30) * 1000;
    const REBOOT_SCRIPT = env.REBOOT_SCRIPT || 'https://raw.githubusercontent.com/yutian81/serv00-ct8-ssh/main/reboot.sh';

    try {
        const results = await checkAllStatus(ACCOUNTS_JSON, NEZHA_SERVER, NEZHA_APITOKEN, NEZHA_IDS, MAX_RETRIES, RETRY_INTERVAL, REBOOT_SCRIPT, env);
        await saveResultsToKV(KV_NAMESPACE, results, env);
        return new Response(JSON.stringify(results, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}

async function checkAllStatus(vpsData, nezhaServer, nezhaApiToken, nezhaIds, maxRetries, retryInterval, rebootScript, env) {
    let retries = 0;
    let allChecksPassed = false;
    let failedChecks = [];

    while (retries < maxRetries) {
        failedChecks = [];
        const checkResults = await Promise.all(vpsData.map(async (server) => {
            const { panel, argo_port, argo_domain } = server;
            const argoPortCheck = await checkArgoPort(panel, argo_port);
            const argoStatusCheck = await checkArgoStatus(argo_domain);
            const nezhaStatusCheck = await checkNezhaStatus(nezhaServer, nezhaApiToken, nezhaIds, env);
            if (!argoPortCheck) {
                failedChecks.push({ server, check: 'Argo TCP端口连通检测', status: '失败' });
            }
            if (!argoStatusCheck) {
                failedChecks.push({ server, check: 'Argo 域名连通状态检测', status: '失败' });
            }
            if (!nezhaStatusCheck) {
                failedChecks.push({ server, check: 'Nezha 探针在线状态检测', status: '失败' });
            }
            return argoPortCheck && argoStatusCheck && nezhaStatusCheck;
        }));

        allChecksPassed = checkResults.every(result => result);
        if (allChecksPassed) {
            return { status: '所有检查项通过' };
        }
        retries++;
        if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
    }

    await runRemoteCmd(vpsData, rebootScript);
    return {
        status: '检查失败，以下检测项未通过，正在尝试连接服务器SSH',
        failedChecks: failedChecks
    };
}

async function checkNezhaStatus(nezhaServer, nezhaApiToken, nezhaIds, env) {
    const response = await fetch(`${nezhaServer}/api/v1/server/list`, {
        headers: { 'Authorization': `Bearer ${nezhaApiToken}` }
    });

    if (!response.ok) {
        throw new Error('无法访问 Nezha 面板，请检查哪吒面板的域名和APIToken');
    }

    const agentList = await response.json();
    const currentTime = Math.floor(Date.now() / 1000);
    const filteredAgents = agentList.result.filter(agent => {
        const { id, last_active } = agent;
        if (nezhaIds.includes(id)) {
            const activeTime = currentTime - last_active;
            return activeTime <= 30;
        }
        return false;
    });

    if (filteredAgents.length === 0) {
        throw new Error('没有找到符合条件的 Nezha 探针');
    }
    return filteredAgents;
}

async function saveResultsToKV(results, env) {
    // 使用 KV 命名空间保存结果
    await env.KV_NAMESPACE.put('status', JSON.stringify(results));
}

async function runRemoteCmd(vpsData, rebootScript) {
    for (const server of vpsData) {
        const { ssh, username, password } = server;
        const encodedPassword = Buffer.from(password).toString('base64');  // 使用 Buffer 进行 Base64 编码
        // 构建用于 SSH 连接的 API URL
        const sshApiUrl = `https://ssh.ytian.us.kg/?hostname=${ssh}&port=22&username=${username}&password=${encodedPassword}`;  
        // 构建用于执行远程命令的 API URL
        const command = `https://ssh.ytian.us.kg/?command=bash <(curl -Ls ${rebootScript})`;

        try {
            // 尝试连接 SSH
            const sshResponse = await fetch(sshApiUrl);
            if (sshResponse.ok) {
                console.log(`SSH 登录成功，执行远程命令...`);                
                // 尝试执行远程命令
                const commandResponse = await fetch(command);
                if (commandResponse.ok) {
                    console.log(`远程命令执行成功: ${commandResponse.status}`);
                } else {
                    console.log('远程命令执行失败');
                }
            } else {
                console.log('SSH 登录失败');
            }
        } catch (error) {
            console.log(`执行远程命令时出错: ${error.message}`);
        }
    }
}
