const puppeteer = require("puppeteer");
const { parentPort } = require("worker_threads");

const getFinalCode = async (page) => {
  try {
    await page.waitForFunction(() => document.querySelector("iframe"), {
      timeout: 20000,
    });

    const iframeHandle = await page.$("iframe");
    const finalIframe = await iframeHandle.contentFrame();

    await finalIframe.waitForSelector("div.EndOfSurvey", {
      visible: true,
      timeout: 20000,
    });

    const resultText = await finalIframe.evaluate(() => {
      const element = document.querySelector("div.EndOfSurvey");
      return element ? element.innerText : "";
    });

    const codeMatch = resultText.match(/Validation Code:\s+(BB\d{4,})/i);

    if (!codeMatch?.[1]) {
      throw new Error("未找到有效的验证码格式");
    }

    const validationCode = codeMatch[1];

    if (!/^BB\d{4,}$/i.test(validationCode)) {
      throw new Error("验证码格式异常: " + validationCode);
    }

    return validationCode;
  } catch (error) {
    await page.screenshot({ path: `error-${Date.now()}.png` });
    console.error("验证码提取失败:", error.message);
    throw new Error(`验证码提取失败: ${error.message}`);
  }
};

const clickRadioOption = async (page) => {
  let updatedIframeElement = await page.waitForSelector("iframe", {
    timeout: 6000,
  });
  const iframe = await updatedIframeElement.contentFrame();

  const ChoiceStructure = await iframe.$(".ChoiceStructure", {
    visible: true,
    timeout: 1000,
  });

  const QuestionBody = await iframe.$(".QuestionBody ", {
    visible: true,
    timeout: 1000,
  });

  let questionBody;
  if (ChoiceStructure) {
    questionBody = ChoiceStructure;
  } else if (QuestionBody) {
    questionBody = QuestionBody;
  }
  console.log("questionBody: ", questionBody);

  // 5. 获取所有选项
  const labels = await questionBody.$$("label.q-radio");
  console.log("labels: ", labels);

  for (let i = 0; i < labels.length; i += 5) {
    await labels[i].click();
  }

  const submitButton4 = await iframe.$("input#NextButton");
  await iframe.evaluate((btn) => {
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
  }, submitButton4);

  await submitButton4.click();
};

const clickSingleOption = async (page, option = "") => {
  let updatedIframeElement = await page.waitForSelector("iframe", {
    timeout: 6000,
  });
  const iframe = await updatedIframeElement.contentFrame();

  const ChoiceStructure = await iframe.$(".ChoiceStructure", {
    visible: true,
    timeout: 1000,
  });

  const QuestionBody = await iframe.$(".QuestionBody ", {
    visible: true,
    timeout: 1000,
  });

  let questionBody;
  if (ChoiceStructure) {
    questionBody = ChoiceStructure;
  } else if (QuestionBody) {
    questionBody = QuestionBody;
  }
  console.log("questionBody: ", questionBody);

  // 5. 获取所有选项
  const labels = await questionBody.$$("label:not(:empty)");
  console.log("labels: ", labels);

  const labelTexts = await Promise.all(
    labels.map((label) =>
      label.evaluate((el) => {
        // 深度获取文本（包含所有子元素）
        return el.textContent?.replace(/\s+/g, "").trim() || "";
      })
    )
  ).then((texts) => texts.filter((t) => t.length > 0));

  console.log("实际选项内容:", labelTexts);

  // 定义匹配规则
  const keywords = [
    "highly satisfied",
    "dine-in",
    "dine in",
    "Front counter",
    "BURGER KING® mobile app",
    "Yes",
    "Beef",
  ].map((k) => k.toLowerCase().replace(/\s+/g, ""));

  // 查找匹配项
  let targetIndex = labelTexts.findIndex((text) => {
    const cleanText = text.toLowerCase().replace(/\s+/g, "");
    return keywords.some((kw) => cleanText.includes(kw));
  });

  if (option) {
    targetIndex = labelTexts.findIndex((text) => {
      const cleanText = text.toLowerCase().replace(/\s+/g, "");
      return option === cleanText;
    });
  }

  if (targetIndex === -1) {
    targetIndex = 0;
  }
  const targetLabel = labels[targetIndex];
  // 获取目标元素句柄

  console.log("targetlabel: ", targetLabel);

  // 验证元素有效性
  if (!targetLabel || !targetLabel.click) {
    console.error("目标元素无效:", targetLabel);
    throw new Error("无法获取有效点击目标");
  }

  // 确保元素可见且可点击
  if (targetLabel) {
    await targetLabel.hover();
    await targetLabel.click();
  }

  const submitButton4 = await iframe.$("input#NextButton");
  await iframe.evaluate((btn) => {
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
  }, submitButton4);

  await submitButton4.click();
};

const generate = async () => {
  try {
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    const page = await browser.newPage();

    await page.goto("https://www.mybkexperience.com", {
      waitUntil: "networkidle2",
    });
    const iframeElement = await page.waitForSelector("iframe", {
      timeout: 6000,
    });
    if (!iframeElement) {
      throw new Error("Iframe not found.");
    }

    let iframe = await iframeElement.contentFrame();
    if (!iframe) {
      throw new Error("Failed to access iframe content.");
    }

    await iframe.waitForSelector("div.ChoiceStructure input", {
      timeout: 6000,
    });

    const input = await iframe.$("div.ChoiceStructure input");
    if (!input) {
      throw new Error("Input field not found inside iframe.");
    }
    await input.type("17885");

    const submitButton = await iframe.$("input#NextButton");

    await submitButton.click();
    console.log("sub1 clicked");

    // second page
    let updatedIframeElement = await page.waitForSelector("iframe", {
      timeout: 6000,
    });
    const updatedIframe = await updatedIframeElement.contentFrame();

    if (!updatedIframe) {
      throw new Error("Failed to access updated iframe content.");
    }

    // Wait for dropdown on the second page

    await updatedIframe.waitForSelector("div.QID6 select", {
      visible: true,
      timeout: 10000,
    });

    // Select an option from the dropdown
    await updatedIframe.select("div.QID6 select", "46");

    const dateInput = await updatedIframe.$("div.QID118 input");

    await dateInput.click();

    const today = new Date();
    const todayDay = today.getDate();

    await updatedIframe.evaluate((day) => {
      const allDates = document.querySelectorAll(
        ".ui-datepicker-calendar td a"
      );
      for (const date of allDates) {
        if (date.textContent === String(day)) {
          date.click();
          break;
        }
      }
    }, todayDay);

    // select time
    await updatedIframe.waitForSelector("td.SBS1 select", {
      visible: true,
      timeout: 10000,
    });

    // Select an option from the dropdown
    await updatedIframe.select("td.SBS1 select", "7");

    // select time
    await updatedIframe.waitForSelector("td.SBS2 select", {
      visible: true,
      timeout: 10000,
    });

    // Select an option from the dropdown
    await updatedIframe.select("td.SBS2 select", "7");

    // select time
    await updatedIframe.waitForSelector("td.SBS3 select", {
      visible: true,
      timeout: 10000,
    });

    // Select an option from the dropdown
    await updatedIframe.select("td.SBS3 select", "2");

    const submitButton2 = await updatedIframe.$("input#NextButton");

    // Scroll into view
    await updatedIframe.evaluate((btn) => {
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
    }, submitButton2);

    // Click using JS if normal click fails
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
    await submitButton2.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Thrid page
    let i = 0;
    while (i < 21) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (i >= 6 && i <= 7) {
        await clickRadioOption(page);
      } else if (i === 8) {
        const submitButton3 = await updatedIframe.$("input#NextButton");

        // Scroll into view
        await updatedIframe.evaluate((btn) => {
          btn.scrollIntoView({ behavior: "smooth", block: "center" });
        }, submitButton3);

        // Click using JS if normal click fails
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        await submitButton3.click();
      } else if (i === 9 || i === 19 || i === 20) {
        await clickSingleOption(page, "no");
      } else {
        await clickSingleOption(page);
      }
      i++;
    }
    const result = await getFinalCode(page);
    console.log("result ", result);

    parentPort.postMessage({
      type: "success",
      code: result,
    });
    browser.close();
    return result;
  } catch (error) {
    console.error("Error:", error.message);
  }
};

generate().then((code) => {
  parentPort.postMessage({
    type: "success",
    code: code,
  });
});
