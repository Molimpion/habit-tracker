const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { ConflictError } = require('../utils/errors');

const SQLITE_CONSTRAINT_UNIQUE = 2067;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    target_days_per_week INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS habits_user_id ON habits(user_id);
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
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA);
  }

  createUser(user) {
    try {
      this.db
        .prepare(
          'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(user.id, user.name, user.email, user.passwordHash, user.createdAt);
    } catch (error) {
      if (error.errcode === SQLITE_CONSTRAINT_UNIQUE) {
        throw new ConflictError('Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }

  findUserByEmail(email) {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  forUser(userId) {
    return new UserHabitStore(this.db, userId);
  }

  close() {
    this.db.close();
  }
}

class UserHabitStore {
  constructor(db, userId) {
    this.db = db;
    this.userId = userId;
  }

  list() {
    const rows = this.db
      .prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at, rowid')
      .all(this.userId);
    const dates = this._datesByHabit();
    return rows.map((row) => toHabit(row, dates.get(row.id) || []));
  }

  findById(id) {
    const row = this.db
      .prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
      .get(id, this.userId);
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
    this.db
      .prepare(
        `INSERT INTO habits (id, user_id, title, description, category, target_days_per_week, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        habit.id,
        this.userId,
        habit.title,
        habit.description,
        habit.category,
        habit.targetDaysPerWeek,
        habit.createdAt
      );
  }

  update(habit) {
    this.db
      .prepare(
        `UPDATE habits
           SET title = ?, description = ?, category = ?, target_days_per_week = ?
         WHERE id = ? AND user_id = ?`
      )
      .run(
        habit.title,
        habit.description,
        habit.category,
        habit.targetDaysPerWeek,
        habit.id,
        this.userId
      );
  }

  remove(id) {
    this.db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(id, this.userId);
  }

  addCheckIn(id, date) {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO checkins (habit_id, date)
         SELECT id, ? FROM habits WHERE id = ? AND user_id = ?`
      )
      .run(date, id, this.userId);
  }

  removeCheckIn(id, date) {
    this.db
      .prepare(
        `DELETE FROM checkins
          WHERE habit_id = ? AND date = ?
            AND habit_id IN (SELECT id FROM habits WHERE user_id = ?)`
      )
      .run(id, date, this.userId);
  }

  _datesByHabit() {
    const dates = new Map();
    const rows = this.db
      .prepare(
        `SELECT c.habit_id, c.date FROM checkins c
           JOIN habits h ON h.id = c.habit_id
          WHERE h.user_id = ?
          ORDER BY c.date`
      )
      .all(this.userId);
    for (const { habit_id: habitId, date } of rows) {
      if (!dates.has(habitId)) {
        dates.set(habitId, []);
      }
      dates.get(habitId).push(date);
    }
    return dates;
  }
}

module.exports = { SqliteStorage };
