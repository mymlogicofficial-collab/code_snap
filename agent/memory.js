import fs from "fs";
import path from "path";

export class Memory {
  constructor(file = "./.cache/memory.json") {
    this.file = file;
    const dir = path.dirname(this.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, JSON.stringify({ notes: [], created: new Date().toISOString() }, null, 2));
    }
  }

  _read() {
    try {
      const raw = fs.readFileSync(this.file, "utf8");
      return JSON.parse(raw || "{}");
    } catch (err) {
      return {};
    }
  }

  _write(obj) {
    fs.writeFileSync(this.file, JSON.stringify(obj, null, 2));
  }

  list() {
    const data = this._read();
    return data.notes || [];
  }

  add(note) {
    const data = this._read();
    data.notes = data.notes || [];
    data.notes.push({ id: Date.now(), text: note, ts: new Date().toISOString() });
    this._write(data);
    return data.notes[data.notes.length - 1];
  }

  clear() {
    const data = { notes: [], created: new Date().toISOString() };
    this._write(data);
    return data;
  }
}
