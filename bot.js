const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Система репутации
const REPUTATION_SYSTEM = {
  levels: {
    0: { name: 'Новичок', badge: '🌱' },
    10: { name: 'Знаток', badge: '📚' },
    30: { name: 'Эксперт', badge: '🎯' },
    50: { name: 'Мудрец', badge: '🧠' },
    100: { name: 'Патриарх', badge: '👑' }
  },
  ratings: {
    'thanks': { points: 1, text: '🙏 Спасибо' },
    'useful': { points: 2, text: '👍 Полезно' },
    'average': { points: 1, text: '👌 Неплохо' },
    'super': { points: 3, text: '🔥 Супер!' }
  }
};

// Категории экспертизы
const EXPERTISE_CATEGORIES = [
  '💼 Карьера и бизнес',
  '❤️ Отношения и семья',
  '💰 Финансы и инвестиции',
  '👶 Воспитание детей',
  '🧠 Психология и саморазвитие',
  '🏠 Недвижимость и ЖКХ',
  '⚖️ Юриспруденция',
  '🏥 Здоровье и медицина',
  '🎓 Образование и наука',
  '🚗 Авто и транспорт',
  '🛠 Ремонт и строительство',
  '🎨 Искусство и творчество',
  '🍳 Кулинария и домоводство',
  '✈️ Путешествия и туризм',
  '🎯 Другое'
];

// Сферы деятельности
const OCCUPATIONS = [
  'IT и технологии',
  'Медицина и здоровье', 
  'Образование и наука',
  'Бизнес и предпринимательство',
  'Финансы и инвестиции',
  'Юриспруденция',
  'Психология и коучинг',
  'Искусство и творчество',
  'Строительство и недвижимость',
  'Торговля и продажи',
  'Государственная служба',
  'Спорт и фитнес',
  'Промышленность и производство',
  'Сельское хозяйство',
  'Транспорт и логистика',
  'Другое'
];

// Напоминания
const REMINDERS = {
  active: [
    "💭 Есть вопрос, который вас беспокоит? Спросите у Старших - получите разные мнения!",
    "🤔 Накопились мысли? Задайте вопрос нашему сообществу - получите мудрые советы",
    "🌱 Новый день - новые вопросы. Чем может помочь вам сообщество сегодня?",
    "🎯 Помните: даже простой вопрос может получить неожиданно мудрый ответ!",
    "🤝 Кто-то сейчас ищет именно ваш совет - поделитесь опытом!"
  ],
  resting: [
    "💫 Сообщество скучает по вашей мудрости! Кто-то ждет именно вашего совета...",
    "🌿 Отдохнули и готовы снова помогать? Ваш опыт бесценен для других!",
    "🤝 Нас стало меньше без вас! Вернитесь к ответам - ваши знания нужны",
    "🎯 Новые интересные вопросы ждут вашего экспертного мнения!",
    "💡 Ваш прошлый совет кому-то очень помог - может, поможете еще раз?"
  ]
};

// Onboarding последовательность
const ONBOARDING = [
  { day: 1, text: "👋 *День 1:* Вы стали частью сообщества 'Спроси у старшего'! Здесь вы можете получить советы по любым жизненным вопросам от реальных людей с опытом." },
  { day: 2, text: "💡 *День 2:* Помните - вы можете не только спрашивать, но и помогать другим своим опытом! Даже один ваш совет может изменить чью-то жизнь." },
  { day: 3, text: "🌱 *День 3:* Сообщество растет благодаря таким как вы! Не стесняйтесь задавать вопросы - здесь вас точно поймут и поддержат." }
];

// Правила сервиса
const RULES = {
  short: `❗ *ПРАВИЛА СЕРВИСА*
• 🔒 Полная анонимность - не указываем ФИО, контакты
• 💙 Уважаем друг друга
• 📚 Советы носят рекомендательный характер
• 🚫 Запрещены оскорбления и спам`,
  
  detailed: `📜 *ПОЛОЖЕНИЕ О КОНФИДЕНЦИАЛЬНОСТИ*

*1. АНОНИМНОСТЬ*
Сервис не собирает и не хранит персональные данные, позволяющие идентифицировать личность. Все общение полностью анонимно.

*2. ЦЕЛИ ОБРАБОТКИ ДАННЫХ*
Возраст, пол и сфера деятельности собираются исключительно для улучшения качества рекомендаций и не являются персональными данными согласно 152-ФЗ.

*3. ОТВЕТСТВЕННОСТЬ*
Пользователи несут самостоятельную ответственность за содержание задаваемых вопросов и даваемых ответов.

*4. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ*
Администрация сервиса не несет ответственности за содержание советов и рекомендаций, полученных через сервис.

*5. СОГЛАСИЕ*
Используя сервис, вы подтверждаете согласие с данными правилами.

*По вопросам:* Обращайтесь через бота`
};

// Создаем таблицы
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    age INTEGER,
    gender TEXT DEFAULT 'не указан',
    occupation TEXT,
    expertises TEXT,
    bio TEXT,
    rating REAL DEFAULT 0,
    answers_count INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 0,
    reputation_points INTEGER DEFAULT 0,
    is_resting INTEGER DEFAULT 0,
    rest_start_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    text TEXT,
    category TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER,
    user_id INTEGER,
    text TEXT,
    rating INTEGER DEFAULT 0,
    reputation_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS user_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    last_sent DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS onboarding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    day INTEGER DEFAULT 1,
    last_sent DATETIME,
    completed INTEGER DEFAULT 0
  )`);
  
  console.log('✅ База данных готова!');
});

// Вспомогательные функции
function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Получение уровня репутации
function getReputationLevel(points) {
  const levels = Object.keys(REPUTATION_SYSTEM.levels).map(Number).sort((a, b) => b - a);
  for (const level of levels) {
    if (points >= level) {
      return REPUTATION_SYSTEM.levels[level];
    }
  }
  return REPUTATION_SYSTEM.levels[0];
}

// Форматирование профиля пользователя для ответов
async function formatUserProfile(userId) {
  const user = await dbGet('SELECT age, gender, occupation, reputation_points FROM users WHERE id = ?', [userId]);
  if (!user) return '';
  
  const level = getReputationLevel(user.reputation_points);
  return `\n\n👤 *Совет от:* ${user.age || '?'} лет, ${user.gender}, ${user.occupation || 'сфера не указана'} ${level.badge} ${level.name}`;
}

const userStates = {};

// Защита от двойных нажатий
const processingCallbacks = new Set();

// Главное меню
function showMainMenu(chatId) {
  bot.sendMessage(chatId, `🎯 *Главное меню "Спроси у старшего"*\n\nВыберите действие:`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📝 Задать вопрос', callback_data: 'ask_question' }],
        [{ text: '💡 Ответить на вопросы', callback_data: 'browse_questions' }],
        [{ text: '👤 Мой профиль', callback_data: 'my_profile' }],
        [{ text: '⚙️ Настройки', callback_data: 'settings' }],
        [{ text: '📜 Правила сервиса', callback_data: 'show_rules' }]
      ]
    }
  });
}

// Приветственное сообщение
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, `👋 Добро пожаловать в *"Спроси у старшего"*!\n\nАнонимное сообщество, где вы можете получить мудрые советы от опытных людей по любым жизненным вопросам.`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✨ Подробнее о сервисе', callback_data: 'learn_more' }],
        [{ text: '🚀 Начать пользоваться', callback_data: 'start_using' }]
      ]
    }
  });
});

// Обработка callback-запросов
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = query.message.message_id;
  
  // Защита от двойных нажатий
  const callbackKey = `${chatId}_${data}_${messageId}`;
  if (processingCallbacks.has(callbackKey)) {
    await bot.answerCallbackQuery(query.id, { text: '⏳ Обрабатываю ваш запрос...' });
    return;
  }
  
  processingCallbacks.add(callbackKey);
  
  try {
    // Уровень 2 - подробности о сервисе
    if (data === 'learn_more') {
      await bot.editMessageText(`💫 *Что такое "Спроси у старшего"?*\n\nЭто безопасное пространство, где:\n• 🤝 *Вы можете анонимно спросить* - о карьере, отношениях, финансах, воспитании детей\n• 💡 *Получить несколько мнений* - ваш вопрос увидят разные опытные люди\n• 🧠 *Делиться мудростью* - помогать другим своим опытом\n\n*Примеры реальных вопросов:*\n"Как сменить профессию в 35 лет?"\n"Как наладить отношения с подростком?"\n"Стоит ли брать ипотеку в текущей ситуации?"\n\n*Как это работает:*\n1. Задаете вопрос → выбираете категорию\n2. Вопрос получают несколько "Старших" из этой сферы\n3. Вы получаете 3-5 разных ответов с мнениями\n4. Можете оценить полезные советы\n\n🔒 *Полная анонимность гарантирована*`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📜 Правила сервиса', callback_data: 'show_rules' }],
            [{ text: '🚀 Начать пользоваться', callback_data: 'start_using' }]
          ]
        }
      });
      return;
    }

    // Правила сервиса
    if (data === 'show_rules') {
      await bot.editMessageText(RULES.detailed, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Начать пользоваться', callback_data: 'start_using' }],
            [{ text: '↩️ Назад', callback_data: 'learn_more' }]
          ]
        }
      });
      return;
    }

    // Начало использования - создание профиля
    if (data === 'start_using') {
      const userExists = await dbGet('SELECT id FROM users WHERE id = ?', [chatId]);
      
      if (!userExists) {
        userStates[chatId] = { step: 'creating_profile', profile: {} };
        await bot.editMessageText(`🎯 *Отлично! Давайте создадим ваш профиль*\n\nЧтобы сообщество работало эффективно, расскажите немного о себе:\n\n*Ваш возраст* - чтобы понимать контекст советов\n*Сфера деятельности* - в чем вы можете помогать другим\n*Категории экспертизы* - какие темы вам близки\n\n⚠️ *Важно:* Мы не храним персональные данные! \nЭта информация нужна только для подбора релевантных вопросов и ответов.`, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Создать профиль', callback_data: 'create_profile' }]
            ]
          }
        });
      } else {
        showMainMenu(chatId);
      }
      return;
    }

    // Создание профиля - начало
    if (data === 'create_profile') {
      userStates[chatId] = { step: 'asking_age', profile: {} };
      await bot.sendMessage(chatId, '📝 *Сколько вам лет?*\n\nУкажите ваш возраст (только цифры):', {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Главное меню
    if (data === 'main_menu') {
      showMainMenu(chatId);
      return;
    }

    // Задать вопрос
    if (data === 'ask_question') {
      userStates[chatId] = { step: 'asking_question' };
      await bot.sendMessage(chatId, '📝 *Напишите ваш вопрос:*\n\nОпишите подробно, что вас беспокоит или в чем нужен совет:', {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Выбор категории для вопроса
    if (data.startsWith('ask_cat_')) {
      const categoryIndex = parseInt(data.split('_')[2]);
      const category = EXPERTISE_CATEGORIES[categoryIndex];
      
      if (userStates[chatId] && userStates[chatId].step === 'asking_question_category') {
        await processQuestion(chatId, userStates[chatId].questionText, category);
        delete userStates[chatId];
        
        await bot.deleteMessage(chatId, messageId);
      }
      return;
    }

    // Просмотр вопросов для ответа
    if (data === 'browse_questions') {
      await showAvailableQuestions(chatId);
      return;
    }

    // Ответ на конкретный вопрос
    if (data.startsWith('answer_')) {
      const questionId = parseInt(data.split('_')[1]);
      userStates[chatId] = { step: 'answering_question', questionId };
      await bot.sendMessage(chatId, '💡 *Напишите ваш ответ:*\n\nПоделитесь своим опытом и мнением:', {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Мой профиль
    if (data === 'my_profile') {
      await showUserProfile(chatId);
      return;
    }

    // Настройки
    if (data === 'settings') {
      await showSettings(chatId);
      return;
    }

    // Редактирование категорий
    if (data === 'edit_categories') {
      await editExpertiseCategories(chatId);
      return;
    }

    // Выбор/отмена категории
    if (data.startsWith('toggle_cat_')) {
      const categoryIndex = parseInt(data.split('_')[2]);
      await toggleExpertiseCategory(chatId, categoryIndex, messageId);
      return;
    }

    // Сохранение категорий
    if (data === 'save_categories') {
      await saveExpertiseCategories(chatId, messageId);
      return;
    }

    // Режим отдыха
    if (data === 'toggle_rest') {
      await toggleRestMode(chatId);
      return;
    }

    // Остановка отдыха
    if (data === 'stop_rest') {
      await dbRun('UPDATE users SET is_resting = 0 WHERE id = ?', [chatId]);
      await bot.sendMessage(chatId, '🚀 Отлично! Вы снова в строю! Теперь будете получать новые вопросы.');
      showMainMenu(chatId);
      return;
    }

    // Оценка ответа
    if (data.startsWith('rate_')) {
      const [_, answerId, rating] = data.split('_');
      await rateAnswer(chatId, parseInt(answerId), rating);
      return;
    }

  } catch (error) {
    console.error('❌ Ошибка в обработчике callback:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
  } finally {
    // Удаляем из множества обработки через 2 секунды
    setTimeout(() => {
      processingCallbacks.delete(callbackKey);
    }, 2000);
  }
});

// Обработка сообщений
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const text = msg.text;

  try {
    // Создание профиля - возраст
    if (userStates[chatId] && userStates[chatId].step === 'asking_age') {
      const age = parseInt(text);
      if (age && age > 0 && age < 120) {
        userStates[chatId].profile.age = age;
        userStates[chatId].step = 'asking_gender';
        
        await bot.sendMessage(chatId, '👤 *Выберите ваш пол:*', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Мужской', callback_data: 'gender_male' }, { text: 'Женский', callback_data: 'gender_female' }],
              [{ text: 'Не указывать', callback_data: 'gender_skip' }]
            ]
          }
        });
      } else {
        await bot.sendMessage(chatId, '❌ Пожалуйста, введите корректный возраст (от 1 до 120):');
      }
      return;
    }

    // Создание профиля - пол (через callback)
    if (msg.text && userStates[chatId] && userStates[chatId].step === 'asking_gender') {
      // Пол обрабатывается через callback, пропускаем
      return;
    }

    // Создание профиля - сфера деятельности
    if (userStates[chatId] && userStates[chatId].step === 'asking_occupation') {
      userStates[chatId].profile.occupation = text;
      userStates[chatId].step = 'asking_expertise';
      
      await showExpertiseSelection(chatId, true);
      return;
    }

    // Вопрос от пользователя
    if (userStates[chatId] && userStates[chatId].step === 'asking_question') {
      userStates[chatId].questionText = text;
      userStates[chatId].step = 'asking_question_category';
      
      await bot.sendMessage(chatId, '📋 *Выберите категорию для вашего вопроса:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            ...EXPERTISE_CATEGORIES.map((cat, index) => [
              { text: cat, callback_data: `ask_cat_${index}` }
            ]),
            [{ text: '↩️ Назад', callback_data: 'main_menu' }]
          ]
        }
      });
      return;
    }

    // Ответ на вопрос
    if (userStates[chatId] && userStates[chatId].step === 'answering_question') {
      await processAnswer(chatId, userStates[chatId].questionId, text);
      delete userStates[chatId];
      return;
    }

    // Если непонятное сообщение
    await bot.sendMessage(chatId, 'Используйте кнопки меню для навигации или /start для начала.');

  } catch (error) {
    console.error('❌ Ошибка обработки сообщения:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
  }
});

// Обработка выбора пола и сферы деятельности
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('gender_')) {
    const gender = data.split('_')[1];
    let genderText = 'не указан';
    
    if (gender === 'male') genderText = 'мужской';
    if (gender === 'female') genderText = 'женский';
    
    if (userStates[chatId] && userStates[chatId].step === 'asking_gender') {
      userStates[chatId].profile.gender = genderText;
      userStates[chatId].step = 'asking_occupation';
      
      await bot.editMessageText('💼 *Выберите вашу сферу деятельности:*', {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            ...OCCUPATIONS.map((occ, index) => [
              { text: occ, callback_data: `occupation_${index}` }
            ]),
            [{ text: '✏️ Ввести свою', callback_data: 'occupation_custom' }]
          ]
        }
      });
    }
    return;
  }

  // Обработка выбора сферы деятельности
  if (data.startsWith('occupation_')) {
    const occupationIndex = parseInt(data.split('_')[1]);
    const occupation = OCCUPATIONS[occupationIndex];
    
    if (userStates[chatId] && userStates[chatId].step === 'asking_occupation') {
      userStates[chatId].profile.occupation = occupation;
      userStates[chatId].step = 'asking_expertise';
      
      await bot.deleteMessage(chatId, query.message.message_id);
      await showExpertiseSelection(chatId, true);
    }
    return;
  }

  // Кастомная сфера деятельности
  if (data === 'occupation_custom') {
    if (userStates[chatId] && userStates[chatId].step === 'asking_occupation') {
      await bot.sendMessage(chatId, '💼 *Напишите вашу сферу деятельности:*');
      // Следующее сообщение пользователя будет обработано как сфера деятельности
    }
    return;
  }
});

// ==================== ФУНКЦИИ ПРОФИЛЯ ====================

// Показ выбора категорий экспертизы
async function showExpertiseSelection(chatId, isFirstTime = false) {
  console.log(`🎯 Показ выбора категорий для пользователя ${chatId}`);
  
  try {
    let currentExpertises = [];
    
    // Получаем текущие категории
    if (userStates[chatId] && userStates[chatId].profile && userStates[chatId].profile.expertises) {
      currentExpertises = userStates[chatId].profile.expertises.split(', ');
    } else {
      const user = await dbGet('SELECT expertises FROM users WHERE id = ?', [chatId]);
      currentExpertises = user && user.expertises ? user.expertises.split(', ') : [];
    }
    
    console.log(`📋 Текущие категории пользователя: ${currentExpertises.join(', ')}`);
    
    const keyboard = EXPERTISE_CATEGORIES.map((cat, index) => [
      { 
        text: currentExpertises.includes(cat) ? `✅ ${cat}` : cat, 
        callback_data: `toggle_cat_${index}`
      }
    ]);
    
    keyboard.push([{ text: '💾 Сохранить категории', callback_data: 'save_categories' }]);
    
    const messageText = isFirstTime ? 
      `🎯 *В каких категориях вы можете давать советы?*\n\n✅ Выбрано: ${currentExpertises.length} из 7 категорий\n\nНажимайте на категории для выбора/отмены (можно несколько):` :
      `🎯 *Редактирование категорий экспертизы:*\n\n✅ Выбрано: ${currentExpertises.length} из 7 категорий\n\nНажимайте на категории для выбора/отмены:`;
    
    await bot.sendMessage(chatId, messageText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    
  } catch (error) {
    console.error('❌ Ошибка при показе выбора категорий:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при загрузке категорий. Попробуйте позже.');
  }
}

// Переключение категории
async function toggleExpertiseCategory(chatId, categoryIndex, messageId) {
  console.log(`🔄 Переключение категории ${categoryIndex} для пользователя ${chatId}`);
  
  try {
    const category = EXPERTISE_CATEGORIES[categoryIndex];
    
    // Получаем текущие категории пользователя
    const user = await dbGet('SELECT expertises FROM users WHERE id = ?', [chatId]);
    let currentExpertises = [];
    
    if (user && user.expertises) {
      currentExpertises = user.expertises.split(', ');
    } else if (userStates[chatId] && userStates[chatId].profile) {
      // Если профиль создается, берем из временного состояния
      currentExpertises = userStates[chatId].profile.expertises ? 
        userStates[chatId].profile.expertises.split(', ') : [];
    }
    
    console.log(`📋 Текущие категории: ${currentExpertises.join(', ')}`);
    
    // Добавляем или удаляем категорию
    if (currentExpertises.includes(category)) {
      // Удаляем категорию
      currentExpertises = currentExpertises.filter(cat => cat !== category);
      console.log(`❌ Удалена категория: ${category}`);
    } else {
      // Добавляем категорию (проверяем лимит)
      if (currentExpertises.length < 7) {
        currentExpertises.push(category);
        console.log(`✅ Добавлена категория: ${category}`);
      } else {
        await bot.answerCallbackQuery({ 
          text: '❌ Можно выбрать не более 7 категорий!', 
          show_alert: true 
        });
        return;
      }
    }
    
    // Сохраняем во временное состояние или в базу
    if (userStates[chatId] && userStates[chatId].profile) {
      userStates[chatId].profile.expertises = currentExpertises.join(', ');
    } else {
      await dbRun('UPDATE users SET expertises = ? WHERE id = ?', [currentExpertises.join(', '), chatId]);
    }
    
    // Обновляем клавиатуру
    const keyboard = EXPERTISE_CATEGORIES.map((cat, index) => [
      { 
        text: currentExpertises.includes(cat) ? `✅ ${cat}` : cat, 
        callback_data: `toggle_cat_${index}`
      }
    ]);
    
    keyboard.push([{ text: '💾 Сохранить категории', callback_data: 'save_categories' }]);
    
    const messageText = `🎯 *Выберите сферы экспертизы:*\n\n✅ Выбрано: ${currentExpertises.length} из 7 категорий\n\nНажимайте на категории для выбора/отмены:`;
    
    await bot.editMessageText(messageText, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    
  } catch (error) {
    console.error('❌ Ошибка при переключении категории:', error);
    await bot.answerCallbackQuery({ 
      text: '❌ Ошибка при выборе категории', 
      show_alert: true 
    });
  }
}

// Сохранение категорий
async function saveExpertiseCategories(chatId, messageId) {
  console.log(`💾 Сохранение категорий для пользователя ${chatId}`);
  
  try {
    let currentExpertises = [];
    
    // Получаем категории из временного состояния или из базы
    if (userStates[chatId] && userStates[chatId].profile && userStates[chatId].profile.expertises) {
      currentExpertises = userStates[chatId].profile.expertises.split(', ');
    } else {
      const user = await dbGet('SELECT expertises FROM users WHERE id = ?', [chatId]);
      currentExpertises = user && user.expertises ? user.expertises.split(', ') : [];
    }
    
    console.log(`📋 Категории для сохранения: ${currentExpertises.join(', ')}`);
    
    if (currentExpertises.length === 0) {
      await bot.answerCallbackQuery({ 
        text: '❌ Выберите хотя бы одну категорию!', 
        show_alert: true 
      });
      return;
    }
    
    if (userStates[chatId] && userStates[chatId].step === 'asking_expertise') {
      // Завершение создания профиля
      userStates[chatId].profile.expertises = currentExpertises.join(', ');
      await completeProfileCreation(chatId);
    } else {
      // Просто сохранение категорий
      await dbRun('UPDATE users SET expertises = ? WHERE id = ?', [currentExpertises.join(', '), chatId]);
      
      await bot.editMessageText(`✅ *Категории экспертизы сохранены!*\n\nВы выбрали ${currentExpertises.length} категорий:\n• ${currentExpertises.join('\n• ')}`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      });
      
      // Даем небольшую паузу перед показом меню
      setTimeout(() => {
        showMainMenu(chatId);
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при сохранении категорий:', error);
    await bot.answerCallbackQuery({ 
      text: '❌ Ошибка при сохранении. Попробуйте позже.', 
      show_alert: true 
    });
  }
}

// Завершение создания профиля
async function completeProfileCreation(chatId) {
  const { profile } = userStates[chatId];
  
  await dbRun(
    `INSERT INTO users (id, username, age, gender, occupation, expertises, reputation_points) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [chatId, userStates[chatId].username, profile.age, profile.gender, profile.occupation, profile.expertises, 0]
  );
  
  delete userStates[chatId];
  
  await bot.sendMessage(chatId, `🎉 *Профиль создан!*\n\nТеперь вы можете:\n• 📝 Задавать вопросы сообществу\n• 💡 Отвечать на вопросы в ваших категориях\n• 🌱 Зарабатывать репутацию\n\nДобро пожаловать в сообщество "Спроси у старшего"!`, {
    parse_mode: 'Markdown'
  });
  
  showMainMenu(chatId);
}

// Показ профиля пользователя
async function showUserProfile(chatId) {
  const user = await dbGet(`
    SELECT age, gender, occupation, expertises, reputation_points, answers_count, questions_count 
    FROM users WHERE id = ?
  `, [chatId]);
  
  if (!user) {
    await bot.sendMessage(chatId, '❌ Профиль не найден. Используйте /start для создания профиля.');
    return;
  }
  
  const level = getReputationLevel(user.reputation_points);
  const expertiseList = user.expertises ? user.expertises.split(', ').join('\n• ') : 'не выбраны';
  
  const profileText = `👤 *Ваш профиль*\n\n` +
    `*Основное:*\n` +
    `• Возраст: ${user.age || 'не указан'}\n` +
    `• Пол: ${user.gender || 'не указан'}\n` +
    `• Сфера: ${user.occupation || 'не указана'}\n\n` +
    `*Статистика:*\n` +
    `• Уровень: ${level.badge} ${level.name}\n` +
    `• Репутация: ${user.reputation_points} очков\n` +
    `• Ответов дано: ${user.answers_count || 0}\n` +
    `• Вопросов задано: ${user.questions_count || 0}\n\n` +
    `*Мои категории:*\n• ${expertiseList}`;
  
  await bot.sendMessage(chatId, profileText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✏️ Редактировать категории', callback_data: 'edit_categories' }],
        [{ text: '↩️ На главную', callback_data: 'main_menu' }]
      ]
    }
  });
}

// Настройки
async function showSettings(chatId) {
  const user = await dbGet('SELECT is_resting FROM users WHERE id = ?', [chatId]);
  
  if (!user) {
    await bot.sendMessage(chatId, '❌ Профиль не найден.');
    return;
  }
  
  const restButtonText = user.is_resting ? '🚀 Вернуться к ответам' : '🌴 Войти в режим отдыха';
  const restButtonData = user.is_resting ? 'stop_rest' : 'toggle_rest';
  
  await bot.sendMessage(chatId, '⚙️ *Настройки*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: restButtonText, callback_data: restButtonData }],
        [{ text: '✏️ Редактировать категории', callback_data: 'edit_categories' }],
        [{ text: '📜 Правила сервиса', callback_data: 'show_rules' }],
        [{ text: '↩️ На главную', callback_data: 'main_menu' }]
      ]
    }
  });
}

// Редактирование категорий
async function editExpertiseCategories(chatId) {
  await showExpertiseSelection(chatId, false);
}

// Режим отдыха
async function toggleRestMode(chatId) {
  await dbRun('UPDATE users SET is_resting = 1, rest_start_date = datetime("now") WHERE id = ?', [chatId]);
  await bot.sendMessage(chatId, '🌴 *Вы вошли в режим отдыха!*\n\nВы не будете получать новые вопросы для ответа. Отдыхайте!\n\nМы напомним вам через 3 дня, если захотите вернуться.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Вернуться сейчас', callback_data: 'stop_rest' }],
        [{ text: '↩️ На главную', callback_data: 'main_menu' }]
      ]
    }
  });
}

// ==================== СИСТЕМА ВОПРОСОВ И ОТВЕТОВ ====================

// Обработка вопроса
async function processQuestion(askerId, questionText, category) {
  try {
    // Сохраняем вопрос
    const result = await dbRun(
      'INSERT INTO questions (user_id, text, category) VALUES (?, ?, ?)',
      [askerId, questionText, category]
    );
    
    // Увеличиваем счетчик вопросов
    await dbRun('UPDATE users SET questions_count = questions_count + 1 WHERE id = ?', [askerId]);
    
    // Находим подходящих пользователей (не в режиме отдыха)
    const experts = await dbAll(
      `SELECT id FROM users 
       WHERE expertises LIKE ? 
       AND is_resting = 0 
       AND id != ?
       ORDER BY reputation_points DESC 
       LIMIT 10`,
      [`%${category}%`, askerId]
    );
    
    console.log(`📨 Вопрос отправлен ${experts.length} пользователям по категории: ${category}`);
    
    // Отправляем вопрос экспертам
    for (const expert of experts) {
      await bot.sendMessage(expert.id, `📨 *Новый вопрос* (${category}):\n\n${questionText}\n\n💬 *Ответьте, просто написав сообщение.*`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💡 Ответить на вопрос', callback_data: `answer_${result.id}` }]
          ]
        }
      });
    }
    
    // Уведомляем спрашивающего
    await bot.sendMessage(askerId, `✅ *Ваш вопрос отправлен ${experts.length} экспертам* по категории "${category}"!\n\nВы получите ответы в течение 24 часов.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '↩️ На главную', callback_data: 'main_menu' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка при обработке вопроса:', error);
    await bot.sendMessage(askerId, '❌ Произошла ошибка при отправке вопроса. Попробуйте снова.');
  }
}

// Показ доступных вопросов - ИСПРАВЛЕННАЯ ВЕРСИЯ
async function showAvailableQuestions(chatId) {
  const user = await dbGet('SELECT expertises FROM users WHERE id = ?', [chatId]);
  
  if (!user || !user.expertises) {
    await bot.sendMessage(chatId, '❌ Сначала настройте категории экспертизы в вашем профиле.');
    return;
  }
  
  const expertises = user.expertises.split(', ');
  const placeholders = expertises.map(() => '?').join(', ');
  
  // ИСПРАВЛЕННЫЙ ЗАПРОС - правильно фильтрует отвеченные вопросы
  const questions = await dbAll(`
    SELECT q.id, q.text, q.category, u.age, u.gender, u.occupation 
    FROM questions q 
    LEFT JOIN users u ON q.user_id = u.id 
    WHERE q.category IN (${placeholders}) 
    AND q.status = 'active' 
    AND q.user_id != ?
    AND q.id NOT IN (
      SELECT question_id FROM answers WHERE user_id = ?
    )
    ORDER BY q.created_at DESC 
    LIMIT 10
  `, [...expertises, chatId, chatId]);
  
  if (questions.length === 0) {
    await bot.sendMessage(chatId, '🤔 Пока нет новых вопросов в ваших категориях. Загляните позже!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '↩️ На главную', callback_data: 'main_menu' }]
        ]
      }
    });
    return;
  }
  
  for (const question of questions) {
    const askerProfile = `👤 *Спрашивает:* ${question.age || '?'} лет, ${question.gender || '?'}, ${question.occupation || 'сфера не указана'}`;
    
    await bot.sendMessage(chatId, `📋 *Вопрос* (${question.category}):\n\n${question.text}\n\n${askerProfile}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💡 Ответить', callback_data: `answer_${question.id}` }]
        ]
      }
    });
  }
}

// Обработка ответа
async function processAnswer(userId, questionId, answerText) {
  try {
    // Сохраняем ответ
    const result = await dbRun(
      'INSERT INTO answers (question_id, user_id, text) VALUES (?, ?, ?)',
      [questionId, userId, answerText]
    );
    
    // Увеличиваем счетчик ответов
    await dbRun('UPDATE users SET answers_count = answers_count + 1 WHERE id = ?', [userId]);
    
    // Получаем информацию о вопросе и спрашивающем
    const question = await dbGet(`
      SELECT q.user_id, q.text, u.age, u.gender, u.occupation 
      FROM questions q 
      LEFT JOIN users u ON q.user_id = u.id 
      WHERE q.id = ?
    `, [questionId]);
    
    if (question) {
      // Получаем профиль отвечающего для форматирования
      const answererProfile = await formatUserProfile(userId);
      
      // Отправляем ответ спрашивающему
      await bot.sendMessage(question.user_id, `💫 *Получен ответ на ваш вопрос:*\n\n${answerText}${answererProfile}\n\n*Ваш вопрос:* "${question.text}"`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🙏 Спасибо', callback_data: `rate_${result.id}_thanks` },
              { text: '👍 Полезно', callback_data: `rate_${result.id}_useful` }
            ],
            [
              { text: '👌 Неплохо', callback_data: `rate_${result.id}_average` },
              { text: '🔥 Супер!', callback_data: `rate_${result.id}_super` }
            ]
          ]
        }
      });
    }
    
    await bot.sendMessage(userId, '✅ *Ваш ответ отправлен!* Спасибо за помощь сообществу! 🎉', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Ответить еще на вопросы', callback_data: 'browse_questions' }],
          [{ text: '↩️ На главную', callback_data: 'main_menu' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка при обработке ответа:', error);
    await bot.sendMessage(userId, '❌ Произошла ошибка при отправке ответа.');
  }
}

// Оценка ответа
async function rateAnswer(raterId, answerId, ratingType) {
  try {
    const ratingConfig = REPUTATION_SYSTEM.ratings[ratingType];
    if (!ratingConfig) {
      await bot.answerCallbackQuery({ text: '❌ Неизвестный тип оценки', show_alert: true });
      return;
    }
    
    // Получаем информацию об ответе
    const answer = await dbGet(`
      SELECT a.user_id, a.text, a.rating, q.text as question_text 
      FROM answers a 
      LEFT JOIN questions q ON a.question_id = q.id 
      WHERE a.id = ?
    `, [answerId]);
    
    if (!answer) {
      await bot.answerCallbackQuery({ text: '❌ Ответ не найден', show_alert: true });
      return;
    }
    
    // Обновляем репутацию отвечающего
    await dbRun(
      'UPDATE users SET reputation_points = reputation_points + ? WHERE id = ?',
      [ratingConfig.points, answer.user_id]
    );
    
    // Обновляем рейтинг ответа
    await dbRun(
      'UPDATE answers SET rating = rating + 1, reputation_earned = ? WHERE id = ?',
      [ratingConfig.points, answerId]
    );
    
    // Уведомляем отвечающего об оценке
    const raterProfile = await formatUserProfile(raterId);
    await bot.sendMessage(answer.user_id, `🎉 *Ваш ответ получил оценку: ${ratingConfig.text}* (+${ratingConfig.points} репутации)\n\n*Ваш ответ:* ${answer.text}\n\n*Оценен за вопрос:* "${answer.question_text}"${raterProfile}`, {
      parse_mode: 'Markdown'
    });
    
    await bot.answerCallbackQuery({ text: `✅ Вы оценили ответ как: ${ratingConfig.text}`, show_alert: true });
    
  } catch (error) {
    console.error('❌ Ошибка при оценке ответа:', error);
    await bot.answerCallbackQuery({ text: '❌ Ошибка при оценке', show_alert: true });
  }
}

// Система напоминаний
setInterval(async () => {
  try {
    const activeUsers = await dbAll(`
      SELECT u.id FROM users u 
      LEFT JOIN user_reminders ur ON u.id = ur.user_id AND ur.type = 'active' 
      WHERE u.is_resting = 0 
      AND (ur.last_sent IS NULL OR datetime(ur.last_sent) < datetime('now', '-3 days'))
      LIMIT 10
    `);
    
    for (const user of activeUsers) {
      const reminder = REMINDERS.active[Math.floor(Math.random() * REMINDERS.active.length)];
      await bot.sendMessage(user.id, reminder);
      await dbRun('INSERT OR REPLACE INTO user_reminders (user_id, type, last_sent) VALUES (?, ?, datetime("now"))', [user.id, 'active']);
    }
  } catch (error) {
    console.error('❌ Ошибка отправки напоминаний:', error);
  }
}, 60000); // Каждую минуту (для теста)

console.log('🤖 Бот "Спроси у старшего" запущен со всеми функциями!');
