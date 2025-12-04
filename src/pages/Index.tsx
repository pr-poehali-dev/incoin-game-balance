import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  balance: number;
  gamesPlayed: number;
  totalEarned: number;
  telegramId?: number;
  firstName?: string;
  photoUrl?: string;
  upgrades?: {
    autoClicker: number;
    doubleReward: number;
    luckyCharm: number;
    speedBoost: number;
  };
}

interface GameHistory {
  game: string;
  earned: number;
  timestamp: number;
}

interface LeaderboardEntry {
  username: string;
  balance: number;
  gamesPlayed: number;
}

interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  basePrice: number;
  effect: string;
  color: string;
}

interface TradeHistory {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  total: number;
}

const GAMES = [
  { id: 'clicker', name: 'Кликер Монет', icon: 'Coins', color: 'from-purple-500 to-pink-500' },
  { id: 'guess', name: 'Угадай Число', icon: 'Dices', color: 'from-blue-500 to-cyan-500' },
  { id: 'memory', name: 'Мемори Карты', icon: 'Brain', color: 'from-orange-500 to-red-500' },
  { id: 'speed', name: 'Быстрые Клики', icon: 'Zap', color: 'from-yellow-500 to-orange-500' },
  { id: 'color', name: 'Цветная Реакция', icon: 'Palette', color: 'from-green-500 to-teal-500' },
  { id: 'catch', name: 'Собери Монеты', icon: 'Target', color: 'from-indigo-500 to-purple-500' },
  { id: 'puzzle', name: 'Пазл Слайдер', icon: 'Grid3x3', color: 'from-violet-500 to-purple-500' },
  { id: 'reaction', name: 'Реакция Pro', icon: 'Timer', color: 'from-red-500 to-pink-500' },
  { id: 'math', name: 'Быстрая Математика', icon: 'Calculator', color: 'from-cyan-500 to-blue-500' },
];

const UPGRADES: Upgrade[] = [
  { id: 'autoClicker', name: 'Авто-кликер', description: 'Автоматически зарабатывает 1 INCOIN каждые 10 сек', icon: 'Cpu', basePrice: 100, effect: '+1 INCOIN/10сек', color: 'from-blue-500 to-cyan-500' },
  { id: 'doubleReward', name: 'Двойная награда', description: 'Получайте x2 монет за каждую игру', icon: 'Sparkles', basePrice: 500, effect: 'x2 награда', color: 'from-yellow-500 to-orange-500' },
  { id: 'luckyCharm', name: 'Талисман удачи', description: '20% шанс получить бонус +1 INCOIN', icon: 'Clover', basePrice: 250, effect: '+20% бонус', color: 'from-green-500 to-emerald-500' },
  { id: 'speedBoost', name: 'Ускоритель', description: 'Уменьшает время игр на 30%', icon: 'Rocket', basePrice: 350, effect: '-30% время', color: 'from-purple-500 to-pink-500' },
];

export default function Index() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [currentTab, setCurrentTab] = useState('home');
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [incoinPrice, setIncoinPrice] = useState(100);
  const [priceHistory, setPriceHistory] = useState<number[]>([100]);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [aiTrading, setAiTrading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('incoin_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (!user.upgrades) {
        user.upgrades = { autoClicker: 0, doubleReward: 0, luckyCharm: 0, speedBoost: 0 };
      }
      setCurrentUser(user);
      setShowAuth(false);
      loadGameHistory();
      loadLeaderboard();
      loadTradeHistory();
    } else {
      initTelegramAuth();
    }

    const priceInterval = setInterval(() => {
      setIncoinPrice(prev => {
        const change = (Math.random() - 0.5) * 10;
        const newPrice = Math.max(50, Math.min(200, prev + change));
        setPriceHistory(ph => [...ph.slice(-20), newPrice]);
        return newPrice;
      });
    }, 5000);

    return () => clearInterval(priceInterval);
  }, []);

  const initTelegramAuth = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      
      if (tg.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user;
        handleTelegramAuth(tgUser);
      }
    }
  };

  const handleTelegramAuth = (tgUser: any) => {
    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    let user = allUsers.find((u: User) => u.telegramId === tgUser.id);

    if (!user) {
      user = {
        id: Date.now().toString(),
        username: tgUser.username || tgUser.first_name,
        balance: 0,
        gamesPlayed: 0,
        totalEarned: 0,
        telegramId: tgUser.id,
        firstName: tgUser.first_name,
        photoUrl: tgUser.photo_url,
        upgrades: { autoClicker: 0, doubleReward: 0, luckyCharm: 0, speedBoost: 0 },
      };
      allUsers.push(user);
      localStorage.setItem('all_users', JSON.stringify(allUsers));
      toast({ title: 'Добро пожаловать!', description: `Аккаунт ${user.username} создан через Telegram` });
    }

    localStorage.setItem('incoin_user', JSON.stringify(user));
    setCurrentUser(user);
    setShowAuth(false);
    loadGameHistory();
    loadLeaderboard();
  };

  const loadGameHistory = () => {
    const history = localStorage.getItem('game_history');
    if (history) {
      setGameHistory(JSON.parse(history));
    }
  };

  const loadLeaderboard = () => {
    const users = localStorage.getItem('all_users');
    if (users) {
      const parsedUsers: User[] = JSON.parse(users);
      const sorted = parsedUsers
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10)
        .map(u => ({ username: u.username, balance: u.balance, gamesPlayed: u.gamesPlayed }));
      setLeaderboard(sorted);
    }
  };

  const loadTradeHistory = () => {
    const history = localStorage.getItem('trade_history');
    if (history) {
      setTradeHistory(JSON.parse(history));
    }
  };

  const handleAuth = () => {
    if (!username.trim()) {
      toast({ title: 'Ошибка', description: 'Введите имя пользователя', variant: 'destructive' });
      return;
    }

    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');

    if (authMode === 'register') {
      const exists = allUsers.find((u: User) => u.username === username);
      if (exists) {
        toast({ title: 'Ошибка', description: 'Пользователь уже существует', variant: 'destructive' });
        return;
      }

      const newUser: User = {
        id: Date.now().toString(),
        username,
        balance: 0,
        gamesPlayed: 0,
        totalEarned: 0,
        upgrades: { autoClicker: 0, doubleReward: 0, luckyCharm: 0, speedBoost: 0 },
      };

      allUsers.push(newUser);
      localStorage.setItem('all_users', JSON.stringify(allUsers));
      localStorage.setItem('incoin_user', JSON.stringify(newUser));
      setCurrentUser(newUser);
      setShowAuth(false);
      toast({ title: 'Добро пожаловать!', description: `Аккаунт ${username} создан` });
    } else {
      const user = allUsers.find((u: User) => u.username === username);
      if (!user) {
        toast({ title: 'Ошибка', description: 'Пользователь не найден', variant: 'destructive' });
        return;
      }

      localStorage.setItem('incoin_user', JSON.stringify(user));
      setCurrentUser(user);
      setShowAuth(false);
      loadGameHistory();
      loadLeaderboard();
      toast({ title: 'С возвращением!', description: `Добро пожаловать, ${username}` });
    }
  };

  const updateUserBalance = (amount: number, gameName: string) => {
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      balance: currentUser.balance + amount,
      gamesPlayed: currentUser.gamesPlayed + 1,
      totalEarned: currentUser.totalEarned + amount,
    };

    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    const userIndex = allUsers.findIndex((u: User) => u.id === currentUser.id);
    if (userIndex !== -1) {
      allUsers[userIndex] = updatedUser;
      localStorage.setItem('all_users', JSON.stringify(allUsers));
    }

    localStorage.setItem('incoin_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    const newHistory: GameHistory = { game: gameName, earned: amount, timestamp: Date.now() };
    const history = [...gameHistory, newHistory];
    setGameHistory(history);
    localStorage.setItem('game_history', JSON.stringify(history));

    loadLeaderboard();
  };

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount);
    
    if (isNaN(amount)) {
      toast({ title: 'Ошибка', description: 'Введите корректную сумму', variant: 'destructive' });
      return;
    }

    if (amount < 10) {
      toast({ title: 'Ошибка', description: 'Минимальная сумма пополнения: 10 INCOIN', variant: 'destructive' });
      return;
    }

    if (amount > 50000000) {
      toast({ title: 'Ошибка', description: 'Максимальная сумма пополнения: 50,000,000 INCOIN', variant: 'destructive' });
      return;
    }

    if (!currentUser) return;

    const newBalance = currentUser.balance + amount;
    const updatedUser = { ...currentUser, balance: newBalance };

    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    const userIndex = allUsers.findIndex((u: User) => u.id === currentUser.id);
    if (userIndex !== -1) {
      allUsers[userIndex] = updatedUser;
      localStorage.setItem('all_users', JSON.stringify(allUsers));
    }

    localStorage.setItem('incoin_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setShowTopUp(false);
    setTopUpAmount('');
    loadLeaderboard();

    toast({ 
      title: 'Пополнение успешно!', 
      description: `Баланс пополнен на ${amount.toLocaleString('ru-RU')} INCOIN` 
    });
  };

  const buyUpgrade = (upgradeId: string) => {
    if (!currentUser) return;

    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    if (!upgrade) return;

    const currentLevel = currentUser.upgrades?.[upgradeId as keyof typeof currentUser.upgrades] || 0;
    const price = upgrade.basePrice * Math.pow(1.5, currentLevel);

    if (currentUser.balance < price) {
      toast({ title: 'Недостаточно средств', description: `Требуется ${price.toFixed(0)} INCOIN`, variant: 'destructive' });
      return;
    }

    const updatedUser = {
      ...currentUser,
      balance: currentUser.balance - price,
      upgrades: {
        ...currentUser.upgrades!,
        [upgradeId]: currentLevel + 1,
      },
    };

    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    const userIndex = allUsers.findIndex((u: User) => u.id === currentUser.id);
    if (userIndex !== -1) {
      allUsers[userIndex] = updatedUser;
      localStorage.setItem('all_users', JSON.stringify(allUsers));
    }

    localStorage.setItem('incoin_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    loadLeaderboard();

    toast({ title: 'Улучшение куплено!', description: `${upgrade.name} уровень ${currentLevel + 1}` });
  };

  const handleTrade = (type: 'buy' | 'sell') => {
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Ошибка', description: 'Введите корректную сумму', variant: 'destructive' });
      return;
    }

    if (!currentUser) return;

    const total = amount * incoinPrice;

    if (type === 'buy' && currentUser.balance < total) {
      toast({ title: 'Недостаточно средств', description: `Требуется ${total.toFixed(2)} INCOIN`, variant: 'destructive' });
      return;
    }

    const newBalance = type === 'buy' ? currentUser.balance - total : currentUser.balance + total;
    const updatedUser = { ...currentUser, balance: newBalance };

    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    const userIndex = allUsers.findIndex((u: User) => u.id === currentUser.id);
    if (userIndex !== -1) {
      allUsers[userIndex] = updatedUser;
      localStorage.setItem('all_users', JSON.stringify(allUsers));
    }

    localStorage.setItem('incoin_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    const trade: TradeHistory = { type, amount, price: incoinPrice, timestamp: Date.now(), total };
    const history = [...tradeHistory, trade];
    setTradeHistory(history);
    localStorage.setItem('trade_history', JSON.stringify(history));

    setTradeAmount('');
    loadLeaderboard();

    toast({ 
      title: type === 'buy' ? 'Покупка выполнена' : 'Продажа выполнена', 
      description: `${amount} токенов по ${incoinPrice.toFixed(2)} INCOIN` 
    });
  };

  const toggleAiTrading = () => {
    setAiTrading(!aiTrading);
    toast({ 
      title: aiTrading ? 'ИИ трейдинг остановлен' : 'ИИ трейдинг запущен', 
      description: aiTrading ? 'Автоматическая торговля остановлена' : 'ИИ будет торговать автоматически' 
    });
  };

  const logout = () => {
    localStorage.removeItem('incoin_user');
    setCurrentUser(null);
    setShowAuth(true);
    setCurrentTab('home');
    setGameHistory([]);
  };

  if (showAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-purple-950 to-background">
        <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur-lg border-primary/30">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shine">
              <Icon name="Coins" size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              INCOIN
            </h1>
            <p className="text-muted-foreground mt-2">Игровая платформа</p>
          </div>

          <div className="space-y-4">
            <div className="text-center mb-6">
              <Icon name="Send" size={48} className="mx-auto mb-3 text-primary" />
              <p className="text-muted-foreground">
                Откройте приложение через Telegram Mini App для автоматической авторизации
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Или войдите вручную</span>
              </div>
            </div>

            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="bg-muted/50"
            />
            <Button onClick={handleAuth} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              {authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950 to-background">
      <nav className="border-b border-primary/30 bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shine">
                <Icon name="Coins" size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                INCOIN
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Card className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 border-0">
                <div className="flex items-center gap-2">
                  <Icon name="Coins" size={20} className="text-white coin-bounce" />
                  <span className="font-bold text-white text-lg">{currentUser?.balance.toFixed(2)}</span>
                </div>
              </Card>

              <Button variant="ghost" size="icon" onClick={logout}>
                <Icon name="LogOut" size={20} />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8 bg-card/50">
            <TabsTrigger value="home">
              <Icon name="Home" size={18} className="mr-1" />
              Главная
            </TabsTrigger>
            <TabsTrigger value="games">
              <Icon name="Gamepad2" size={18} className="mr-1" />
              Игры
            </TabsTrigger>
            <TabsTrigger value="shop">
              <Icon name="ShoppingBag" size={18} className="mr-1" />
              Магазин
            </TabsTrigger>
            <TabsTrigger value="trading">
              <Icon name="TrendingUp" size={18} className="mr-1" />
              Трейдинг
            </TabsTrigger>
            <TabsTrigger value="account">
              <Icon name="User" size={18} className="mr-1" />
              Аккаунт
            </TabsTrigger>
            <TabsTrigger value="rating">
              <Icon name="Trophy" size={18} className="mr-1" />
              Рейтинг
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-purple-600 to-pink-600 border-0">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Привет, {currentUser?.username}! 👋</h2>
                  <p className="text-white/80">Играй, зарабатывай INCOIN и становись лидером!</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold">{currentUser?.balance.toFixed(2)}</div>
                  <div className="text-white/80">INCOIN</div>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-6 bg-card/80 backdrop-blur">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Icon name="Gamepad2" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{currentUser?.gamesPlayed}</div>
                    <div className="text-sm text-muted-foreground">Игр сыграно</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card/80 backdrop-blur">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Icon name="TrendingUp" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{currentUser?.totalEarned.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Всего заработано</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card/80 backdrop-blur">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                    <Icon name="Award" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">0.10</div>
                    <div className="text-sm text-muted-foreground">За каждую игру</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-card/80 backdrop-blur">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Sparkles" size={24} />
                Быстрый старт
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {GAMES.slice(0, 4).map((game) => (
                  <Button
                    key={game.id}
                    className={`h-auto p-4 bg-gradient-to-r ${game.color} hover:opacity-90 transition-all hover:scale-105`}
                    onClick={() => {
                      setSelectedGame(game.id);
                      setCurrentTab('games');
                    }}
                  >
                    <Icon name={game.icon as any} size={24} className="mr-2" />
                    <span className="font-semibold">{game.name}</span>
                  </Button>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="games">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {GAMES.map((game) => (
                <Card
                  key={game.id}
                  className="p-6 bg-card/80 backdrop-blur hover:scale-105 transition-all cursor-pointer border-2 border-transparent hover:border-primary"
                  onClick={() => setSelectedGame(game.id)}
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${game.color} flex items-center justify-center mb-4 shine`}>
                    <Icon name={game.icon as any} size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Icon name="Coins" size={16} />
                    <span>+0.10 INCOIN за игру</span>
                  </div>
                  <Button className={`w-full bg-gradient-to-r ${game.color}`}>
                    Играть
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shop">
            <div className="grid md:grid-cols-2 gap-6">
              {UPGRADES.map((upgrade) => {
                const currentLevel = currentUser?.upgrades?.[upgrade.id as keyof typeof currentUser.upgrades] || 0;
                const price = upgrade.basePrice * Math.pow(1.5, currentLevel);

                return (
                  <Card key={upgrade.id} className="p-6 bg-card/80 backdrop-blur">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${upgrade.color} flex items-center justify-center shine flex-shrink-0`}>
                        <Icon name={upgrade.icon as any} size={32} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold">{upgrade.name}</h3>
                          <Badge variant="secondary">Ур. {currentLevel}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{upgrade.description}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Icon name="Zap" size={16} className="text-yellow-500" />
                          <span className="font-semibold">{upgrade.effect}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div>
                        <div className="text-sm text-muted-foreground">Стоимость</div>
                        <div className="text-2xl font-bold flex items-center gap-1">
                          <Icon name="Coins" size={20} />
                          {price.toFixed(0)}
                        </div>
                      </div>
                      <Button 
                        onClick={() => buyUpgrade(upgrade.id)}
                        className={`bg-gradient-to-r ${upgrade.color}`}
                        disabled={currentUser!.balance < price}
                      >
                        <Icon name="ShoppingCart" size={16} className="mr-2" />
                        Купить
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="trading" className="space-y-6">
            <Card className="p-6 bg-card/80 backdrop-blur">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Icon name="BarChart3" size={28} />
                    INCOIN Трейдинг
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Торгуйте токенами в реальном времени</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Текущая цена</div>
                  <div className="text-3xl font-bold text-primary">{incoinPrice.toFixed(2)} ₽</div>
                </div>
              </div>

              <div className="mb-6 p-4 rounded-lg bg-muted/50">
                <div className="h-32 flex items-end gap-1">
                  {priceHistory.slice(-20).map((price, i) => {
                    const maxPrice = Math.max(...priceHistory.slice(-20));
                    const minPrice = Math.min(...priceHistory.slice(-20));
                    const height = ((price - minPrice) / (maxPrice - minPrice)) * 100;
                    return (
                      <div 
                        key={i} 
                        className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t transition-all"
                        style={{ height: `${height || 5}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Купить токены</h4>
                  <Input
                    type="number"
                    placeholder="Количество токенов"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="text-lg"
                  />
                  <div className="text-sm text-muted-foreground">
                    Стоимость: {tradeAmount && !isNaN(parseFloat(tradeAmount)) ? (parseFloat(tradeAmount) * incoinPrice).toFixed(2) : '0.00'} INCOIN
                  </div>
                  <Button 
                    onClick={() => handleTrade('buy')}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Icon name="ArrowUp" size={20} className="mr-2" />
                    Купить
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Продать токены</h4>
                  <Input
                    type="number"
                    placeholder="Количество токенов"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="text-lg"
                  />
                  <div className="text-sm text-muted-foreground">
                    Получите: {tradeAmount && !isNaN(parseFloat(tradeAmount)) ? (parseFloat(tradeAmount) * incoinPrice).toFixed(2) : '0.00'} INCOIN
                  </div>
                  <Button 
                    onClick={() => handleTrade('sell')}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-500"
                  >
                    <Icon name="ArrowDown" size={20} className="mr-2" />
                    Продать
                  </Button>
                </div>
              </div>

              <Card className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-primary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Icon name="Bot" size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold">ИИ Трейдинг</h4>
                      <p className="text-sm text-muted-foreground">Автоматическая торговля</p>
                    </div>
                  </div>
                  <Button 
                    onClick={toggleAiTrading}
                    variant={aiTrading ? 'default' : 'outline'}
                    className={aiTrading ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}
                  >
                    <Icon name={aiTrading ? 'Pause' : 'Play'} size={16} className="mr-2" />
                    {aiTrading ? 'Остановить' : 'Запустить'}
                  </Button>
                </div>
                {aiTrading && (
                  <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Icon name="Activity" size={16} className="animate-pulse text-green-500" />
                    ИИ активно анализирует рынок...
                  </div>
                )}
              </Card>
            </Card>

            <Card className="p-6 bg-card/80 backdrop-blur">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Icon name="History" size={24} />
                История сделок
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tradeHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">История пуста</p>
                ) : (
                  tradeHistory.slice().reverse().map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          trade.type === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          <Icon name={trade.type === 'buy' ? 'ArrowUp' : 'ArrowDown'} size={20} />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {trade.type === 'buy' ? 'Покупка' : 'Продажа'} {trade.amount} токенов
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{trade.total.toFixed(2)} INCOIN</div>
                        <div className="text-xs text-muted-foreground">@ {trade.price.toFixed(2)} ₽</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card className="p-6 bg-card/80 backdrop-blur">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white">
                  {currentUser?.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentUser?.username}</h2>
                  <p className="text-muted-foreground">ID: {currentUser?.id}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Баланс</div>
                  <div className="text-2xl font-bold">{currentUser?.balance.toFixed(2)} INCOIN</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Игр сыграно</div>
                  <div className="text-2xl font-bold">{currentUser?.gamesPlayed}</div>
                </div>
              </div>

              <Button 
                onClick={() => setShowTopUp(true)} 
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
              >
                <Icon name="Plus" size={20} className="mr-2" />
                Пополнить баланс
              </Button>
            </Card>

            <Card className="p-6 bg-card/80 backdrop-blur">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Icon name="History" size={24} />
                История игр
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {gameHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">История пуста</p>
                ) : (
                  gameHistory.slice().reverse().map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-semibold">{entry.game}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                        +{entry.earned.toFixed(2)} INCOIN
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="rating">
            <Card className="p-6 bg-card/80 backdrop-blur">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Icon name="Trophy" size={28} className="text-yellow-500" />
                Топ игроков
              </h3>
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Рейтинг пуст</p>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50'
                          : index === 1
                          ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/50'
                          : index === 2
                          ? 'bg-gradient-to-r from-orange-700/20 to-orange-800/20 border border-orange-700/50'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-700 text-white' :
                          'bg-muted text-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{entry.username}</div>
                          <div className="text-sm text-muted-foreground">{entry.gamesPlayed} игр</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{entry.balance.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">INCOIN</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <GameDialog
        gameId={selectedGame}
        onClose={() => setSelectedGame(null)}
        onComplete={(gameName) => {
          updateUserBalance(0.1, gameName);
          toast({
            title: 'Игра завершена!',
            description: `Вы заработали 0.10 INCOIN`,
          });
        }}
      />

      <Dialog open={showTopUp} onOpenChange={setShowTopUp}>
        <DialogContent className="bg-card/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Icon name="Wallet" size={28} />
              Пополнение баланса
            </DialogTitle>
            <DialogDescription>
              Введите сумму для пополнения (от 10 до 50,000,000 INCOIN)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Сумма пополнения</label>
              <Input
                type="number"
                placeholder="Введите сумму"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="text-lg"
                min={10}
                max={50000000}
                onKeyDown={(e) => e.key === 'Enter' && handleTopUp()}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Минимум: 10 INCOIN</span>
                <span>Максимум: 50,000,000 INCOIN</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                onClick={() => setTopUpAmount('100')}
                className="border-primary/50 hover:bg-primary/10"
              >
                +100
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setTopUpAmount('1000')}
                className="border-primary/50 hover:bg-primary/10"
              >
                +1,000
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setTopUpAmount('10000')}
                className="border-primary/50 hover:bg-primary/10"
              >
                +10,000
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setTopUpAmount('100000')}
                className="border-primary/50 hover:bg-primary/10"
              >
                +100K
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setTopUpAmount('1000000')}
                className="border-primary/50 hover:bg-primary/10"
              >
                +1M
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setTopUpAmount('50000000')}
                className="border-primary/50 hover:bg-primary/10"
              >
                +50M
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Текущий баланс:</span>
                <span className="font-bold">{currentUser?.balance.toFixed(2)} INCOIN</span>
              </div>
              {topUpAmount && !isNaN(parseFloat(topUpAmount)) && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Новый баланс:</span>
                  <span className="font-bold text-primary">
                    {(currentUser!.balance + parseFloat(topUpAmount)).toLocaleString('ru-RU')} INCOIN
                  </span>
                </div>
              )}
            </div>

            <Button 
              onClick={handleTopUp} 
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
            >
              <Icon name="CheckCircle" size={20} className="mr-2" />
              Пополнить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GameDialog({ gameId, onClose, onComplete }: { gameId: string | null; onClose: () => void; onComplete: (gameName: string) => void }) {
  const game = GAMES.find((g) => g.id === gameId);
  const [gameState, setGameState] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    if (gameId) {
      initGame(gameId);
    }
  }, [gameId]);

  const initGame = (id: string) => {
    switch (id) {
      case 'clicker':
        setGameState({ clicks: 0, target: 50, progress: 0 });
        break;
      case 'guess':
        setGameState({ target: Math.floor(Math.random() * 100) + 1, guess: '', attempts: 0, hint: '' });
        break;
      case 'memory':
        const cards = ['🎮', '🎲', '🎯', '🎨', '🎭', '🎪'].flatMap((e) => [e, e]);
        setGameState({ cards: cards.sort(() => Math.random() - 0.5), flipped: [], matched: [] });
        break;
      case 'speed':
        setGameState({ clicks: 0, timeLeft: 10, started: false });
        break;
      case 'color':
        setGameState({ correctColor: '', options: [], score: 0, round: 1 });
        generateColorRound();
        break;
      case 'catch':
        setGameState({ score: 0, timeLeft: 15, coinPosition: { x: 50, y: 50 } });
        break;
      case 'puzzle':
        const tiles = Array.from({ length: 9 }, (_, i) => i);
        setGameState({ tiles: tiles.sort(() => Math.random() - 0.5), moves: 0 });
        break;
      case 'reaction':
        setGameState({ waiting: true, startTime: 0, reactionTime: 0, attempt: 1 });
        setTimeout(() => setGameState((prev: any) => ({ ...prev, waiting: false, startTime: Date.now() })), Math.random() * 3000 + 2000);
        break;
      case 'math':
        const generateMath = () => {
          const a = Math.floor(Math.random() * 20) + 1;
          const b = Math.floor(Math.random() * 20) + 1;
          const ops = ['+', '-', '*'];
          const op = ops[Math.floor(Math.random() * ops.length)];
          let answer = 0;
          if (op === '+') answer = a + b;
          else if (op === '-') answer = a - b;
          else answer = a * b;
          return { question: `${a} ${op} ${b}`, answer };
        };
        const mathQ = generateMath();
        setGameState({ ...mathQ, userAnswer: '', score: 0, round: 1 });
        break;
    }
  };

  const generateColorRound = () => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    const correct = colors[Math.floor(Math.random() * colors.length)];
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    setGameState((prev: any) => ({ ...prev, correctColor: correct, options: shuffled }));
  };

  const handleClickerClick = () => {
    const newClicks = gameState.clicks + 1;
    const progress = (newClicks / gameState.target) * 100;
    setGameState({ ...gameState, clicks: newClicks, progress });

    if (newClicks >= gameState.target) {
      onComplete(game?.name || '');
      onClose();
    }
  };

  const handleGuessSubmit = () => {
    const guess = parseInt(gameState.guess);
    if (isNaN(guess)) return;

    const attempts = gameState.attempts + 1;

    if (guess === gameState.target) {
      onComplete(game?.name || '');
      onClose();
    } else {
      const hint = guess < gameState.target ? 'Больше!' : 'Меньше!';
      setGameState({ ...gameState, attempts, hint, guess: '' });
    }
  };

  const handleMemoryClick = (index: number) => {
    if (gameState.flipped.length === 2 || gameState.flipped.includes(index) || gameState.matched.includes(index)) return;

    const newFlipped = [...gameState.flipped, index];
    setGameState({ ...gameState, flipped: newFlipped });

    if (newFlipped.length === 2) {
      setTimeout(() => {
        if (gameState.cards[newFlipped[0]] === gameState.cards[newFlipped[1]]) {
          const newMatched = [...gameState.matched, ...newFlipped];
          setGameState({ ...gameState, matched: newMatched, flipped: [] });

          if (newMatched.length === gameState.cards.length) {
            onComplete(game?.name || '');
            onClose();
          }
        } else {
          setGameState({ ...gameState, flipped: [] });
        }
      }, 1000);
    }
  };

  const startSpeedGame = () => {
    setGameState({ ...gameState, started: true, timeLeft: 10, clicks: 0 });
    const interval = setInterval(() => {
      setGameState((prev: any) => {
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          onComplete(game?.name || '');
          onClose();
          return prev;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  };

  const handleColorClick = (color: string) => {
    if (color === gameState.correctColor) {
      const newScore = gameState.score + 1;
      const newRound = gameState.round + 1;

      if (newRound > 5) {
        onComplete(game?.name || '');
        onClose();
      } else {
        setGameState({ ...gameState, score: newScore, round: newRound });
        setTimeout(generateColorRound, 500);
      }
    } else {
      toast({ title: 'Неправильно!', description: 'Попробуйте ещё раз', variant: 'destructive' });
    }
  };

  const moveCoin = () => {
    setGameState({
      ...gameState,
      score: gameState.score + 1,
      coinPosition: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
    });

    if (gameState.score + 1 >= 10) {
      onComplete(game?.name || '');
      onClose();
    }
  };

  if (!game) return null;

  return (
    <Dialog open={!!gameId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Icon name={game.icon as any} size={28} />
            {game.name}
          </DialogTitle>
          <DialogDescription>Завершите игру и получите 0.10 INCOIN!</DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {gameId === 'clicker' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{gameState.clicks} / {gameState.target}</div>
                <Progress value={gameState.progress} className="mb-4" />
              </div>
              <Button onClick={handleClickerClick} className="w-full h-32 text-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105 transition-all">
                Кликай! 🎯
              </Button>
            </div>
          )}

          {gameId === 'guess' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold mb-2">Угадайте число от 1 до 100</div>
                <div className="text-sm text-muted-foreground">Попыток: {gameState.attempts}</div>
                {gameState.hint && <div className="text-xl font-bold text-primary mt-2">{gameState.hint}</div>}
              </div>
              <Input
                type="number"
                value={gameState.guess}
                onChange={(e) => setGameState({ ...gameState, guess: e.target.value })}
                placeholder="Введите число"
                className="text-center text-xl"
                onKeyDown={(e) => e.key === 'Enter' && handleGuessSubmit()}
              />
              <Button onClick={handleGuessSubmit} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500">
                Проверить
              </Button>
            </div>
          )}

          {gameId === 'memory' && (
            <div className="grid grid-cols-4 gap-3">
              {gameState.cards?.map((card: string, index: number) => (
                <Button
                  key={index}
                  onClick={() => handleMemoryClick(index)}
                  className={`h-20 text-4xl ${
                    gameState.flipped.includes(index) || gameState.matched.includes(index)
                      ? 'bg-gradient-to-r from-orange-500 to-red-500'
                      : 'bg-muted'
                  }`}
                >
                  {gameState.flipped.includes(index) || gameState.matched.includes(index) ? card : '?'}
                </Button>
              ))}
            </div>
          )}

          {gameId === 'speed' && (
            <div className="space-y-4">
              {!gameState.started ? (
                <Button onClick={startSpeedGame} className="w-full h-32 text-2xl bg-gradient-to-r from-yellow-500 to-orange-500">
                  Старт! ⚡
                </Button>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">Время: {gameState.timeLeft}с</div>
                    <div className="text-2xl">Кликов: {gameState.clicks}</div>
                  </div>
                  <Button
                    onClick={() => setGameState({ ...gameState, clicks: gameState.clicks + 1 })}
                    className="w-full h-32 text-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:scale-105 transition-all"
                  >
                    КЛИК! 💥
                  </Button>
                </>
              )}
            </div>
          )}

          {gameId === 'color' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold">Раунд {gameState.round} / 5</div>
                <div className="text-sm text-muted-foreground">Найдите цвет: {gameState.correctColor.replace('bg-', '').replace('-500', '')}</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {gameState.options?.map((color: string, index: number) => (
                  <Button
                    key={index}
                    onClick={() => handleColorClick(color)}
                    className={`h-24 ${color} hover:opacity-80 transition-all`}
                  />
                ))}
              </div>
            </div>
          )}

          {gameId === 'catch' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold">Собрано: {gameState.score} / 10</div>
              </div>
              <div className="relative w-full h-96 bg-muted/50 rounded-lg overflow-hidden">
                {gameState.coinPosition && (
                  <button
                    onClick={moveCoin}
                    className="absolute w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-3xl transition-all hover:scale-110 cursor-pointer"
                    style={{ left: `${gameState.coinPosition.x}%`, top: `${gameState.coinPosition.y}%` }}
                  >
                    🪙
                  </button>
                )}
              </div>
            </div>
          )}

          {gameId === 'puzzle' && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="text-lg font-semibold">Соберите пазл по порядку (0-8)</div>
                <div className="text-sm text-muted-foreground">Ходов: {gameState.moves}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {gameState.tiles?.map((tile: number, index: number) => (
                  <Button
                    key={index}
                    onClick={() => {
                      const newTiles = [...gameState.tiles];
                      const emptyIndex = newTiles.indexOf(8);
                      const canSwap = 
                        (Math.abs(index - emptyIndex) === 1 && Math.floor(index / 3) === Math.floor(emptyIndex / 3)) ||
                        Math.abs(index - emptyIndex) === 3;
                      
                      if (canSwap) {
                        [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
                        setGameState({ ...gameState, tiles: newTiles, moves: gameState.moves + 1 });
                        
                        if (newTiles.every((t, i) => t === i)) {
                          onComplete(game?.name || '');
                          onClose();
                        }
                      }
                    }}
                    className={`h-24 text-3xl font-bold ${
                      tile === 8 ? 'bg-muted opacity-50' : 'bg-gradient-to-r from-violet-500 to-purple-500'
                    }`}
                  >
                    {tile === 8 ? '' : tile}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {gameId === 'reaction' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold mb-2">Тест реакции - Попытка {gameState.attempt}/3</div>
                <div className="text-sm text-muted-foreground">
                  {gameState.waiting ? 'Ждите зелёного сигнала...' : 'Кликните как можно быстрее!'}
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!gameState.waiting && gameState.startTime > 0) {
                    const reactionTime = Date.now() - gameState.startTime;
                    
                    if (gameState.attempt >= 3) {
                      onComplete(game?.name || '');
                      onClose();
                    } else {
                      setGameState({ waiting: true, startTime: 0, reactionTime, attempt: gameState.attempt + 1 });
                      setTimeout(() => setGameState((prev: any) => ({ ...prev, waiting: false, startTime: Date.now() })), Math.random() * 3000 + 2000);
                    }
                  }
                }}
                className={`w-full h-48 text-3xl font-bold transition-all ${
                  gameState.waiting 
                    ? 'bg-red-500 cursor-not-allowed' 
                    : 'bg-green-500 hover:scale-105 animate-pulse'
                }`}
                disabled={gameState.waiting}
              >
                {gameState.waiting ? '🔴 ЖДИТЕ' : '🟢 КЛИК!'}
              </Button>
              {gameState.reactionTime > 0 && (
                <div className="text-center text-xl font-bold text-primary">
                  {gameState.reactionTime}мс
                </div>
              )}
            </div>
          )}

          {gameId === 'math' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold">Раунд {gameState.round} / 5</div>
                <div className="text-4xl font-bold my-4">{gameState.question} = ?</div>
                <div className="text-sm text-muted-foreground">Счёт: {gameState.score}</div>
              </div>
              <Input
                type="number"
                value={gameState.userAnswer}
                onChange={(e) => setGameState({ ...gameState, userAnswer: e.target.value })}
                placeholder="Ваш ответ"
                className="text-center text-2xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (parseInt(gameState.userAnswer) === gameState.answer) {
                      const newScore = gameState.score + 1;
                      const newRound = gameState.round + 1;
                      
                      if (newRound > 5) {
                        onComplete(game?.name || '');
                        onClose();
                      } else {
                        const generateMath = () => {
                          const a = Math.floor(Math.random() * 20) + 1;
                          const b = Math.floor(Math.random() * 20) + 1;
                          const ops = ['+', '-', '*'];
                          const op = ops[Math.floor(Math.random() * ops.length)];
                          let answer = 0;
                          if (op === '+') answer = a + b;
                          else if (op === '-') answer = a - b;
                          else answer = a * b;
                          return { question: `${a} ${op} ${b}`, answer };
                        };
                        const mathQ = generateMath();
                        setGameState({ ...mathQ, userAnswer: '', score: newScore, round: newRound });
                      }
                    } else {
                      toast({ title: 'Неправильно!', description: 'Попробуйте ещё раз', variant: 'destructive' });
                    }
                  }
                }}
              />
              <Button 
                onClick={() => {
                  if (parseInt(gameState.userAnswer) === gameState.answer) {
                    const newScore = gameState.score + 1;
                    const newRound = gameState.round + 1;
                    
                    if (newRound > 5) {
                      onComplete(game?.name || '');
                      onClose();
                    } else {
                      const generateMath = () => {
                        const a = Math.floor(Math.random() * 20) + 1;
                        const b = Math.floor(Math.random() * 20) + 1;
                        const ops = ['+', '-', '*'];
                        const op = ops[Math.floor(Math.random() * ops.length)];
                        let answer = 0;
                        if (op === '+') answer = a + b;
                        else if (op === '-') answer = a - b;
                        else answer = a * b;
                        return { question: `${a} ${op} ${b}`, answer };
                      };
                      const mathQ = generateMath();
                      setGameState({ ...mathQ, userAnswer: '', score: newScore, round: newRound });
                    }
                  } else {
                    toast({ title: 'Неправильно!', description: 'Попробуйте ещё раз', variant: 'destructive' });
                  }
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                Проверить
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}