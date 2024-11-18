const moment = require('moment-timezone');

// 从环境变量加载 URLs，每行一个地址
const urls = (process.env['24_URLS'] || '').split('\n').map(url => url.trim()).filter(url => url);  // 从环境变量 24_URLS 获取并按行拆分
const websites = (process.env['NO24_URLS'] || '').split('\n').map(url => url.trim()).filter(url => url);  // 从环境变量 NO24_URLS 获取并按行拆分

// 访问网站的函数
async function visitWebsites() {
  const currentMoment = moment().tz('Asia/Hong_Kong');
  const formattedTime = currentMoment.format('YYYY-MM-DD HH:mm:ss');

  for (let url of websites) {
    try {
      const response = await fetch(url);
      console.log(`${formattedTime} Visited web successfully: ${url} - Status code: ${response.status}`);
    } catch (error) {
      console.error(`${formattedTime} Error visiting ${url}: ${error.message}`);
    }
  }
}

// 访问24小时不间断的URL数组
async function scrapeAndLog(url) {
  try {
    const response = await fetch(url);
    console.log(`${moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD HH:mm:ss')} Web visited Successfully: ${url} - Status code: ${response.status}`);
  } catch (error) {
    console.error(`${moment().tz('Asia/Hong_Kong').format('YYYY-MM-DD HH:mm:ss')} Error visiting: ${url}: ${error.message}`);
  }
}

// 定时器函数
async function checkAndSetTimer() {
  const currentMoment = moment().tz('Asia/Hong_Kong');
  const formattedTime = currentMoment.format('YYYY-MM-DD HH:mm:ss');
  
  if (currentMoment.hours() >= 1 && currentMoment.hours() < 5) {
    console.log(`Stop visit from 1:00 to 5:00 --- ${formattedTime}`);
    // 此处可以暂停访问
  } else {
    console.log(`Running visit at ${formattedTime}`);
    visitWebsites();
  }
}

// Worker 的主函数
async function handleRequest(request) {
  const currentMoment = moment().tz('Asia/Hong_Kong');
  const formattedTime = currentMoment.format('YYYY-MM-DD HH:mm:ss');
  
  console.log(`Worker activated at ${formattedTime}`);

  // 每2分钟访问一次 24小时不间断的URLs
  urls.forEach((url) => {
    scrapeAndLog(url);
  });

  // 处理在01:00至05:00暂停访问的URLs
  await checkAndSetTimer();
  
  return new Response('Request processed by Cloudflare Worker!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// 在此添加Cron触发器配置
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 通过 Cron 触发器定时运行访问
// 在 Cloudflare Workers Cron Triggers中设置一个Cron表达式来触发worker运行，示例：`*/2 * * * *`
// 该触发器每两分钟运行一次
