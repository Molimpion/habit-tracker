class LocalStorageStorage {
  constructor(webStorage, key) {
    this.webStorage = webStorage;
    this.key = key;
  }

  seedIfNew(habits) {
    if (this.webStorage.getItem(this.key) === null) {
      this._save(habits);
    }
  }

  list() {
    return this._load();
  }

  findById(id) {
    return this._load().find((h) => h.id === id) || null;
  }

  insert(habit) {
    this._save([...this._load(), habit]);
  }

  update(habit) {
    this._save(
      this._load().map((h) => (h.id === habit.id ? { ...habit, completedDates: h.completedDates } : h))
    );
  }

  remove(id) {
    this._save(this._load().filter((h) => h.id !== id));
  }

  addCheckIn(id, date) {
    this._updateDates(id, (dates) => (dates.includes(date) ? dates : [...dates, date].sort()));
  }

  removeCheckIn(id, date) {
    this._updateDates(id, (dates) => dates.filter((d) => d !== date));
  }

  _updateDates(id, change) {
    this._save(
      this._load().map((h) =>
        h.id === id ? { ...h, completedDates: change(h.completedDates || []) } : h
      )
    );
  }

  _load() {
    const raw = this.webStorage.getItem(this.key);
    return raw === null ? [] : JSON.parse(raw);
  }

  _save(habits) {
    this.webStorage.setItem(this.key, JSON.stringify(habits));
  }
}

module.exports = { LocalStorageStorage };
