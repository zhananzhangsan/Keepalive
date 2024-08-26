## 1.在cloudflare创建worker
复制_worker.js内容到worker，保存并部署  

## 2.创建变量
- **ACCOUNTS_JSON**
  
  `cronCommands`这部分是你想要添加的`cron任务`，可以是路径，也可以是程序运行的命令(一个引号内是完整的执行命令)  
  
  ```
  {
    "accounts": [
      {
        "username": "user1",
        "password": "password1",
        "type": "ct8",
        "cronCommands": [
          "/usr/home/serv00name/domains",
          "你的脚本"
        ]
      },
      {
        "username": "user2",
        "password": "password2",
        "panelnum": "2",
        "type": "serv00",
        "cronCommands": [
          "/usr/home/serv00name"
        ]
      },
      {
        "username": "user3",
        "password": "password3",
        "type": "ct8",
        "cronCommands": [
          "/usr/home/serv00name",
          "你的脚本",
          "python /usr/home/serv00name/domains/backup.py"
        ]
      }
    ]
  }
  ```
- **TELEGRAM_JSON**
  
  ```
  { "telegramBotToken": "YOUR_BOT_TOKEN", "telegramBotUserId": "YOUR_USER_ID" }
  ```
- **PASSWORD**
  
  你访问面板需要的密码  
  ![image](https://github.com/user-attachments/assets/b39072db-b842-4fd6-b672-f7698c7562e0)

## 3.添加Cron

  在你的worker项目中设置`触发器`，设置`corn`计划任务  
  为了避免频繁登录执行脚本，建议各位佬友把时间填`6-12h`为宜    
  ![image](https://github.com/user-attachments/assets/24f62d48-8fe9-40e6-91f8-bf3eb5ae45b7)

## 4.创建一个KV变量

  创建一个名为`CRON_RESULTS`的`KV命名空间`  
  回到刚才创建的worker界面，绑定kv变量  
  变量名称：`CRON_RESULTS`；变量值：选择你刚设置的`KV命名空间`  
  ![image](https://github.com/user-attachments/assets/601395f2-9271-4263-bcb7-b1b53ef53ed2)

## 5.绑定自定义域名

  会的都会，此处略过  

## 现在已经大功告成了

  访问你的worker网站并输入密码,点击`运行脚本`按钮就开始启动了  
  面板会显示运行日志：
  ![image](https://github.com/user-attachments/assets/a56bed89-dc7c-45a0-b481-ae4475e49c73)

## 注意

  这个面板会记录你最后一次执行的命令结果，包括你手动执行或者是设置的定时Cron   
  当你部署在serv00的网站不能访问时，通过访问worker，点击一下运行脚本就能马上执行任务了，避免了频繁的使用cron启动脚本登录网站执行命令   
  电报只有当cron被干掉重新建立时才会通知（运行就消息推送会消息爆炸），这个可视化面板会记录输出的最后一次运行状态算是弥补了这部分   

## 原作者
  https://linux.do/t/topic/181957  

