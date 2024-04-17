const sqlite = require("sqlite3").verbose();
const path = require("path");

let db;

exports.dbInit = (app) => {
  try {
    const dbPath = path.join(app.getPath("userData"), "config.db");
    db = new sqlite.Database(dbPath);
  } catch (err) {
    throw err;
  }
};

exports.getDb = (db) => {
  try {
    if (db) {
      return db;
    }
  } catch (err) {
    throw err;
  }
};

exports.createConfigTable = () => {
  try {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS config (
        readOption TEXT,
        readPath TEXT,
        host TEXT,
        eventListener TEXT,
        defaultPrinter TEXT,
        machineNo TEXT
      )`);
    });
  } catch (err) {
    throw err;
  }
};

exports.isTableEmpty = (cb) => {
  try {
    db.get("SELECT COUNT(*) AS count FROM config", (err, row) => {
      if (err) {
        cb(err, null);
      } else {
        cb(null, row.count === 0);
      }
    });
  } catch (err) {
    throw err;
  }
};

exports.insertConfigData = (configData) => {
  try {
    const stmt = db.prepare(
      "INSERT INTO config (readOption, readPath, host, eventListener, defaultPrinter, machineNo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    configData.forEach((entry) => {
      stmt.run(
        entry.readOption,
        entry.readPath,
        entry.host,
        entry.eventListener,
        entry.defaultPrinter,
        entry.machineNo
      );
    });
    stmt.finalize();
    console.log("Data inserted into the table.");
  } catch (err) {
    throw err;
  }
};

exports.updateConfigData = (configData) => {
  try {
    db.serialize(() => {
      const updateStmt = db.prepare(`UPDATE config SET 
      readOption = ?,
      readPath = ?,
      host = ?,
      eventListener = ?,
      defaultPrinter = ?,
      machineNo = ?
      `);
      configData.forEach((entry) => {
        updateStmt.run(
          entry.readOption,
          entry.readPath,
          entry.host,
          entry.eventListener,
          entry.defaultPrinter,
          entry.machineNo
        );
      });
      updateStmt.finalize();
    });
  } catch (err) {
    throw err;
  }
};

exports.setDataToConfigTable = (configData) => {
  try {
    this.isTableEmpty((err, isEmpty) => {
      if (err) {
        console.log(err);
        throw err;
      } else {
        if (isEmpty) {
          this.insertConfigData(configData);
        } else {
          this.updateConfigData(configData);
        }
      }
    });
  } catch (err) {
    throw err;
  }
};

exports.getConfigData = async () => {
  try {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM config", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  } catch (err) {
    throw err;
  }
};
