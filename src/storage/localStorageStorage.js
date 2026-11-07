class LocalStorageStorage {
  constructor(webStorage, key) {
    this.webStorage = webStorage;
    this.key = key;
  }

  load() {
    const raw = this.webStorage.getItem(this.key);
    return raw === null ? null : JSON.parse(raw);
  }

  save(habits) {
    this.webStorage.setItem(this.key, JSON.stringify(habits));
  }
}

module.exports = { LocalStorageStorage };
