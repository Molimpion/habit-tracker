const state = {
  habits: [],
  filters: {
    search: '',
    category: 'Todas',
    status: 'all',
  },
};

const elements = {
  todayDateDisplay: document.getElementById('todayDateDisplay'),
  statCompletedToday: document.getElementById('statCompletedToday'),
  statProgressBar: document.getElementById('statProgressBar'),
  statCompletionRate: document.getElementById('statCompletionRate'),
  statActiveStreak: document.getElementById('statActiveStreak'),
  statBestStreak: document.getElementById('statBestStreak'),
  statTotalCheckins: document.getElementById('statTotalCheckins'),
  habitForm: document.getElementById('habitForm'),
  formHeading: document.getElementById('formHeading'),
  habitIdInput: document.getElementById('habitIdInput'),
  titleInput: document.getElementById('titleInput'),
  descriptionInput: document.getElementById('descriptionInput'),
  categoryInput: document.getElementById('categoryInput'),
  targetDaysInput: document.getElementById('targetDaysInput'),
  formFeedback: document.getElementById('formFeedback'),
  submitBtn: document.getElementById('submitBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  searchFilter: document.getElementById('searchFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  statusFilter: document.getElementById('statusFilter'),
  habitsListContainer: document.getElementById('habitsListContainer'),
  appVersion: document.getElementById('appVersion'),
};

function showFeedback(message, isError = true) {
  elements.formFeedback.textContent = message;
  elements.formFeedback.className = `form-feedback ${isError ? 'error' : ''}`;
  elements.formFeedback.hidden = false;
}

function clearFeedback() {
  elements.formFeedback.hidden = true;
  elements.formFeedback.textContent = '';
}

async function fetchDashboardAndHabits() {
  const params = new URLSearchParams();
  if (state.filters.category && state.filters.category !== 'Todas') {
    params.set('category', state.filters.category);
  }
  if (state.filters.status && state.filters.status !== 'all') {
    params.set('status', state.filters.status);
  }
  if (state.filters.search) {
    params.set('search', state.filters.search);
  }

  const [statsRes, habitsRes] = await Promise.all([
    fetch('/api/habits/stats'),
    fetch(`/api/habits?${params.toString()}`),
  ]);

  const stats = await statsRes.json();
  const habits = await habitsRes.json();

  state.habits = habits;
  renderStats(stats);
  renderHabitsList(habits);
}

function formatDays(count) {
  return `${count} ${count === 1 ? 'dia' : 'dias'}`;
}

function formatLongDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#icon-${name}" /></svg>`;
}

function renderStats(stats) {
  elements.todayDateDisplay.textContent = formatLongDate(stats.date);
  elements.todayDateDisplay.setAttribute('datetime', stats.date);
  elements.statCompletedToday.textContent = `${stats.completedTodayCount} / ${stats.totalHabits}`;
  elements.statProgressBar.style.width = `${stats.completionRateToday}%`;
  elements.statCompletionRate.textContent = `${stats.completionRateToday}%`;
  elements.statActiveStreak.textContent = formatDays(stats.activeBestStreak);
  elements.statBestStreak.textContent = formatDays(stats.historicalBestStreak);
  elements.statTotalCheckins.textContent = stats.totalCheckIns;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHabitsList(habits) {
  if (!habits || habits.length === 0) {
    elements.habitsListContainer.innerHTML = `
      <li class="empty">Nenhum hábito encontrado para os filtros selecionados.</li>
    `;
    return;
  }

  elements.habitsListContainer.innerHTML = habits
    .map((habit) => {
      const id = escapeHtml(habit.id);
      const title = escapeHtml(habit.title);
      const checkLabel = habit.completedToday
        ? `Desmarcar ${title} como concluído hoje`
        : `Marcar ${title} como concluído hoje`;
      return `
      <li class="habit ${habit.completedToday ? 'done' : ''}" data-id="${id}">
        <button class="check" data-action="checkin" data-id="${id}" aria-pressed="${habit.completedToday}" aria-label="${checkLabel}">
          ${icon('check')}
        </button>
        <div class="habit-body">
          <span class="habit-title">${title}</span>
          <div class="habit-sub">
            <span class="chip">${escapeHtml(habit.category)}</span>
            <span>${habit.targetDaysPerWeek}x por semana</span>
            ${habit.description ? `<span class="habit-desc">${escapeHtml(habit.description)}</span>` : ''}
          </div>
        </div>
        <div class="streaks">
          <span class="streak ${habit.currentStreak > 0 ? 'active' : ''}" title="Ofensiva atual">
            ${icon('flame')} ${formatDays(habit.currentStreak)}
          </span>
          <span class="streak" title="Recorde (${habit.completedDates.length} check-ins no total)">
            ${icon('trophy')} ${formatDays(habit.bestStreak)}
          </span>
        </div>
        <div class="row-actions">
          <button class="icon-btn" data-action="edit" data-id="${id}" aria-label="Editar ${title}" title="Editar">
            ${icon('edit')}
          </button>
          <button class="icon-btn danger" data-action="delete" data-id="${id}" aria-label="Excluir ${title}" title="Excluir">
            ${icon('trash')}
          </button>
        </div>
      </li>
    `;
    })
    .join('');
}

function resetFormMode() {
  elements.habitForm.reset();
  elements.habitIdInput.value = '';
  elements.targetDaysInput.value = '5';
  elements.formHeading.textContent = 'Novo hábito';
  elements.submitBtn.textContent = 'Adicionar hábito';
  elements.cancelEditBtn.hidden = true;
  clearFeedback();
}

elements.habitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFeedback();

  const editingId = elements.habitIdInput.value;
  const payload = {
    title: elements.titleInput.value,
    description: elements.descriptionInput.value,
    category: elements.categoryInput.value,
    targetDaysPerWeek: Number(elements.targetDaysInput.value),
  };

  const url = editingId ? `/api/habits/${editingId}` : '/api/habits';
  const method = editingId ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    showFeedback(data.error || 'Não foi possível salvar o hábito.');
    return;
  }

  resetFormMode();
  await fetchDashboardAndHabits();
});

elements.cancelEditBtn.addEventListener('click', resetFormMode);

elements.habitsListContainer.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');

  if (action === 'checkin') {
    await fetch(`/api/habits/${id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    await fetchDashboardAndHabits();
  } else if (action === 'edit') {
    const habit = state.habits.find((h) => h.id === id);
    if (!habit) return;
    elements.habitIdInput.value = habit.id;
    elements.titleInput.value = habit.title;
    elements.descriptionInput.value = habit.description || '';
    elements.categoryInput.value = habit.category;
    elements.targetDaysInput.value = habit.targetDaysPerWeek;
    elements.formHeading.textContent = 'Editar hábito';
    elements.submitBtn.textContent = 'Salvar alterações';
    elements.cancelEditBtn.hidden = false;
    elements.titleInput.focus();
  } else if (action === 'delete') {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    if (elements.habitIdInput.value === id) {
      resetFormMode();
    }
    await fetchDashboardAndHabits();
  }
});

elements.searchFilter.addEventListener('input', (e) => {
  state.filters.search = e.target.value;
  fetchDashboardAndHabits();
});

elements.categoryFilter.addEventListener('change', (e) => {
  state.filters.category = e.target.value;
  fetchDashboardAndHabits();
});

elements.statusFilter.addEventListener('change', (e) => {
  state.filters.status = e.target.value;
  fetchDashboardAndHabits();
});

async function loadVersion() {
  const response = await fetch('/api/health');
  const { version } = await response.json();
  elements.appVersion.textContent = `v${version}`;
}

fetchDashboardAndHabits();
loadVersion();
