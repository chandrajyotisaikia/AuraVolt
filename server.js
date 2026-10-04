const express = require('express');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const path = require('path');

const { MONGODB_URI, APP_PASSWORD, CURRENCY = '$', PORT = 3000 } = process.env;
const app = express();
app.use(express.json());

// Password gate (any username, password = APP_PASSWORD). Skipped if unset.
app.use((req, res, next) => {
  if (!APP_PASSWORD) return next();
  const [, b64 = ''] = (req.headers.authorization || '').split(' ');
  const pass = Buffer.from(b64, 'base64').toString().split(':').slice(1).join(':');
  if (pass === APP_PASSWORD) return next();
  res.set('WWW-Authenticate', 'Basic realm="AuraVolt"').status(401).send('Password required');
});

const Employee = mongoose.model('Employee', new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  designation: { type: String, required: true, trim: true, maxlength: 80 },
}, { timestamps: true }));

const Entry = mongoose.model('Entry', new mongoose.Schema({
  type: { type: String, enum: ['expense', 'investment', 'sale'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  amount: { type: Number, required: true, min: 0.01 },
  category: { type: String, trim: true, maxlength: 60, default: '' },
  date: { type: Date, required: true, default: Date.now },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  // Snapshots, so old logs keep the name even if the employee is removed later
  employeeName: { type: String, required: true },
  employeeDesignation: { type: String, required: true },
}, { timestamps: true }));

// ---- Employees
app.get('/api/employees', async (req, res) => res.json(await Employee.find().sort({ name: 1 })));

app.post('/api/employees', async (req, res) => {
  try {
    const { name, designation } = req.body;
    res.status(201).json(await Employee.create({ name, designation }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try { await Employee.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: 'Invalid id' }); }
});

// ---- Entries
app.get('/api/entries', async (req, res) => {
  res.json(await Entry.find().sort({ date: -1, createdAt: -1 }).limit(2000));
});

app.post('/api/entries', async (req, res) => {
  try {
    const { type, title, amount, category, date, employee } = req.body;
    const emp = await Employee.findById(employee).catch(() => null);
    if (!emp) return res.status(400).json({ error: 'Choose an employee.' });
    res.status(201).json(await Entry.create({
      type, title, amount: Number(amount), category, date,
      employee: emp._id, employeeName: emp.name, employeeDesignation: emp.designation,
    }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/entries/:id', async (req, res) => {
  try { await Entry.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: 'Invalid id' }); }
});

// ---- PDF report
const fmt = n => CURRENCY + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = d => new Date(d).toISOString().slice(0, 10);

function table(doc, widths, aligns, head, rows) {
  let y = doc.y + 4;
  const line = (cells, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000');
    let x = 40;
    cells.forEach((t, i) => {
      doc.text(String(t), x, y, { width: widths[i] - 6, height: 12, align: aligns[i], ellipsis: true });
      x += widths[i];
    });
    y += 16;
    if (bold) doc.moveTo(40, y - 3).lineTo(555, y - 3).strokeColor('#999').stroke();
  };
  line(head, true);
  rows.forEach(r => { if (y > 780) { doc.addPage(); y = 40; line(head, true); } line(r, false); });
  doc.x = 40; doc.y = y + 8;
}

app.get('/api/report.pdf', async (req, res) => {
  const [entries, employees] = await Promise.all([
    Entry.find().sort({ date: -1, createdAt: -1 }).lean(),
    Employee.find().sort({ name: 1 }).lean(),
  ]);
  const sum = (list, t) => list.filter(e => e.type === t).reduce((a, e) => a + e.amount, 0);
  const inv = sum(entries, 'investment'), sale = sum(entries, 'sale'), exp = sum(entries, 'expense');

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="auravolt-report-${day(Date.now())}.pdf"`,
  });
  doc.pipe(res);

  doc.font('Helvetica-Bold').fontSize(20).text('AuraVolt Finance Report');
  doc.font('Helvetica').fontSize(10).fillColor('#555').text(`Generated ${day(Date.now())}`).moveDown();

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text('Summary');
  table(doc, [130, 130, 130, 125], ['left', 'right', 'right', 'right'],
    ['Invested', 'Sales', 'Expenses', 'Balance'], [[fmt(inv), fmt(sale), fmt(exp), fmt(inv + sale - exp)]]);

  // Group by the saved name so removed employees still appear
  const people = new Map();
  entries.forEach(e => {
    const k = `${e.employeeName}|${e.employeeDesignation}`;
    if (!people.has(k)) people.set(k, []);
    people.get(k).push(e);
  });
  employees.forEach(p => { const k = `${p.name}|${p.designation}`; if (!people.has(k)) people.set(k, []); });

  doc.font('Helvetica-Bold').fontSize(12).text('By employee');
  table(doc, [115, 100, 100, 100, 100], ['left', 'left', 'right', 'right', 'right'],
    ['Employee', 'Designation', 'Investments', 'Sales', 'Expenses'],
    [...people].map(([k, list]) => {
      const [n, d] = k.split('|');
      return [n, d, fmt(sum(list, 'investment')), fmt(sum(list, 'sale')), fmt(sum(list, 'expense'))];
    }));

  doc.font('Helvetica-Bold').fontSize(12).text('All transactions');
  table(doc, [62, 118, 150, 65, 80, 40], ['left', 'left', 'left', 'left', 'right', 'left'],
    ['Date', 'Employee', 'Description', 'Type', 'Amount', ''],
    entries.map(e => [day(e.date), `${e.employeeName} (${e.employeeDesignation})`,
      e.title + (e.category ? ` / ${e.category}` : ''), e.type,
      (e.type === 'expense' ? '-' : '+') + fmt(e.amount), '']));

  doc.end();
});

app.use(express.static(path.join(__dirname, 'public')));

if (!MONGODB_URI) { console.error('Set MONGODB_URI'); process.exit(1); }
mongoose.connect(MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`AuraVolt running on ${PORT}`)))
  .catch(e => { console.error(e.message); process.exit(1); });
