const express = require("express");
const { Worker } = require("worker_threads");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Survey Code Generator</title>
        <style>
          /* 保持原有样式 */
          .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            display: none;
            margin: 10px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* 新增结果展示样式 */
          #result {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            display: none;
          }
          #codeDisplay {
            font-size: 24px;
            color: #2ecc71;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>Get Survey Code</h1>
        <form id="generateForm">
          <button type="submit">Generate Code</button>
          <div class="loader"></div>
          <div id="status"></div>
        </form>

        <!-- 添加结果展示区域 -->
        <div id="result">
          <h3>Your Verification Code:</h3>
          <div id="codeDisplay"></div>
        </div>

        <script>
          let currentTaskId = null;
          let checkInterval = null;

          document.getElementById('generateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const loader = form.querySelector('.loader');
            const status = document.getElementById('status');
            const resultDiv = document.getElementById('result');
            const codeDisplay = document.getElementById('codeDisplay');

            loader.style.display = 'block';
            status.textContent = 'Submitting request...';
            resultDiv.style.display = 'none';
            form.querySelector('button').disabled = true;

            try {
              // Step 1: 提交生成请求
              const submitResponse = await fetch('/generate/start', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams(new FormData(form))
              });

              if (!submitResponse.ok) {
                const error = await submitResponse.json();
                throw new Error(error.message || 'Request failed');
              }

              const { taskId } = await submitResponse.json();
              currentTaskId = taskId;

              // Step 2: 启动轮询
              checkInterval = setInterval(async () => {
                try {
                  const checkResponse = await fetch(\`/generate/check/\${taskId}\`);
                  if (!checkResponse.ok) throw await checkResponse.json();
                  
                  const { status, progress, code, error } = await checkResponse.json();

                  if (status === 'processing') {
                    status.textContent = \`Processing: \${progress}%\`;
                    return;
                  }

                  if (status === 'completed') {
                    clearInterval(checkInterval);
                    status.textContent = 'Code generated successfully!';
                    codeDisplay.textContent = code;
                    resultDiv.style.display = 'block';
                  }

                  if (status === 'failed') {
                    throw new Error(error || 'Generation failed');
                  }
                } catch (error) {
                  clearInterval(checkInterval);
                  status.textContent = \`Check failed: \${error.message}\`;
                }
              }, 15000);

            } catch (error) {
              status.textContent = \`Error: \${error.message}\`;
              status.style.color = '#e74c3c';
            } finally {
              loader.style.display = 'none';
              form.querySelector('button').disabled = false;
            }
          });
        </script>
      </body>
    </html>
  `);
});

// Modify generate endpoint to handle POST
const tasks = new Map(); // 使用内存存储任务状态

app.post("/generate/start", (req, res) => {
  // 生成唯一任务ID
  const taskId = crypto.randomUUID();

  // 初始化任务状态
  tasks.set(taskId, {
    status: "pending",
    progress: 0,
    code: null,
    error: null,
  });

  // 异步启动生成任务
  const worker = new Worker("./generate-worker.js", {
    workerData: { taskId },
  });

  worker.on("message", (msg) => {
    const task = tasks.get(taskId);

    if (msg.type === "progress") {
      task.progress = msg.value;
      task.status = "processing";
    }

    if (msg.type === "success") {
      task.status = "completed";
      task.code = msg.code;
      task.progress = 100;
    }

    if (msg.type === "error") {
      task.status = "failed";
      task.error = msg.error;
    }
  });

  res.json({ taskId });
});

app.get("/generate/check/:taskId", (req, res) => {
  const task = tasks.get(req.params.taskId);

  if (!task) {
    return res.status(404).json({ error: "任务不存在" });
  }

  // 返回精简状态信息
  res.json({
    status: task.status,
    progress: task.progress,
    code: task.code,
    error: task.error,
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});
