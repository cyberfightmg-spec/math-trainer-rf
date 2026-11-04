const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script, 'Не найден код приложения');
assert(!html.includes('Повторение 1–2 класса'));
const storage = {};
function createPage() {
  let seq = 0;
  const els = {};
  const make = id => els[id] ||= {
    textContent: '', value: '', dataset: {}, handlers: {}, className: '',
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(event, callback) { this.handlers[event] = callback; },
    replaceChildren() {}, append() {}, focus() {}, select() {}, scrollIntoView() {},
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html || ''; },
  };
  const tabs = ['mix', 'mental', 'sub', 'add', 'addcol', 'mul', 'div'].map(t => {
    const b = make('tab_' + t); b.dataset.mode = t; return b;
  });
  const context = {
    console, Math, Set, Number, Object, JSON, Array, confirm: () => true,
    localStorage: { getItem: k => storage[k] || null, setItem: (k,v) => { storage[k] = v; } },
    document: {
      getElementById: make,
      createElement: () => make('generated' + (++seq)),
      querySelectorAll: selector => selector === '.tab' ? tabs : [],
    },
    window: { print() {} },
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  return { el: make, tabs };
}
let page = createPage();
const skills = ['mental','sub','add','addcol','mul','div'];
const issued = new Set();
for (const skill of skills) {
  const tab = page.tabs.find(t => t.dataset.mode === skill);
  tab.handlers.click();
  for (let i = 0; i < 15; i++) {
    const store = JSON.parse(storage.math_rf_unique_v1);
    const key = store.seen.at(-1);
    assert(key, skill + ': ключ не сохранён');
    assert(!issued.has(key), skill + ': повтор задания ' + key);
    issued.add(key);
    let answer;
    if (skill === 'mental' || skill === 'add') {
      const expression = page.el('problem').textContent;
      const [a,b] = expression.split(skill === 'mental' ? ' − ' : ' + ').map(Number);
      if (skill === 'mental' && i === 0) assert(a >= 21 && a <= 39 && b <= 9 && a%10 < b%10);
      answer = skill === 'mental' ? a-b : a+b;
    } else if (skill === 'sub' || skill === 'addcol') {
      const last = store.seen.at(-1).split(':');
      answer = skill === 'sub' ? Number(last[2]) - Number(last[3]) : Number(last[2]) + Number(last[3]);
    } else {
      const expr = page.el('problem').textContent;
      if (/□/.test(expr)) {
        if (skill === 'mul') {
          const [left, right] = expr.split(' = ');
          const fixed = Number(left.replace('□','').replace('×','').trim());
          answer = Number(right) / fixed;
        } else {
          const [left, right] = expr.split(' = ');
          if (left.includes(': □')) answer = Number(left.split(' : ')[0]) / Number(right);
          else answer = Number(left.split(' : ')[1]) * Number(right);
        }
      } else {
        const [a,b] = expr.split(skill === 'mul' ? ' × ' : ' : ').map(Number);
        answer = skill === 'mul' ? a*b : a/b;
      }
    }
    page.el('answer').value = String(answer);
    page.el('answerForm').handlers.submit({ preventDefault(){} });
    assert(page.el('feedback').className === 'notice good', 'Неверный ответ для ' + skill + '; ' + key);
    if (i < 14) page.el('next').handlers.click();
  }
}
page = createPage();
page.tabs[1].handlers.click();
const final = JSON.parse(storage.math_rf_unique_v1);
assert.equal(new Set(final.seen).size, final.seen.length, 'Повторы в истории');
assert(!issued.has(final.seen.at(-1)), 'Повтор после перезагрузки');
page.el('sheetBtn').handlers.click();
assert.equal(page.el('sheetAnswers').textContent.split(' · ').length, 12, 'Лист на 12 заданий');
const afterPrint = JSON.parse(storage.math_rf_unique_v1).seen;
assert.equal(new Set(afterPrint).size, afterPrint.length, 'Повторы в листе печати');
console.log('PASS: 6 режимов, прогресс, отсутствие повторов, перезагрузка, печать (выдано ' + afterPrint.length + ')');
