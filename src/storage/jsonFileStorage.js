const fs = require('fs');
const path = require('path');

class JsonFileStorage {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }
    const content = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(content || '[]');
  }

  save(habits) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(habits, null, 2), 'utf-8');
  }
}

module.exports = { JsonFileStorage };
