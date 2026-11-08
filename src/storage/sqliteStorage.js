const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    target_days_per_week INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS checkins (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    PRIMARY KEY (habit_id, date)
  );
`;

function toHabit(row, completedDates) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetDaysPerWeek: row.target_days_per_week,
    completedDates,
    createdAt: row.created_at,
  };
}

class SqliteStorage {
  constructor(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.isNew = !fs.existsSync(filePath);
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA);
  }

  seedIfNew(habits) {
    if (!this.isNew) {
      return;
    }
    this.isNew = false;
    this._transaction(() => {
      for (const habit of habits) {
        this._insert(habit);
      }
    });
  }

  list() {
    const rows = this.db.prepare('SELECT * FROM habits ORDER BY created_at, rowid').all();
    const dates = this._datesByHabit();
    return rows.map((row) => toHabit(row, dates.get(row.id) || []));
  }

  findById(id) {
    const row = this.db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    if (!row) {
      return null;
    }
    const dates = this.db
      .prepare('SELECT date FROM checkins WHERE habit_id = ? ORDER BY date')
      .all(id)
      .map((r) => r.date);
    return toHabit(row, dates);
  }

  insert(habit) {
    this._transaction(() => this._insert(habit));
  }

  update(habit) {
    this.db
      .prepare(
        `UPDATE habits
           SET title = ?, description = ?, category = ?, target_days_per_week = ?
         WHERE id = ?`
      )
      .run(habit.title, habit.description, habit.category, habit.targetDaysPerWeek, habit.id);
  }

  remove(id) {
    this.db.prepare('DELETE FROM habits WHERE id = ?').run(id);
  }

  addCheckIn(id, date) {
    this.db.prepare('INSERT OR IGNORE INTO checkins (habit_id, date) VALUES (?, ?)').run(id, date);
  }

  removeCheckIn(id, date) {
    this.db.prepare('DELETE FROM checkins WHERE habit_id = ? AND date = ?').run(id, date);
  }

  close() {
    this.db.close();
  }

  _insert(habit) {
    this.db
      .prepare(
        `INSERT INTO habits (id, title, description, category, target_days_per_week, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        habit.id,
        habit.title,
        habit.description,
        habit.category,
        habit.targetDaysPerWeek,
        habit.createdAt
      );
    const addDate = this.db.prepare('INSERT INTO checkins (habit_id, date) VALUES (?, ?)');
    for (const date of habit.completedDates || []) {
      addDate.run(habit.id, date);
    }
  }

  _datesByHabit() {
    const dates = new Map();
    for (const { habit_id: habitId, date } of this.db
      .prepare('SELECT habit_id, date FROM checkins ORDER BY date')
      .all()) {
      if (!dates.has(habitId)) {
        dates.set(habitId, []);
      }
      dates.get(habitId).push(date);
    }
    return dates;
  }

  _transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      work();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

module.exports = { SqliteStorage };
