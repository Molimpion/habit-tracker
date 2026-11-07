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

function renderStats(stats) {
  elements.todayDateDisplay.textContent = `📅 Hoje: ${stats.date}`;
  elements.statCompletedToday.textContent = `${stats.completedTodayCount} / ${stats.totalHabits}`;
  elements.statProgressBar.style.width = `${stats.completionRateToday}%`;
  elements.statCompletionRate.textContent = `${stats.completionRateToday}%`;
  elements.statActiveStreak.textContent = `🔥 ${stats.activeBestStreak} dias`;
  elements.statBestStreak.textContent = `🏆 ${stats.historicalBestStreak} dias`;
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
      <div class="empty-state">
        <p>Nenhum hábito encontrado para os filtros selecionados.</p>
      </div>
    `;
    return;
  }

  elements.habitsListContainer.innerHTML = habits
    .map(
      (habit) => `
      <article class="habit-card ${habit.completedToday ? 'completed' : ''}" data-id="${escapeHtml(habit.id)}">
        <div class="habit-info">
          <div class="habit-top">
            <span class="habit-title">${escapeHtml(habit.title)}</span>
            <span class="badge">${escapeHtml(habit.category)}</span>
            <span class="badge">Meta: ${habit.targetDaysPerWeek}x/sem</span>
          </div>
          ${
            habit.description
              ? `<p class="habit-desc">${escapeHtml(habit.description)}</p>`
              : ''
          }
          <div class="habit-meta">
            <span>🔥 Ofensiva atual: <strong>${habit.currentStreak} dias</strong></span>
            <span>🏆 Recorde: <strong>${habit.bestStreak} dias</strong></span>
            <span>✅ Total cumprido: ${habit.completedDates.length}d</span>
          </div>
        </div>
        <div class="habit-actions">
          <button class="btn-checkin ${habit.completedToday ? 'done' : ''}" data-action="checkin" data-id="${escapeHtml(habit.id)}">
            ${habit.completedToday ? '✓ Concluído Hoje' : 'Marcar Hoje'}
          </button>
          <button class="btn-icon" data-action="edit" data-id="${escapeHtml(habit.id)}" title="Editar Hábito">
            Editar
          </button>
          <button class="btn-icon delete" data-action="delete" data-id="${escapeHtml(habit.id)}" title="Excluir Hábito">
            Excluir
          </button>
        </div>
      </article>
    `
    )
    .join('');
}

function resetFormMode() {
  elements.habitForm.reset();
  elements.habitIdInput.value = '';
  elements.targetDaysInput.value = '5';
  elements.formHeading.textContent = 'Novo Hábito';
  elements.submitBtn.textContent = '+ Adicionar Hábito';
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
    elements.formHeading.textContent = 'Editar Hábito';
    elements.submitBtn.textContent = 'Salvar Alterações';
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

fetchDashboardAndHabits();
