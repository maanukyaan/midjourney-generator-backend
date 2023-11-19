const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs").promises; // использование промисов для fs
const cors = require("cors");
const translate = require("@iamtraction/google-translate");
const TelegramBot = require("node-telegram-bot-api");

const telegramToken = "6955112045:AAGSnyDy3F1uyL71-p5YHt4fxXARNVXEdWo"; // Замените на свой токен

const bot = new TelegramBot(telegramToken, { polling: true });

async function sendImageToTelegram(filePath, query, russianQuery) {
  try {
    const chatId = "-1002032762376"; // Замените на ID вашего чата в телеграме

    // Отправка изображения
    await bot.sendPhoto(chatId, filePath, {
      caption: `<b>НОВАЯ ЗАЯВКА</b>\n<b>Текст запроса:</b> ${russianQuery}\n<b>Переведённый текст запроса:</b> ${query}\n<b>Сгенерирована в:</b> ${new Date().toLocaleString()}`,
      parse_mode: "HTML",
    });

    console.log("Image sent to Telegram successfully.");
  } catch (error) {
    console.error("Error sending image to Telegram:", error);
  }
}

const app = express();
const port = 3000;

app.use("/img", express.static(path.join(__dirname, "img/")));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

function generateId(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

async function saveBase64ImageToFile(base64String, filePath) {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(filePath, buffer);
    console.log("Image saved successfully:", filePath);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

const wizModelAPIKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTg5MjUyNDMsInVzZXJfaWQiOiI2NTQzOGFiYWVjZDFjN2JkZTQ3YjQyN2YifQ.wsQaC4qUMLULJdXspX_Wgx3xg2Ls_VHrMv8QveBBktY";
const wizModelUrl = "https://api.wizmodel.com/sdapi/v1/txt2img";

app.get("/sd", async (req, res) => {
  const { query } = req.query;
  let englishQuery;
  try {
    const translationResult = await translate(query, { from: "ru", to: "en" });
    englishQuery = translationResult.text;
    console.log("Translated text: ", englishQuery);
    sd(englishQuery, res, query);
  } catch (err) {
    console.error("Error while translating: ", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function sd(query, res, russianQuery) {
  try {
    const payload = {
      prompt: query,
      steps: 100,
    };

    const response = await axios.post(wizModelUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + wizModelAPIKey,
      },
    });

    console.log("Got response. Saving image...");
    const base64String = response.data.images[0];

    const filePath = `img/${generateId(20)}.png`;
    await saveBase64ImageToFile(base64String, filePath);

    await sendImageToTelegram(filePath, query, russianQuery);

    res.status(200).json({ link: filePath, base64: base64String });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
