import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { metroLines } from './data/metroData';
import './App.css';

const metroFacts = {
  0: ["Первый проект в 1902 году", "Начало стройки в 1931", "Работали вручную, лопатами"],
  1: ["Открытие 15 мая 1935", "11 станций, 13 км", "Билет стоил 50 копеек"],
  2: ["217 детей родилось в метро", "Бомбоубежище для тысяч", "1 день простоя (16.10.1941)"],
  3: ["Мозаики из блокадного Ленинграда", "76 бронзовых скульптур", "Кроссовки на фреске «Сенокос»"],
  4: ["Борьба с излишествами", "Первая АЛС в мире", "Станции-сороконожки"],
  5: ["МЦК запущен в 2018", "Вагоны с кондиционерами", "Система ГЛОНАСС"],
  6: ["265 станций, 460 км", "9 млн пассажиров в день", "500 котов-сотрудников"]
};

function App() {
  const [data, setData] = useState(metroLines);
  const [selectedLine, setSelectedLine] = useState(null);
  const [showLineStats, setShowLineStats] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [activeTab, setActiveTab] = useState('main');
  const [historyStep, setHistoryStep] = useState(0);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // ЗАГРУЗКА ИЗ CLOUD STORAGE
  useEffect(() => {
    try {
      if (WebApp && WebApp.ready) {
        WebApp.ready();
        WebApp.expand();

        WebApp.CloudStorage.getItem('metro_progress', (err, value) => {
          if (!err && value) {
            const savedIds = JSON.parse(value);
            setData(prevData => prevData.map(line => ({
              ...line,
              stations: line.stations.map(s => ({
                ...s,
                isVisited: savedIds.includes(s.id)
              }))
            })));
          }
        });
      }
    } catch (e) { console.error(e); }
  }, []);

  // СОХРАНЕНИЕ В CLOUD STORAGE
  const saveProgress = (newData) => {
    const visitedIds = newData.flatMap(line => 
      line.stations.filter(s => s.isVisited).map(s => s.id)
    );
    WebApp.CloudStorage.setItem('metro_progress', JSON.stringify(visitedIds));
  };

  const toggleStation = (lineId, stationId, stationName, currentlyVisited) => {
    const action = () => {
      const newData = data.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            stations: line.stations.map(station => 
              station.id === stationId ? { ...station, isVisited: !station.isVisited } : station
            )
          };
        }
        return line;
      });
      setData(newData);
      saveProgress(newData);
      if (selectedLine?.id === lineId) setSelectedLine(newData.find(l => l.id === lineId));
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
    };

    if (notificationsEnabled) {
      WebApp.showConfirm(
        currentlyVisited ? `Убрать отметку со станции ${stationName}?` : `Отметить станцию ${stationName}?`,
        (confirmed) => { if (confirmed) action(); }
      );
    } else {
      action();
    }
  };

  const resetAllProgress = () => {
    WebApp.showConfirm("Вы уверены, что хотите сбросить весь прогресс?", (confirmed) => {
      if (confirmed) {
        const resetData = data.map(line => ({
          ...line,
          stations: line.stations.map(s => ({ ...s, isVisited: false }))
        }));
        setData(resetData);
        saveProgress(resetData);
        WebApp.showAlert("Прогресс обнулен");
      }
    });
  };

  const renderContent = () => {
    if (selectedStation) {
      return (
        <div className="station-info-overlay">
          <button className="close-button" onClick={() => setSelectedStation(null)}>✕</button>
          <div style={{ textAlign: 'center', width: '100%', marginBottom: '30px' }}>
            <h1 className="station-info-title">{selectedStation.name}</h1>
            <div style={{ color: '#FF3B30', fontSize: '18px', fontWeight: '800', marginTop: '8px' }}>ИНФОРМАЦИЯ</div>
          </div>
          <div className="info-cards-container">
            <div className="info-detail-card bg-gray">
              <div className="detail-icon">📅</div>
              <div className="detail-texts">
                <span className="detail-label">Год открытия</span>
                <span className="detail-value">{selectedStation.opened || '1935'}</span>
              </div>
            </div>
            <div className="info-detail-card bg-gray">
              <div className="detail-icon">⚓</div>
              <div className="detail-texts">
                <span className="detail-label">Глубина станции</span>
                <span className="detail-value">{selectedStation.depth || '8'} метров</span>
              </div>
            </div>
            <div className="info-detail-card bg-gray">
              <div className="detail-icon" style={{background: selectedLine.color, color: 'white', borderRadius: '8px', padding: '5px'}}>{selectedLine.number}</div>
              <div className="detail-texts">
                <span className="detail-label">Ветка метро</span>
                <span className="detail-value">{selectedLine.name}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedLine && showLineStats) {
      const visited = selectedLine.stations.filter(s => s.isVisited).length;
      const total = selectedLine.stations.length;
      return (
        <div className="line-stats-overlay">
          <button className="close-button" onClick={() => setShowLineStats(false)}>✕</button>
          <div className="line-badge" style={{ backgroundColor: selectedLine.color, margin: '20px auto' }}>{selectedLine.number}</div>
          <h1 className="stats-line-title">{selectedLine.name}</h1>
          <div className="stats-grid-mini">
             <div className="stat-box-small"><span>📏</span><p>Длина: {selectedLine.lenghtBranch} км</p></div>
             <div className="stat-box-small"><span>🕒</span><p>В пути: {selectedLine.fullTravelTime}</p></div>
          </div>
          <div className="progress-card-large">
             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                <span className="detail-label">Прогресс посещения</span>
                <span className="detail-value" style={{color: selectedLine.color}}>{Math.round((visited/total)*100)}%</span>
             </div>
             <div className="progress-bar-bg"><div className="progress-bar-fill" style={{width: `${(visited/total)*100}%`, background: selectedLine.color}} /></div>
          </div>
        </div>
      );
    }

    if (selectedLine) {
      return (
        <div className="container">
          <div className="line-header">
            <button className="back-button" onClick={() => setSelectedLine(null)}>❮</button>
            <div style={{flex: 1, textAlign: 'center'}}>
              <h2 className="line-title-top">{selectedLine.name}</h2>
              <div style={{fontSize: '12px', color: '#8E8E93'}}>🕒 {selectedLine.fullTravelTime}</div>
            </div>
            <div className="info-btn-header" style={{background: selectedLine.color}} onClick={() => setShowLineStats(true)}>i</div>
          </div>
          <div className="stations-list">
            {selectedLine.stations.map((s, i) => (
              <div key={s.id} className="station-card" style={{border: '1px solid rgba(255,255,255,0.1)'}}>
                <div className="station-number" style={{borderColor: selectedLine.color, color: selectedLine.color}}>{i + 1}</div>
                <div className="station-name-text">{s.name}</div>
                <div className="station-actions">
                  <div className="info-btn-small" onClick={() => setSelectedStation(s)}>i</div>
                  <button className="check-btn" onClick={() => toggleStation(selectedLine.id, s.id, s.name, s.isVisited)} style={{background: s.isVisited ? selectedLine.color : 'rgba(255,255,255,0.1)'}}>
                    {s.isVisited ? '✓' : '○'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    switch(activeTab) {
      case 'main':
        return (
          <div className="container">
            <header className="main-header" style={{textAlign: 'center', padding: '20px 0'}}>
                <h1 className="app-title" style={{color: '#FF3B30', margin: 0}}>Московское метро</h1>
                <p style={{fontSize: '14px', color: '#8E8E93'}}>Твой путь в подземелье</p>
            </header>
            <div className="lines-list">
              {data.map(line => (
                <div key={line.id} className="line-card" onClick={() => setSelectedLine(line)} style={{border: '1px solid rgba(255,255,255,0.1)'}}>
                  <div className="line-badge" style={{backgroundColor: line.color}}>{line.number}</div>
                  <div className="line-info">
                    <div className="line-name">{line.name}</div>
                    <div className="line-stats">🚇 {line.stations.length} ст. | 📏 {line.lenghtBranch} км</div>
                  </div>
                  <div className="chevron">❯</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'stats':
        const totalStations = data.reduce((acc, line) => acc + line.stations.length, 0);
        const totalVisited = data.reduce((acc, line) => acc + line.stations.filter(s => s.isVisited).length, 0);
        const totalProgress = Math.round((totalVisited / totalStations) * 100);
        return (
          <div className="container">
            <h1 className="app-title" style={{ color: '#FF3B30', textAlign: 'center', paddingTop: '20px' }}>Статистика</h1>
            <div className="stats-grid">
              <div className="stat-box" style={{ background: 'var(--tg-theme-secondary-bg-color)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="stat-icon-circle" style={{ background: '#007AFF' }}>#</div>
                <p className="stat-number">{totalStations}</p>
                <p className="stat-desc">Всего станций</p>
              </div>
              <div className="stat-box" style={{ background: 'var(--tg-theme-secondary-bg-color)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="stat-icon-circle" style={{ background: '#34C759' }}>✓</div>
                <p className="stat-number">{totalVisited}</p>
                <p className="stat-desc">Посещено</p>
              </div>
              <div className="stat-box" style={{ background: 'var(--tg-theme-secondary-bg-color)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="stat-icon-circle" style={{ background: '#FF9500' }}>◔</div>
                <p className="stat-number">{totalProgress}%</p>
                <p className="stat-desc">Прогресс</p>
              </div>
              <div className="stat-box" style={{ background: 'var(--tg-theme-secondary-bg-color)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="stat-icon-circle" style={{ background: '#FF3B30' }}>🚩</div>
                <p className="stat-number">{totalStations - totalVisited}</p>
                <p className="stat-desc">Осталось</p>
              </div>
            </div>
            <div className="progress-section-title" style={{ color: 'var(--tg-theme-text-color)' }}>
              <span>🗺️</span> Прогресс по веткам
            </div>
            <div className="lines-progress-list" style={{ paddingBottom: '100px' }}>
              {data.map(line => {
                const visited = line.stations.filter(s => s.isVisited).length;
                const total = line.stations.length;
                const pct = Math.round((visited / total) * 100);
                return (
                  <div key={line.id} className="line-progress-card" style={{ background: 'var(--tg-theme-secondary-bg-color)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="line-progress-info">
                      <div className="line-name-block"><div className="line-mini-badge" style={{ background: line.color }}></div><span style={{ fontWeight: '600', color: 'var(--tg-theme-text-color)' }}>{line.name}</span></div>
                      <span style={{ fontWeight: '800', color: 'var(--tg-theme-text-color)' }}>{visited}/{total}</span>
                    </div>
                    <div className="progress-bar-bg" style={{ background: 'rgba(255,255,255,0.05)' }}><div className="progress-bar-fill" style={{ width: `${pct}%`, background: line.color }}></div></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      
      case 'info':
        return (
          <div className="container">
            <h1 className="app-title" style={{ color: '#FF3B30', textAlign: 'center', paddingTop: '20px' }}>История метро</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
               {[...Array(7)].map((_, i) => (
                 <div key={i} style={{ width: historyStep === i ? '20px' : '6px', height: '6px', borderRadius: '3px', background: historyStep === i ? '#AF52DE' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }}></div>
               ))}
            </div>
            <div className="history-card" style={{ background: 'var(--tg-theme-secondary-bg-color)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '28px', padding: '24px', margin: '20px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: 'linear-gradient(135deg, #AF52DE, #663399)', width: '54px', height: '54px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>📜</div>
                <div>
                  <div style={{ fontWeight: '900', fontSize: '20px', color: 'var(--tg-theme-text-color)' }}>Период {historyStep + 1}</div>
                  <div style={{ fontSize: '13px', color: '#8E8E93' }}>Шаг {historyStep + 1} из 7</div>
                </div>
              </div>
              <div style={{ minHeight: '200px' }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {metroFacts[historyStep].map((f, i) => (
                    <li key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px', color: 'var(--tg-theme-text-color)', fontSize: '16px' }}>
                      <span style={{ color: '#FF3B30' }}>•</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button disabled={historyStep === 0} onClick={() => setHistoryStep(s => s - 1)} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: 'none', background: 'rgba(255,255,255,0.06)', color: 'white', fontWeight: '700' }}>❮ Назад</button>
                <button disabled={historyStep === 6} onClick={() => setHistoryStep(s => s + 1)} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: 'none', background: '#AF52DE', color: 'white', fontWeight: '700' }}>Далее ❯</button>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="container" style={{ paddingBottom: '120px' }}>
            <h1 className="app-title" style={{ color: '#FF3B30', textAlign: 'center', paddingTop: '20px' }}>Настройки</h1>
            
            <div style={{ padding: '0 18px', marginTop: '25px' }}>
              <div style={{ fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>Внешний вид</div>
              <div className="settings-item" onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: '20px', padding: '14px 18px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ background: '#AF52DE', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✨</div>
                <div style={{ marginLeft: '14px', flex: 1 }}><div style={{ fontWeight: '600' }}>Темная тема</div></div>
                <div style={{ width: '44px', height: '24px', background: isDarkMode ? '#34C759' : 'rgba(255,255,255,0.1)', borderRadius: '12px', transition: '0.3s', position: 'relative' }}>
                   <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', right: isDarkMode ? '2px' : '22px', top: '2px', transition: '0.3s' }}></div>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 18px', marginTop: '25px' }}>
              <div style={{ fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>Уведомления</div>
              <div className="settings-item" onClick={() => setNotificationsEnabled(!notificationsEnabled)} style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: '20px', padding: '14px 18px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ background: '#FF3B30', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</div>
                <div style={{ marginLeft: '14px', flex: 1 }}><div style={{ fontWeight: '600' }}>Подтверждение посещения</div></div>
                <div style={{ width: '44px', height: '24px', background: notificationsEnabled ? '#34C759' : 'rgba(255,255,255,0.1)', borderRadius: '12px', transition: '0.3s', position: 'relative' }}>
                   <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', right: notificationsEnabled ? '2px' : '22px', top: '2px', transition: '0.3s' }}></div>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 18px', marginTop: '25px' }}>
              <div style={{ fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>Данные</div>
              <div className="settings-item" onClick={resetAllProgress} style={{ background: 'var(--tg-theme-secondary-bg-color)', borderRadius: '20px', padding: '14px 18px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ background: '#FF9500', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</div>
                <div style={{ marginLeft: '14px', flex: 1 }}><div style={{ fontWeight: '600', color: '#FF3B30' }}>Сбросить все посещения</div></div>
                <div style={{ color: '#8E8E93' }}>❯</div>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className={`app-wrapper ${isDarkMode ? 'dark' : 'light'}`}>
      {renderContent()}
      <div className="tab-bar">
        <div className={`tab-item ${activeTab === 'main' ? 'active' : ''}`} onClick={() => {setActiveTab('main'); setSelectedLine(null);}}>
          <span className="tab-icon">🏠</span><span className="tab-label">Главная</span>
        </div>
        <div className={`tab-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => {setActiveTab('stats'); setSelectedLine(null);}}>
          <span className="tab-icon">📊</span><span className="tab-label">Статистика</span>
        </div>
        <div className={`tab-item ${activeTab === 'info' ? 'active' : ''}`} onClick={() => {setActiveTab('info'); setSelectedLine(null);}}>
          <span className="tab-icon">📖</span><span className="tab-label">История</span>
        </div>
        <div className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => {setActiveTab('settings'); setSelectedLine(null);}}>
          <span className="tab-icon">⚙️</span><span className="tab-label">Настройки</span>
        </div>
      </div>
    </div>
  );
}

export default App;