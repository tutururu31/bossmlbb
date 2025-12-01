// Основной объект игры
const Game = {
    // Состояние игры
    state: {
        gold: 100,
        totalGoldEarned: 100,
        bossHP: 100000,
        maxBossHP: 100000,
        clickDamage: 1,
        critChance: 5, // в процентах
        critMultiplier: 2.0,
        totalDamageDealt: 0,
        monstersKilled: 0,
        playTime: 0, // в секундах
        autoclickerActive: false,
        autoclickerLastActivation: 0,
        periodicDamage: 0,
        periodicDamageLevel: 0,
        
        // Уровни улучшений
        upgrades: {
            clickDamage: { level: 0, cost: 10 },
            autoclicker: { level: 0, cost: 500, purchased: false },
            criticalChance: { level: 0, cost: 50 },
            criticalDamage: { level: 0, cost: 100 },
            periodicDamage: { level: 0, cost: 200 }
        },
        
        // Текущий монстр
        currentMonster: null,
        
        // Определения типов монстров (5 видов)
        monsterTypes: {
            goblin: { 
                name: 'Гоблин', 
                icon: 'fa-ghost',
                hp: 10, 
                maxHP: 10, 
                reward: 5, 
                damage: 1,
                color: '#aa00ff'
            },
            orc: { 
                name: 'Орк', 
                icon: 'fa-user-injured',
                hp: 30, 
                maxHP: 30, 
                reward: 15, 
                damage: 2,
                color: '#ff3366'
            },
            troll: { 
                name: 'Тролль', 
                icon: 'fa-mountain',
                hp: 100, 
                maxHP: 100, 
                reward: 50, 
                damage: 5,
                color: '#00cc66'
            },
            dragonling: { 
                name: 'Дракончик', 
                icon: 'fa-dragon',
                hp: 200, 
                maxHP: 200, 
                reward: 100, 
                damage: 10,
                color: '#ff3300'
            },
            demon: { 
                name: 'Демон', 
                icon: 'fa-fire',
                hp: 500, 
                maxHP: 500, 
                reward: 250, 
                damage: 20,
                color: '#ff9900'
            }
        }
    },
    
    // Инициализация
    init() {
        this.load();
        this.setupEventListeners();
        this.spawnRandomMonster();
        this.updateUI();
        this.startGameLoop();
        this.showNotification('Игра загружена! Удачи в битве с боссом!', 'info');
    },
    
    // Настройка обработчиков событий
    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Клик по боссу
        document.getElementById('boss-click-area').addEventListener('click', (e) => {
            this.attackBoss(e.clientX, e.clientY);
        });
        
        // Покупка улучшений
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const upgradeId = e.target.dataset.id;
                this.buyUpgrade(upgradeId);
            });
        });
        
        // Атака текущего монстра
        document.getElementById('attack-current-monster-btn').addEventListener('click', (e) => {
            const rect = document.getElementById('current-monster').getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            this.attackMonster(x, y);
        });
        
        // Кнопки сохранения/сброса
        document.getElementById('save-btn').addEventListener('click', () => {
            this.save();
            this.showNotification('Игра сохранена!', 'success');
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            if (confirm('Вы уверены? Весь прогресс будет потерян!')) {
                this.resetGame();
            }
        });
    },
    
    // Переключение вкладок
    switchTab(tabName) {
        // Деактивируем все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Активируем выбранную вкладку
        document.getElementById(`${tabName}-tab`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    },
    
    // Атака босса с попапами урона
    attackBoss(clickX, clickY) {
        // Расчет урона с учетом шанса крита
        let damage = this.state.clickDamage;
        let isCrit = Math.random() * 100 < this.state.critChance;
        
        if (isCrit) {
            damage = Math.floor(damage * this.state.critMultiplier);
            this.createDamagePopup(clickX, clickY, damage, 'crit');
        } else {
            this.createDamagePopup(clickX, clickY, damage, 'normal');
        }
        
        // Применение урона
        this.state.bossHP = Math.max(0, this.state.bossHP - damage);
        this.state.totalDamageDealt += damage;
        
        // Проверка победы
        if (this.state.bossHP <= 0) {
            this.bossDefeated();
        }
        
        this.updateUI();
    },
    
    // Покупка улучшения
    buyUpgrade(upgradeId) {
        const upgrade = this.state.upgrades[upgradeId];
        
        if (!upgrade) return;
        
        // Проверка наличия золота
        if (this.state.gold < upgrade.cost) {
            this.showNotification('Недостаточно золота!', 'error');
            return;
        }
        
        // Покупка
        this.state.gold -= upgrade.cost;
        
        // Применение улучшения
        switch (upgradeId) {
            case 'clickDamage':
                upgrade.level++;
                this.state.clickDamage += 1;
                upgrade.cost = Math.floor(upgrade.cost * 1.5);
                this.showNotification(`Улучшен удар! Теперь наносите ${this.state.clickDamage} урона за клик.`, 'success');
                break;
                
            case 'autoclicker':
                if (!upgrade.purchased) {
                    upgrade.purchased = true;
                    this.state.autoclickerActive = true;
                    this.state.autoclickerLastActivation = Date.now();
                    upgrade.cost = 1000; // Стоимость после покупки
                    this.showNotification('Автокликер активирован! Он будет бить босса каждые 10 минут.', 'success');
                } else {
                    upgrade.level++;
                    // Улучшение автокликера (например, уменьшение времени)
                    this.showNotification(`Автокликер улучшен до уровня ${upgrade.level}!`, 'success');
                }
                break;
                
            case 'criticalChance':
                upgrade.level++;
                this.state.critChance += 1;
                upgrade.cost = Math.floor(upgrade.cost * 1.3);
                this.showNotification(`Шанс крита увеличен до ${this.state.critChance}%!`, 'success');
                break;
                
            case 'criticalDamage':
                upgrade.level++;
                this.state.critMultiplier += 0.2;
                upgrade.cost = Math.floor(upgrade.cost * 1.4);
                this.showNotification(`Множитель крита увеличен до x${this.state.critMultiplier.toFixed(1)}!`, 'success');
                break;
                
            case 'periodicDamage':
                upgrade.level++;
                this.state.periodicDamageLevel = upgrade.level;
                this.state.periodicDamage = upgrade.level * 5;
                upgrade.cost = Math.floor(upgrade.cost * 1.6);
                this.showNotification(`Огненная аура улучшена! Наносит ${this.state.periodicDamage} урона каждые 30 секунд.`, 'success');
                break;
        }
        
        this.updateUI();
        this.save();
    },
    
    // Атака монстра с попапами урона
    attackMonster(clickX, clickY) {
        if (!this.state.currentMonster || this.state.currentMonster.hp <= 0) return;
        
        const monster = this.state.currentMonster;
        
        // Нанесение урона
        monster.hp = Math.max(0, monster.hp - monster.damage);
        
        // Создание попапа урона
        this.createDamagePopup(clickX, clickY, monster.damage, 'normal');
        
        // Проверка убийства
        if (monster.hp <= 0) {
            // Награда за убийство
            this.state.gold += monster.reward;
            this.state.totalGoldEarned += monster.reward;
            this.state.monstersKilled++;
            
            // Показ попапа с золотом
            this.createDamagePopup(clickX, clickY, `+${monster.reward} золота`, 'gold');
            this.showNotification(`Монстр убит! +${monster.reward} золота`, 'gold-earned');
            
            // Спавн нового монстра через 2 секунды
            setTimeout(() => {
                this.spawnRandomMonster();
            }, 2000);
        }
        
        this.updateUI();
        this.updateMonsterUI();
    },
    
    // Спавн случайного монстра
    spawnRandomMonster() {
        // Выбор случайного типа монстра
        const monsterIds = Object.keys(this.state.monsterTypes);
        const randomId = monsterIds[Math.floor(Math.random() * monsterIds.length)];
        const monsterType = this.state.monsterTypes[randomId];
        
        // Создание нового монстра
        this.state.currentMonster = {
            id: randomId,
            name: monsterType.name,
            icon: monsterType.icon,
            hp: monsterType.hp,
            maxHP: monsterType.maxHP,
            reward: monsterType.reward,
            damage: monsterType.damage,
            color: monsterType.color
        };
        
        // Показ уведомления о спавне
        const notification = document.getElementById('monster-spawn-notification');
        notification.textContent = `Появился ${monsterType.name}!`;
        notification.style.display = 'block';
        
        // Скрытие уведомления через 3 секунды
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
        
        this.updateMonsterUI();
    },
    
    // Победа над боссом
    bossDefeated() {
        const reward = 1000;
        this.state.gold += reward;
        this.state.totalGoldEarned += reward;
        
        // Показ попапа с золотом в центре экрана
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        this.createDamagePopup(centerX, centerY, `+${reward} золота!`, 'gold');
        this.showNotification(`БОСС ПОБЕЖДЁН! +${reward} золота`, 'success');
        
        // Сброс HP босса (можно увеличить сложность)
        this.state.bossHP = this.state.maxBossHP;
        this.state.maxBossHP = Math.floor(this.state.maxBossHP * 1.2); // Увеличиваем HP для следующего раза
    },
    
    // Создание попапа с цифрами урона
    createDamagePopup(x, y, text, type = 'normal') {
        const container = document.getElementById('damage-popups-container');
        const popup = document.createElement('div');
        
        popup.className = `damage-popup ${type}`;
        popup.textContent = text;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        
        container.appendChild(popup);
        
        // Удаление попапа после анимации
        setTimeout(() => {
            popup.remove();
        }, 1500);
    },
    
    // Игровой цикл
    startGameLoop() {
        setInterval(() => {
            // Обновление времени игры
            this.state.playTime++;
            
            // Автокликер (каждые 10 минут = 600 секунд)
            if (this.state.autoclickerActive && this.state.playTime % 600 === 0) {
                const autoDamage = this.state.clickDamage;
                this.state.bossHP = Math.max(0, this.state.bossHP - autoDamage);
                this.state.totalDamageDealt += autoDamage;
                
                // Создание попапа для автокликера в случайном месте босса
                const bossArea = document.getElementById('boss-click-area');
                const rect = bossArea.getBoundingClientRect();
                const randomX = rect.left + Math.random() * rect.width;
                const randomY = rect.top + Math.random() * rect.height;
                this.createDamagePopup(randomX, randomY, autoDamage, 'normal');
                
                if (this.state.bossHP <= 0) {
                    this.bossDefeated();
                }
            }
            
            // Периодический урон (каждые 30 секунд)
            if (this.state.periodicDamage > 0 && this.state.playTime % 30 === 0) {
                this.state.bossHP = Math.max(0, this.state.bossHP - this.state.periodicDamage);
                this.state.totalDamageDealt += this.state.periodicDamage;
                
                // Создание попапа для периодического урона
                const bossArea = document.getElementById('boss-click-area');
                const rect = bossArea.getBoundingClientRect();
                const randomX = rect.left + Math.random() * rect.width;
                const randomY = rect.top + Math.random() * rect.height;
                this.createDamagePopup(randomX, randomY, this.state.periodicDamage, 'normal');
                
                if (this.state.bossHP <= 0) {
                    this.bossDefeated();
                }
            }
            
            // Автосохранение каждую минуту
            if (this.state.playTime % 60 === 0) {
                this.save();
            }
            
            this.updateUI();
        }, 1000); // 1 секунда
    },
    
    // Обновление интерфейса
    updateUI() {
        // Золото
        document.getElementById('gold').textContent = this.state.gold;
        document.getElementById('total-gold-earned').textContent = this.state.totalGoldEarned;
        
        // Босс
        const hpPercent = (this.state.bossHP / this.state.maxBossHP) * 100;
        document.getElementById('boss-hp-bar').style.width = `${hpPercent}%`;
        document.getElementById('boss-hp-text').textContent = 
            `${this.state.bossHP.toLocaleString()} / ${this.state.maxBossHP.toLocaleString()} HP`;
        
        // Урон и криты
        document.getElementById('current-damage').textContent = this.state.clickDamage;
        document.getElementById('crit-chance').textContent = this.state.critChance;
        document.getElementById('crit-multiplier').textContent = this.state.critMultiplier.toFixed(1);
        
        // Статистика
        document.getElementById('total-damage').textContent = this.state.totalDamageDealt.toLocaleString();
        document.getElementById('monsters-killed').textContent = this.state.monstersKilled;
        
        // Время игры
        const minutes = Math.floor(this.state.playTime / 60);
        document.getElementById('play-time').textContent = `${minutes} минут`;
        
        // Улучшения
        this.updateUpgradesUI();
        this.updateMonsterUI();
    },
    
    // Обновление интерфейса улучшений
    updateUpgradesUI() {
        const upgrades = this.state.upgrades;
        
        // Усиленный удар
        document.getElementById('clickDamage-lvl').textContent = upgrades.clickDamage.level;
        document.getElementById('clickDamage-cost').textContent = upgrades.clickDamage.cost;
        
        // Автокликер
        document.getElementById('autoclicker-status').textContent = 
            upgrades.autoclicker.purchased ? 'Активен' : 'Неактивен';
        document.getElementById('autoclicker-cost').textContent = upgrades.autoclicker.cost;
        
        // Шанс крита
        document.getElementById('criticalChance-lvl').textContent = upgrades.criticalChance.level;
        document.getElementById('criticalChance-cost').textContent = upgrades.criticalChance.cost;
        
        // Сила крита
        document.getElementById('criticalDamage-lvl').textContent = upgrades.criticalDamage.level;
        document.getElementById('criticalDamage-cost').textContent = upgrades.criticalDamage.cost;
        
        // Периодический урон
        document.getElementById('periodicDamage-lvl').textContent = upgrades.periodicDamage.level;
        document.getElementById('periodicDamage-dmg').textContent = this.state.periodicDamage;
        document.getElementById('periodicDamage-cost').textContent = upgrades.periodicDamage.cost;
        
        // Обновление состояния кнопок покупки
        document.querySelectorAll('.buy-btn').forEach(btn => {
            const upgradeId = btn.dataset.id;
            const upgrade = upgrades[upgradeId];
            
            if (upgrade && this.state.gold < upgrade.cost) {
                btn.disabled = true;
                btn.style.opacity = '0.6';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
            
            // Для автокликера меняем текст после покупки
            if (upgradeId === 'autoclicker' && upgrades.autoclicker.purchased) {
                btn.innerHTML = `Улучшить: <span id="autoclicker-cost">${upgrades.autoclicker.cost}</span> <i class="fas fa-coins"></i>`;
            }
        });
    },
    
    // Обновление интерфейса монстра
    updateMonsterUI() {
        const monster = this.state.currentMonster;
        
        if (!monster) {
            document.getElementById('current-monster-name').textContent = 'Нет монстра';
            document.getElementById('current-monster-hp').textContent = '0';
            document.getElementById('current-monster-maxhp').textContent = '0';
            document.getElementById('current-monster-reward').textContent = '0';
            document.getElementById('current-monster-damage').textContent = '0';
            document.getElementById('attack-current-monster-btn').disabled = true;
            return;
        }
        
        // Обновление иконки
        const iconElement = document.querySelector('#current-monster .monster-icon i');
        iconElement.className = `fas ${monster.icon}`;
        iconElement.style.color = monster.color;
        
        // Обновление информации
        document.getElementById('current-monster-name').textContent = monster.name;
        document.getElementById('current-monster-hp').textContent = monster.hp;
        document.getElementById('current-monster-maxhp').textContent = monster.maxHP;
        document.getElementById('current-monster-reward').textContent = monster.reward;
        document.getElementById('current-monster-damage').textContent = monster.damage;
        
        // Обновление состояния кнопки
        const btn = document.getElementById('attack-current-monster-btn');
        if (monster.hp <= 0) {
            btn.disabled = true;
            btn.textContent = 'Монстр убит!';
            btn.style.opacity = '0.6';
        } else {
            btn.disabled = false;
            btn.innerHTML = `Атаковать (<span id="current-monster-damage">${monster.damage}</span> урона)`;
            btn.style.opacity = '1';
        }
        
        // Обновление цвета HP в зависимости от оставшегося здоровья
        const hpPercent = (monster.hp / monster.maxHP) * 100;
        const hpElement = document.querySelector('.monster-hp');
        if (hpPercent > 50) {
            hpElement.style.color = '#00ffcc';
        } else if (hpPercent > 25) {
            hpElement.style.color = '#ffcc00';
        } else {
            hpElement.style.color = '#ff3300';
        }
    },
    
    // Показать уведомление
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        
        // Установка цвета в зависимости от типа
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(90deg, #00cc66, #00ff99)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(90deg, #ff3300, #ff6600)';
                break;
            case 'gold-earned':
                notification.style.background = 'linear-gradient(90deg, #ffd700, #ff9900)';
                break;
            default:
                notification.style.background = 'linear-gradient(90deg, #0088ff, #00ccff)';
        }
        
        notification.textContent = message;
        notification.classList.add('show');
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    },
    
    // Сохранение игры
    save() {
        try {
            localStorage.setItem('mlbbBossBattle', JSON.stringify(this.state));
            return true;
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            return false;
        }
    },
    
    // Загрузка игры
    load() {
        try {
            const saved = localStorage.getItem('mlbbBossBattle');
            if (saved) {
                const loadedState = JSON.parse(saved);
                
                // Миграция состояния (на случай добавления новых полей)
                this.state = {
                    ...this.state,
                    ...loadedState,
                    // Убедимся, что новые поля существуют
                    upgrades: {
                        ...this.state.upgrades,
                        ...(loadedState.upgrades || {})
                    },
                    // Восстановление текущего монстра
                    currentMonster: loadedState.currentMonster || null,
                    monsterTypes: this.state.monsterTypes // Всегда используем оригинальные типы
                };
                
                // Если нет текущего монстра, создаем случайного
                if (!this.state.currentMonster) {
                    this.spawnRandomMonster();
                }
                
                this.showNotification('Игра загружена из сохранения!', 'success');
            }
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            this.showNotification('Ошибка загрузки сохранения', 'error');
        }
    },
    
    // Сброс игры
    resetGame() {
        if (confirm('ВСЕ данные будут удалены. Вы уверены?')) {
            localStorage.removeItem('mlbbBossBattle');
            
            // Сброс состояния к начальному
            this.state = {
                gold: 100,
                totalGoldEarned: 100,
                bossHP: 100000,
                maxBossHP: 100000,
                clickDamage: 1,
                critChance: 5,
                critMultiplier: 2.0,
                totalDamageDealt: 0,
                monstersKilled: 0,
                playTime: 0,
                autoclickerActive: false,
                autoclickerLastActivation: 0,
                periodicDamage: 0,
                periodicDamageLevel: 0,
                
                upgrades: {
                    clickDamage: { level: 0, cost: 10 },
                    autoclicker: { level: 0, cost: 500, purchased: false },
                    criticalChance: { level: 0, cost: 50 },
                    criticalDamage: { level: 0, cost: 100 },
                    periodicDamage: { level: 0, cost: 200 }
                },
                
                currentMonster: null,
                monsterTypes: this.state.monsterTypes
            };
            
            // Спавн первого монстра
            this.spawnRandomMonster();
            
            this.updateUI();
            this.showNotification('Игра сброшена!', 'info');
        }
    }
};

// Инициализация игры при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});

// Экспорт для отладки (если нужно)
if (typeof window !== 'undefined') {
    window.Game = Game;
}
