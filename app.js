(function(){
  'use strict';

  const REM_KEY = 'spur-reminders';
  const THEME_KEY = 'spur-theme';
  const PILLAR_KEY = 'spur-pillars';

  function load(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch(e){ return fallback; }
  }
  function save(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
  }

  let reminders = load(REM_KEY, []);

  const ICONS = {
    dumbbell: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M4 9l1-1 2 2-1 1zM17 14l1-1 2 2-1 1zM4.5 13.5l-2 2 2 2 2-2zM17.5 10.5l2-2-2-2-2 2zM14 4l-1 1 2 2 1-1z"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 2.5s6 7 6 11.5a6 6 0 11-12 0c0-4.5 6-11.5 6-11.5z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22.5zM4 4.5v18"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h8l-1 8 10-12h-8z"/></svg>',
    brain: '<svg viewBox="0 0 24 24"><path d="M9.5 3A3.5 3.5 0 006 6.5v.3A3.5 3.5 0 004.5 13a3.5 3.5 0 003 3.46V18a3 3 0 003 3M14.5 3A3.5 3.5 0 0118 6.5v.3A3.5 3.5 0 0119.5 13a3.5 3.5 0 01-3 3.46V18a3 3 0 01-3 3M9 8h.01M15 8h.01M9 14h.01M15 14h.01"/></svg>',
    coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5"/></svg>',
    ship: '<svg viewBox="0 0 24 24"><path d="M12 2v12m0 0l-4-4m4 4l4-4M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3"/></svg>'
  };

  const PILLARS = {
    body: {
      label: 'Body',
      habits: [
        { id:'gym',     icon:'dumbbell', label:'Workout / Gym',           color:'#FF3B30' },
        { id:'water',   icon:'drop',     label:'Drink 8 glasses of water', color:'#00C7BE' },
        { id:'journal', icon:'book',     label:'Journal how body feels',   color:'#AF52DE' }
      ]
    },
    craft: {
      label: 'Craft',
      habits: [
        { id:'deep',  icon:'bolt',  label:'Deep work block', color:'#5856D6' },
        { id:'learn', icon:'brain', label:'Learn something', color:'#007AFF' },
        { id:'money', icon:'coin',  label:'Track spending',  color:'#34C759' },
        { id:'ship',  icon:'ship',  label:'Ship something',  color:'#FF9500' }
      ]
    }
  };

  let pillars = load(PILLAR_KEY, null);
  if (!pillars){
    pillars = {};
    Object.keys(PILLARS).forEach(id => {
      pillars[id] = { habits: PILLARS[id].habits, days: {} };
    });
    save(PILLAR_KEY, pillars);
  }

  function todayKey(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function dateKeyOffset(offset){
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function shortDay(dateStr){
    const d = new Date(dateStr + 'T12:00:00');
    return ['S','M','T','W','T','F','S'][d.getDay()];
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }
  function formatTime(t){
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  function vibrate(ms){ if (navigator.vibrate) navigator.vibrate(ms); }

  function countUp(el, target, suffix){
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    if (start === target){ el.textContent = target + (suffix || ''); return; }
    const steps = 14;
    let i = 0;
    const diff = target - start;
    const t = setInterval(() => {
      i++;
      const v = Math.round(start + (diff * (i / steps)));
      el.textContent = v + (suffix || '');
      if (i >= steps){ clearInterval(t); el.textContent = target + (suffix || ''); }
    }, 22);
  }

  const navItems = document.querySelectorAll('.tab, .sidebar-item');
  const screens = document.querySelectorAll('.screen');
  const navTitle = document.getElementById('navTitle');
  const navAdd = document.getElementById('navAdd');
  const screensEl = document.getElementById('screens');
  const titles = { today:'Today', body:'Body', craft:'Craft', activity:'Activity', settings:'Settings' };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const t = item.dataset.screen;
      if (!t) return;
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.screen === t));
      document.querySelectorAll('.sidebar-item').forEach(x => x.classList.toggle('active', x.dataset.screen === t));
      screens.forEach(s => s.classList.toggle('active', s.id === 'screen-' + t));
      if (navTitle){
        navTitle.textContent = titles[t] || 'Spur';
        navTitle.classList.remove('visible');
      }
      if (navAdd) navAdd.style.visibility = (t === 'today') ? 'visible' : 'hidden';
      if (screensEl) screensEl.scrollTop = 0;
      vibrate(5);
    });
  });

  if (screensEl && navTitle){
    screensEl.addEventListener('scroll', () => {
      navTitle.classList.toggle('visible', screensEl.scrollTop > 40);
    }, { passive:true });
  }

  function getDay(pillarId, key){
    const p = pillars[pillarId];
    if (!p.days[key]) p.days[key] = { done: [], journal: '' };
    if (!p.days[key].done) p.days[key].done = [];
    if (typeof p.days[key].journal !== 'string') p.days[key].journal = '';
    return p.days[key];
  }

  function computeStreak(pillarId){
    const p = pillars[pillarId];
    const total = p.habits.length;
    let streak = 0, misses = 0;
    for (let i = 0; i < 365; i++){
      const key = dateKeyOffset(-i);
      const day = p.days[key];
      const isDone = day && day.done && day.done.length === total;
      if (isDone){
        if (misses >= 2) break;
        streak++;
        misses = 0;
      } else {
        if (i === 0) continue;
        misses++;
        if (misses >= 2) break;
      }
    }
    return streak;
  }

  function toggleHabit(pillarId, habitId){
    const key = todayKey();
    const day = getDay(pillarId, key);
    const idx = day.done.indexOf(habitId);
    if (idx === -1) day.done.push(habitId);
    else day.done.splice(idx, 1);
    save(PILLAR_KEY, pillars);
    renderPillar(pillarId);
    renderActivity();
    vibrate(10);
  }

  const RING_CIRC = 238.76;

  function renderPillar(pillarId){
    const p = pillars[pillarId];
    const key = todayKey();
    const day = getDay(pillarId, key);
    const total = p.habits.length;
    const doneCount = day.done.length;
    const pct = total === 0 ? 0 : doneCount / total;

    const prefix = pillarId;
    const ring = document.getElementById(prefix + 'Ring');
    const ringLabel = document.getElementById(prefix + 'RingLabel');
    const heroNumber = document.getElementById(prefix + 'HeroNumber');
    const streakEl = document.getElementById(prefix + 'Streak');
    const weekEl = document.getElementById(prefix + 'Week');
    const habitsEl = document.getElementById(prefix + 'Habits');
    const journalEl = document.getElementById(prefix + 'Journal');
    const journalDate = document.getElementById(prefix + 'JournalDate');

    if (ring) ring.setAttribute('stroke-dashoffset', String(RING_CIRC * (1 - pct)));
    if (ringLabel) ringLabel.textContent = Math.round(pct * 100) + '%';
    if (heroNumber) heroNumber.textContent = `${doneCount} of ${total}`;

    const streak = computeStreak(pillarId);
    if (streakEl){
      const span = streakEl.querySelector('span');
      const txt = streak === 0 ? 'Start your streak today' : `${streak} day streak`;
      if (span) span.textContent = txt;
      else streakEl.textContent = txt;
    }

    if (journalDate){
      const d = new Date();
      journalDate.textContent = d.toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
    }

    if (weekEl){
      weekEl.innerHTML = '';
      for (let i = 6; i >= 0; i--){
        const k = dateKeyOffset(-i);
        const d = p.days[k];
        const done = d && d.done && d.done.length === total;
        const partial = d && d.done && d.done.length > 0 && !done;
        const cell = document.createElement('div');
        cell.className = 'day';
        if (i === 0) cell.classList.add('today');
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (done) dot.classList.add('done');
        else if (partial) dot.classList.add('partial');
        dot.textContent = done ? '✓' : (partial ? '·' : '');
        const label = document.createElement('div');
        label.className = 'day-label';
        label.textContent = shortDay(k);
        cell.appendChild(dot);
        cell.appendChild(label);
        weekEl.appendChild(cell);
      }
    }

    if (habitsEl){
      habitsEl.innerHTML = '';
      p.habits.forEach(h => {
        const isDone = day.done.includes(h.id);
        const btn = document.createElement('button');
        btn.className = 'row';
        btn.innerHTML = `
          <div class="row-icon" style="background:${h.color}">${ICONS[h.icon] || ICONS.bolt}</div>
          <div class="row-body">
            <div class="row-title" style="${isDone ? 'color:var(--text-2)' : ''}">${escapeHtml(h.label)}</div>
          </div>
          <div class="check ${isDone ? 'done' : ''}"></div>
        `;
        btn.querySelector('.check').addEventListener('click', (e) => {
          e.stopPropagation();
          toggleHabit(pillarId, h.id);
        });
        btn.addEventListener('click', () => toggleHabit(pillarId, h.id));
        habitsEl.appendChild(btn);
      });
    }

    if (journalEl && document.activeElement !== journalEl){
      journalEl.value = day.journal || '';
    }
  }

  const bodyStreakStat = document.getElementById('bodyStreakStat');
  const craftStreakStat = document.getElementById('craftStreakStat');
  const bodyChart = document.getElementById('bodyChart');
  const craftChart = document.getElementById('craftChart');
  const journalHistory = document.getElementById('journalHistory');

  function renderActivity(){
    countUp(bodyStreakStat, computeStreak('body'));
    countUp(craftStreakStat, computeStreak('craft'));

    [['body', bodyChart], ['craft', craftChart]].forEach(([id, chartEl]) => {
      if (!chartEl) return;
      const p = pillars[id];
      const total = p.habits.length;
      chartEl.innerHTML = '';
      for (let i = 6; i >= 0; i--){
        const k = dateKeyOffset(-i);
        const d = p.days[k];
        const pct = d && d.done ? d.done.length / total : 0;
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = Math.max(5, pct * 100) + '%';
        bar.innerHTML = `<span>${shortDay(k)}</span>`;
        chartEl.appendChild(bar);
      }
    });

    if (journalHistory){
      journalHistory.innerHTML = '';
      const entries = [];
      Object.keys(pillars).forEach(pid => {
        const p = pillars[pid];
        Object.keys(p.days).forEach(k => {
          const j = p.days[k].journal;
          if (j && j.trim()){
            entries.push({ pillar: pid, date: k, text: j.trim() });
          }
        });
      });
      entries.sort((a, b) => b.date.localeCompare(a.date));

      if (entries.length === 0){
        journalHistory.innerHTML = `<div class="row"><div class="row-body"><div class="row-title" style="color:var(--text-2);font-weight:400">No journal entries yet</div></div></div>`;
      } else {
        entries.slice(0, 10).forEach(e => {
          const row = document.createElement('div');
          row.className = 'row';
          const d = new Date(e.date + 'T12:00:00');
          const label = d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
          const pillLabel = PILLARS[e.pillar] ? PILLARS[e.pillar].label : e.pillar;
          row.innerHTML = `
            <div class="row-body">
              <div class="row-title">${escapeHtml(e.text)}</div>
              <div class="row-sub">${pillLabel} · ${label}</div>
            </div>
          `;
          journalHistory.appendChild(row);
        });
      }
    }
  }

  ['body', 'craft'].forEach(pid => {
    const el = document.getElementById(pid + 'Journal');
    const savedEl = document.getElementById(pid + 'JournalSaved');
    if (!el) return;
    let timer = null;
    el.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const key = todayKey();
        getDay(pid, key).journal = el.value;
        save(PILLAR_KEY, pillars);
        if (savedEl){
          savedEl.textContent = 'Saved';
          setTimeout(() => { savedEl.textContent = ''; }, 1500);
        }
        renderActivity();
      }, 400);
    });
  });

  const listEl = document.getElementById('remindersList');
  const emptyReminders = document.getElementById('emptyReminders');
  const todayBadge = document.getElementById('todayBadge');
  const sidebarBadge = document.getElementById('sidebarBadge');

  function renderReminders(){
    if (!listEl) return;
    listEl.innerHTML = '';

    if (reminders.length === 0){
      if (emptyReminders) emptyReminders.style.display = 'block';
    } else {
      if (emptyReminders) emptyReminders.style.display = 'none';
      reminders.forEach(r => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
          <div class="row-body">
            <div class="row-title" style="${r.done ? 'color:var(--text-2);text-decoration:line-through' : ''}">${escapeHtml(r.title)}</div>
            <div class="row-sub">${formatTime(r.time)} · ${r.repeat}</div>
          </div>
          <div class="check ${r.done ? 'done' : ''}"></div>
        `;
        const check = row.querySelector('.check');
        check.addEventListener('click', (e) => {
          e.stopPropagation();
          r.done = !r.done;
          save(REM_KEY, reminders);
          renderReminders();
          vibrate(8);
        });

        let startX = 0, currentX = 0, swiping = false;
        row.addEventListener('touchstart', (e) => {
          startX = e.touches[0].clientX;
          currentX = 0; swiping = true;
          row.style.transition = 'none';
        }, { passive:true });
        row.addEventListener('touchmove', (e) => {
          if (!swiping) return;
          currentX = e.touches[0].clientX - startX;
          if (currentX < 0 && currentX > -90) row.style.transform = `translateX(${currentX}px)`;
          else if (currentX <= -90) row.style.transform = 'translateX(-90px)';
        }, { passive:true });
        row.addEventListener('touchend', () => {
          swiping = false;
          row.style.transition = 'transform .25s ease';
          if (currentX < -45) row.style.transform = 'translateX(-90px)';
          else row.style.transform = 'translateX(0)';
        });
        row.addEventListener('click', () => {
          if (currentX !== 0){ row.style.transform = 'translateX(0)'; currentX = 0; }
        });

        listEl.appendChild(row);
      });
    }

    const total = reminders.length;
    const done = reminders.filter(r => r.done).length;
    const pending = total - done;
    [todayBadge, sidebarBadge].forEach(b => {
      if (!b) return;
      if (pending > 0){
        b.textContent = pending;
        b.style.display = 'inline-block';
      } else {
        b.style.display = 'none';
      }
    });
  }

  const sheet = document.getElementById('addSheet');
  const overlay = document.getElementById('overlay');
  const titleInput = document.getElementById('reminderTitle');
  const timeInput = document.getElementById('reminderTime');
  let selectedRepeat = 'Once';

  function openSheet(){
    if (sheet) sheet.classList.add('active');
    if (overlay) overlay.classList.add('active');
    if (titleInput) titleInput.value = '';
    if (timeInput) timeInput.value = '09:00';
    selectedRepeat = 'Once';
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('selected', c.dataset.repeat === 'Once'));
    setTimeout(() => titleInput && titleInput.focus(), 350);
    vibrate(5);
  }
  function closeSheet(){
    if (sheet) sheet.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }

  if (navAdd) navAdd.addEventListener('click', openSheet);
  if (overlay) overlay.addEventListener('click', closeSheet);
  const cancelBtn = document.getElementById('cancelSheet');
  if (cancelBtn) cancelBtn.addEventListener('click', closeSheet);

  document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedRepeat = btn.dataset.repeat;
      vibrate(5);
    });
  });

  const saveBtn = document.getElementById('saveReminder');
  if (saveBtn){
    saveBtn.addEventListener('click', () => {
      const title = (titleInput && titleInput.value.trim()) || 'Untitled';
      const time = (timeInput && timeInput.value) || '09:00';
      reminders.push({
        id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
        title, time, repeat: selectedRepeat,
        done: false, createdAt: Date.now()
      });
      save(REM_KEY, reminders);
      renderReminders();
      closeSheet();
      vibrate(15);
    });
  }

  const darkToggle = document.getElementById('darkToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch(e){}

  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    if (darkToggle) darkToggle.checked = (t === 'dark');
    try { localStorage.setItem(THEME_KEY, t); } catch(e){}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#000000' : '#F2F2F7');
  }
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  if (darkToggle){
    darkToggle.addEventListener('change', () => {
      applyTheme(darkToggle.checked ? 'dark' : 'light');
      vibrate(8);
    });
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn){
    exportBtn.addEventListener('click', () => {
      const data = JSON.stringify({ reminders, pillars, exportedAt: new Date().toISOString() }, null, 2);
      if (navigator.clipboard){
        navigator.clipboard.writeText(data)
          .then(() => alert('Data copied to clipboard'))
          .catch(() => prompt('Copy your data:', data));
      } else {
        prompt('Copy your data:', data);
      }
      vibrate(8);
    });
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn){
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all Spur data? This cannot be undone.')){
        reminders = [];
        pillars = {};
        Object.keys(PILLARS).forEach(id => {
          pillars[id] = { habits: PILLARS[id].habits, days: {} };
        });
        save(REM_KEY, reminders);
        save(PILLAR_KEY, pillars);
        renderReminders();
        renderPillar('body');
        renderPillar('craft');
        renderActivity();
        vibrate(20);
      }
    });
  }

  if ('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  renderReminders();
  renderPillar('body');
  renderPillar('craft');
  renderActivity();

  console.log('%cSpur v0.6','color:#5856D6;font-weight:600;font-size:14px');
})();
