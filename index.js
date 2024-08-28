const telegramAuthToken = `7150660949:AAGTNGDqQQcv0aKLXY8y_uoDRbjtsg-8nKA`;
const webhookEndpoint = "/endpoint";
const BIG_DADDY_API_URL =
  "https://api.bigdaddygame.cc/api/webapi/GetNoaverageEmerdList";
const MAX_ATTEMPTS = 5;
const BACKOFF_TIME = 1000; // milliseconds
const botusername = "@VenomPredictorbot";
const botname = "Venom Predictor";

addEventListener("fetch", (event) => {
  event.respondWith(handleIncomingRequest(event));
});

async function handleIncomingRequest(event) {
  let url = new URL(event.request.url);
  let path = url.pathname;
  let method = event.request.method;
  let workerUrl = `${url.protocol}//${url.host}`;

  if (method === "POST" && path === webhookEndpoint) {
    const update = await event.request.json();
    event.waitUntil(processUpdate(update));
    return new Response("Ok");
  } else if (method === "GET" && path === "/configure-webhook") {
    const url = `https://api.telegram.org/bot${telegramAuthToken}/setWebhook?url=${workerUrl}${webhookEndpoint}`;

    const response = await fetch(url);

    if (response.ok) {
      return new Response("Webhook set successfully", { status: 200 });
    } else {
      return new Response("Failed to set webhook", { status: response.status });
    }
  } else {
    return new Response("Not found", { status: 404 });
  }
}

async function fetchBigDaddyTrendsData() {
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    try {
      const currentGMT = new Date();
      const timestamp = Math.floor(currentGMT.getTime() / 1000);
      const headers = {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: "Bearer YOUR_ACTUAL_TOKEN_HERE",
        Origin: "https://bigdaddygame.in",
        Referer: "https://bigdaddygame.in/",
      };

      const jsonData = {
        pageSize: 10,
        pageNo: 1,
        typeId: 1,
        language: 0,
        random: "24769d6e9deb46588093ec8453b22e19",
        signature: "AF5ED9351D6700E68941590EE04AD960",
        timestamp: timestamp,
      };

      const response = await fetch(BIG_DADDY_API_URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(jsonData),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.list;
      } else {
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, BACKOFF_TIME * attempt),
        );
      }
    } catch (error) {
      attempt++;
      await new Promise((resolve) =>
        setTimeout(resolve, BACKOFF_TIME * attempt),
      );
    }
  }

  throw new Error(
    "Failed to fetch Big Daddy trends data after maximum attempts.",
  );
}

function formatTrends(trends) {
  return trends
    .map((trend) => {
      let colourEmoji;
      switch (trend.colour.toLowerCase()) {
        case "red":
          colourEmoji = "🔴";
          break;
        case "green":
          colourEmoji = "🟢";
          break;
        case "green,violet":
          colourEmoji = "🟢🟣";
          break;
        case "red,violet":
          colourEmoji = "🔴🟣";
          break;
        default:
          colourEmoji = trend.colour; // Fallback in case of unknown colours
      }

      return `*Period:* *${trend.issueNumber}*\n🚀 *Signal:* *${trend.number}* *-* *${trend.number > 4 ? "Big" : "Small"}* *-* *${colourEmoji}*\n`;
    })
    .join("\n");
}

async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API responded with status ${response.status}`);
  }
}

async function processUpdate(update) {
  if ("message" in update) {
    const chatId = update.message.chat.id;
    const userText = update.message.text;

    if (userText === "/start") {
      const start1keyboard = {
        inline_keyboard: [
          [
            { text: "🪪 My Account", callback_data: "my_account" },
            { text: "🔗 Network", callback_data: "network" },
          ],
          [
            { text: "🔑 Buy Key", callback_data: "buy_key" },
            { text: "🆘 Support", callback_data: "support" },
          ],
          [
            { text: "📚 Guide", callback_data: "guide" },
            { text: "📊 Trends", callback_data: "trends" },
          ],
          [{ text: "🚀 Start Earning 🚀", callback_data: "start_earning" }],
        ],
      };

      const firstName = update.message.from.first_name || "User";
      const lastName = update.message.from.last_name || "";

      const startText = `🌟 *Welcome to ${botname}!* 🌟\n\nHello, *${firstName}* *${lastName}*! 👋 We're thrilled to have you join us.\n\n*What Can This Bot Do?*\n*-* 🔮 *Prediction*: Enjoy seamless and secure predictions anytime, anywhere.\n*-* 💼 *Exclusive Access*: Get access to top prediction insights and improve your chances of winning big.\n*-* ✅ *Verified & Trusted*: Your go-to platform for reliability and fairness, verified by Telegram.\n\n🚀 *Ready to Play?* Dive into the Predictor game and experience the thrill of accurate predictions and instant wins!\n\n*Let’s get started!*`;

      const sendstartMessageUrl = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;

      const params = new URLSearchParams({
        chat_id: chatId,
        text: startText,
        parse_mode: "Markdown",
        reply_markup: JSON.stringify(start1keyboard),
      });

      await fetch(`${sendstartMessageUrl}?${params.toString()}`);
    }
  } else if ("callback_query" in update) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const callbackData = callbackQuery.data;

    if (callbackData === "start_earning") {
      const isVipUser = await checkVipUser(chatId); // Function to check if user is in vip_user list

      let newKeyboard;
      let newText;

      if (isVipUser) {
        newText = "prediction";
        newKeyboard = {
          inline_keyboard: [
            [{ text: "🚀 Prediction", callback_data: "prediction" }],
            [{ text: "🏠 Menu", callback_data: "main_menu" }],
          ],
        };
      } else {
        newText = "Locked 🔒";
        newKeyboard = {
          inline_keyboard: [
            [
              { text: "Unlock 🔓", callback_data: "buy_key" },
              { text: "🎥 Tutorial", callback_data: "tutorial" },
            ],
            [
              { text: "🔮 Demo", callback_data: "demo" },
              { text: "🏠 Menu", callback_data: "main_menu" },
            ],
          ],
        };
      }

      // Delete the previous inline keyboard message
      await deleteMessage(chatId, messageId);

      // Send the new inline keyboard message
      const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(
        newText,
      )}&reply_markup=${encodeURIComponent(JSON.stringify(newKeyboard))}`;

      await fetch(url);
    } else if (callbackData === "trends") {
      try {
        const trends = await fetchBigDaddyTrendsData();
        const formattedTrends = formatTrends(trends);

        newText = `🔴 *Live Wingo 1 Min Trends:*\n\n${formattedTrends}`;
        newKeyboard = {
          inline_keyboard: [
            [{ text: "🔄 Refresh", callback_data: "refresh_trends" }],
            [{ text: "🏠 Menu", callback_data: "main_menu" }],
          ],
        };
      } catch (error) {
        newText = `Error fetching trends: ${error.message}`;
        newKeyboard = {
          inline_keyboard: [
            [{ text: "🔄 Retry", callback_data: "trends" }],
            [{ text: "🏠 Menu", callback_data: "main_menu" }],
          ],
        };
      }
    } else if (callbackData === "demo") {
      // Delete the previous inline keyboard message
      await deleteMessage(chatId, messageId);

      // Define new inline keyboard for the photo message
      const demoKeyboard = {
        inline_keyboard: [
          [{ text: "🔄 Refresh", callback_data: "demo" }],
          [
            { text: "📊 Trends", callback_data: "trends2" },
            { text: "🔓 Unlock", callback_data: "buy_key2" },
          ],
          [{ text: "🏠 Menu", callback_data: "main_menu2" }],
        ],
      };

      const now = new Date();
      const utcOffset = 330; // 5 hours 30 minutes in minutes
      const localTime = new Date(now.getTime() + utcOffset * 60 * 1000);

      const year = localTime.getFullYear();
      const month = String(localTime.getMonth() + 1).padStart(2, "0"); // Months are 0-based
      const day = String(localTime.getDate()).padStart(2, "0");
      const currentMinute =
        localTime.getHours() * 60 + localTime.getMinutes() + 1; // Adding 1 minute
      const minuteString = String(currentMinute).padStart(4, "0");

      // Static part of the game ID
      const staticPart = "01";
      const gameID = `${year}${month}${day}${staticPart}${minuteString}`;
      // Send a photo with new inline buttons
      const photoUrl = "https://i.postimg.cc/pTP5JwsG/IMG-20240826-122109.png"; // Replace with your photo URL
      const unlockText = "_You need to unlock this feature. /unlock_";
      const photoCaption = `📊 *Game Analysis*\n*━━━━━━━━━━━━━━━━━━*\n🎲 *Period:* *${gameID}*\n🔮 *Prediction:* ${unlockText}\n🎯 *Result:* ${unlockText}\n*━━━━━━━━━━━━━━━━━━*\n❗ *Remember - Only for Win Go 1Min Game Mode*\n\n📢 *Stay updated with the latest predictions and insights by following ${botusername}*\n\n©️ *@King_firoz1*`; // Markdown for bold text
      const sendPhotoUrl = `https://api.telegram.org/bot${telegramAuthToken}/sendPhoto?chat_id=${chatId}&photo=${encodeURIComponent(
        photoUrl,
      )}&caption=${encodeURIComponent(photoCaption)}&parse_mode=Markdown&reply_markup=${encodeURIComponent(
        JSON.stringify(demoKeyboard),
      )}`;

      await fetch(sendPhotoUrl);
    } else if (callbackData === "trends2") {
      // Delete the previous inline keyboard message
      await deleteMessage(chatId, messageId);

      // Define new inline keyboard for "Trends" response
      const trendsKeyboard = {
        inline_keyboard: [
          [{ text: "🔄 Refresh", callback_data: "refresh_trends" }],
          [{ text: "🏠 Menu", callback_data: "main_menu" }],
        ],
      };

      // Fetch and format trends data
      const trends2 = await fetchBigDaddyTrendsData();
      const formattedTrends2 = formatTrends(trends2);

      // Add HTML bold tags to the text
      const trendsText = `*🔴 Live Wingo 1 Min Trends:*\n\n${formattedTrends2}`;

      // Send a message with the new inline keyboard and HTML formatting
      const sendTrendsMessageUrl = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;

      const params = new URLSearchParams({
        chat_id: chatId,
        text: trendsText,
        parse_mode: "Markdown",
        reply_markup: JSON.stringify(trendsKeyboard),
      });

      await fetch(`${sendTrendsMessageUrl}?${params.toString()}`);
    } else if (callbackData === "main_menu2") {
      // Delete the previous inline keyboard message
      await deleteMessage(chatId, messageId);

      // Define new inline keyboard for "Menu 2" response
      const menusecKeyboard = {
        inline_keyboard: [
          [
            { text: "🪪 My Account", callback_data: "my_account" },
            { text: "🔗 Network", callback_data: "network" },
          ],
          [
            { text: "🔑 Buy Key", callback_data: "buy_key" },
            { text: "🆘 Support", callback_data: "support" },
          ],
          [
            { text: "📚 Guide", callback_data: "guide" },
            { text: "📊 Trends", callback_data: "trends" },
          ],
          [{ text: "🚀 Start Earning 🚀", callback_data: "start_earning" }],
        ],
      };

      // Send a message with the new inline keyboard
      const menusecText = `🌟 *Welcome to !* 🌟\n\nHello,! 👋 We're thrilled to have you join us.\n\n*What Can This Bot Do?*\n*-* 🔮 *Prediction*: Enjoy seamless and secure predictions anytime, anywhere.\n*-* 💼 *Exclusive Access*: Get access to top prediction insights and improve your chances of winning big.\n*-* ✅ *Verified & Trusted*: Your go-to platform for reliability and fairness, verified by Telegram.\n\n🚀 *Ready to Play?* Dive into the Predictor game and experience the thrill of accurate predictions and instant wins!\n\n*Let’s get started!*`;
      const sendMenusecMessageUrl = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;

      const params = new URLSearchParams({
        chat_id: chatId,
        text: menusecText,
        parse_mode: "Markdown",
        reply_markup: JSON.stringify(menusecKeyboard),
      });

      await fetch(`${sendMenusecMessageUrl}?${params.toString()}`);
    } else if (callbackData === "buy_key2") {
      // Delete the previous inline keyboard message
      await deleteMessage(chatId, messageId);

      // Define new inline keyboard for "Trends" response
      const keymenuKeyboard = {
        inline_keyboard: [
          [{ text: "✨ Elite Plan", callback_data: "elite_plan" }],
          [{ text: "⚡ Pro Plan", callback_data: "pro_plan" }],
          [{ text: "👑 Vip Plan", callback_data: "vip_plan" }],
          [
            { text: "🎥 Tutorial", callback_data: "tutorial" },
            { text: "🏠 Menu", callback_data: "main_menu" },
          ],
        ],
      };

      // Send a message with the new inline keyboard
      const keymenuText = `🔮 *Unlock Ultimate Success with Our Exclusive VIP Plans!* 🔮\nTransform your game and watch your winnings skyrocket with plans tailored to match your ambition. Choose the plan that fits your goals and start winning big today!\n*━━━━━━━━━━━━━*━\n*1.* ✨ *Elite Plan*\n*Price:* ₹1399\n*Features:*\n• *8 Daily Sureshot Predictions:* Stay ahead with accurate tips\n*• Precision Forecasts:* Big/Small, Color, and Number insights\n*• 24/7 Access:* Request predictions anytime\n*Validity:* 6 days\n*━━━━━━━━━━━━━━*\n*2.* ⚡ *Pro Plan*\n*Price:* ₹2,199\n*Features:*\n*• 25 Daily Sureshot Predictions:* Maximize your success every day\n*• Precision Forecasts:* Big/Small, Color, and Number insights\n*• 24/7 Access:* Request predictions anytime\n*Validity:* 18 days\n*━━━━━━━━━━━━━━*\n*3.* 👑 *Vip Plan (Ultimate)*\n*Price:* ₹2,999\n*Features:*\n*• 70 Daily Sureshot Predictions:* Take control with ultimate accuracy\n*• Precision Forecasts:* Big/Small, Color, and Number insights\n*• 24/7 Access:* Request predictions anytime\n*Validity:* 41 days\n*━━━━━━━━━━━━━━*\n\n✨ *Why Choose Us?* ✨\nAll our plans come with a *100% accuracy guarantee* to ensure that you never face a loss. With us, you're always on the winning side!\n\n*Select Your Plan Below and Start Winning Today!*`;
      const sendkeyMenuMessageUrl = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;

      const params = new URLSearchParams({
        chat_id: chatId,
        text: keymenuText,
        parse_mode: "Markdown",
        reply_markup: JSON.stringify(keymenuKeyboard),
      });

      await fetch(`${sendkeyMenuMessageUrl}?${params.toString()}`);
    } else if (callbackData === "network") {
      newText = "Network";
      newKeyboard = {
        inline_keyboard: [
          [
            { text: "Other bots 🤖", url: "https://t.me/VenomPredictor/9" },
            { text: "🏠 Menu", callback_data: "main_menu" },
          ],
        ],
      };
    } else if (callbackData === "my_account") {
      newText = "my account";
      newKeyboard = {
        inline_keyboard: [[{ text: "Li�� Menu", callback_data: "main_menu" }]],
      };
    } else if (callbackData === "buy_key") {
      newText =
        "🔮 *Unlock Ultimate Success with Our Exclusive VIP Plans!* 🔮\nTransform your game and watch your winnings skyrocket with plans tailored to match your ambition. Choose the plan that fits your goals and start winning big today!\n*━━━━━━━━━━━━━*━\n*1.* ✨ *Elite Plan*\n*Price:* ₹1399\n*Features:*\n• *8 Daily Sureshot Predictions:* Stay ahead with accurate tips\n*• Precision Forecasts:* Big/Small, Color, and Number insights\n*• 24/7 Access:* Request predictions anytime\n*Validity:* 6 days\n*━━━━━━━━━━━━━━*\n*2.* ⚡ *Pro Plan*\n*Price:* ₹2,199\n*Features:*\n*• 25 Daily Sureshot Predictions:* Maximize your success every day\n*• Precision Forecasts:* Big/Small, Color, and Number insights\n*• 24/7 Access:* Request predictions anytime\n*Validity:* 18 days\n*━━━━━━━━━━━━━━*\n*3.* 👑 *Vip Plan (Ultimate)*\n*Price:* ₹2,999\n*Features:*\n*• 70 Daily Sureshot Predictions:* Take control with ultimate accuracy\n*• Precision Forecasts:* Big/Small, Color, and Number insights\n*• 24/7 Access:* Request predictions anytime\n*Validity:* 41 days\n*━━━━━━━━━━━━━━*\n\n✨ *Why Choose Us?* ✨\nAll our plans come with a *100% accuracy guarantee* to ensure that you never face a loss. With us, you're always on the winning side!\n\n*Select Your Plan Below and Start Winning Today!*";
      newKeyboard = {
        inline_keyboard: [
          [{ text: "✨ Elite Plan", callback_data: "elite_plan" }],
          [{ text: "⚡ Pro Plan", callback_data: "pro_plan" }],
          [{ text: "👑 Vip Plan", callback_data: "vip_plan" }],
          [
            { text: "🎥 Tutorial", callback_data: "tutorial" },
            { text: "🏠 Menu", callback_data: "main_menu" },
          ],
        ],
      };
    } else if (callbackData === "elite_plan") {
      newText = "Elite Plan";
      newKeyboard = {
        inline_keyboard: [
          [{ text: "💳 Pay Now", url: "https://t.me/VenomHelpline/5" }],
          [
            { text: "View Qr Code", url: "https://t.me/VenomHelpline/5" },
            { text: "Verify Payment", callback_data: "verify_payment" },
          ],
          [
            { text: "🎥 Tutorial", callback_data: "tutorial" },
            { text: "Back", callback_data: "buy_key" },
          ],
        ],
      };
    } else if (callbackData === "pro_plan") {
      newText = " Pro Plans";
      newKeyboard = {
        inline_keyboard: [
          [{ text: "💳 Pay Now", url: "https://t.me/VenomHelpline/5" }],
          [
            { text: "View Qr Code", url: "https://t.me/VenomHelpline/5" },
            { text: "Verify Payment", callback_data: "verify_payment" },
          ],
          [
            { text: "🎥 Tutorial", callback_data: "tutorial" },
            { text: "Back", callback_data: "buy_key" },
          ],
        ],
      };
    } else if (callbackData === "vip_plan") {
      newText = "Vip Plans";
      newKeyboard = {
        inline_keyboard: [
          [{ text: "💳 Pay Now", url: "https://t.me/VenomHelpline/5" }],
          [
            { text: "View Qr Code", url: "https://t.me/VenomHelpline/5" },
            { text: "Verify Payment", callback_data: "verify_payment" },
          ],
          [
            { text: "🎥 Tutorial", callback_data: "tutorial" },
            { text: "Back", callback_data: "buy_key" },
          ],
        ],
      };
    } else if (callbackData === "support") {
      newText = "Support";
      newKeyboard = {
        inline_keyboard: [
          [
            { text: "🆘 Get Help", url: "https://t.me/client18" },
            { text: "🏠 Menu", callback_data: "main_menu" },
          ],
        ],
      };
    } else if (callbackData === "guide") {
      newText =
        "*🎉 Welcome to the Color Prediction Game Predictor Bot! 🎮*\n\nReady to enhance your game predictions? Explore all the features this bot has to offer with these commands:\n\n*🔓 /unlock* *-* *Unlock the full potential of the bot!*\nGet access to accurate predictions by purchasing a paid key. Just follow the steps to complete your purchase and unlock all the powerful features!\n\n*🔮 /predict* *-* *Request a prediction with your paid key!*\nHave a valid key? Great! Use this command to enter your key and receive top-notch predictions tailored just for you.\n\n*📈 /prediction* *-* *Retrieve the latest predictions!*\n\nWant to know what's coming next? Use this command to get the freshest insights and forecasts based on the latest game trends.\n\n*🎬 /demo* *-* *See our predictions in action!*\nNew here? No worries! Get a taste of what we offer by using this command for a live demo or a sample prediction. Perfect for first-time users!\n\n*📊 /trends* *-* *Check live trends and data!*\nStay ahead of the game by viewing the latest trends or looking back at previous ones. This command keeps you updated with all the game world's happenings.\n\n*🚀 /start* *-* *Get started with the bot!*\nIf you're new, this is the perfect place to begin. Learn about all the features and find out how to get the most out of the bot.\n\n*ℹ️ Need help?* Just type **/help** for assistance with any feature!\n\nHappy Predicting, and may the odds be ever in your favor! 🎯";
      newKeyboard = {
        inline_keyboard: [
          [
            { text: "🆘 Support", callback_data: "support" },
            { text: "🏠 Menu", callback_data: "main_menu" },
          ],
        ],
      };
    } else if (callbackData === "main_menu") {
      newText = "Menu";
      newKeyboard = {
        inline_keyboard: [
          [
            { text: "🪪 My Account", callback_data: "my_account" },
            { text: "🔗 Network", callback_data: "network" },
          ],
          [
            { text: "🔑 Buy Key", callback_data: "buy_key" },
            { text: "🆘 Support", callback_data: "support" },
          ],
          [
            { text: "📚 Guide", callback_data: "guide" },
            { text: "📊 Trends", callback_data: "trends" },
          ],
          [{ text: "🚀 Start Earning 🚀", callback_data: "start_earning" }],
        ],
      };
    } else if (callbackData === "refresh_trends") {
      try {
        const trends = await fetchBigDaddyTrendsData();
        const formattedTrends = formatTrends(trends);
        newText = `🔴 *Live Wingo 1 Min Trends:*\n\n${formattedTrends}`;
        newKeyboard = {
          inline_keyboard: [
            [{ text: "🔄 Refresh", callback_data: "refresh_trends" }],
            [{ text: "🏠 Menu", callback_data: "main_menu" }],
          ],
        };
      } catch (error) {
        newText = `Error fetching trends: ${error.message}`;
        newKeyboard = {
          inline_keyboard: [
            [{ text: "🔄 Retry", callback_data: "refresh_trends" }],
            [{ text: "Back", callback_data: "main_menu" }],
          ],
        };
      }
    }

    if (newKeyboard) {
      const url = `https://api.telegram.org/bot${telegramAuthToken}/editMessageText?chat_id=${chatId}&message_id=${messageId}&text=${encodeURIComponent(
        newText,
      )}&parse_mode=Markdown&reply_markup=${encodeURIComponent(JSON.stringify(newKeyboard))}`;

      await fetch(url);
    }
  }
}

async function checkVipUser(chatId) {
  // Fetch vip_user list from your data source (e.g., database, file, etc.)
  const vipUserList = await getVipUserList();
  return vipUserList.includes(chatId);
}

async function deleteMessage(chatId, messageId) {
  const url = `https://api.telegram.org/bot${telegramAuthToken}/deleteMessage?chat_id=${chatId}&message_id=${messageId}`;
  await fetch(url);
}

// Example of fetching vip_user list (implement as per your data source)
async function getVipUserList() {
  // Example: Return a mock list for demonstration
  return [6550660665, 987654321]; // Replace with actual logic to fetch vip_user list
}
