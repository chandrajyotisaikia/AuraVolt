# AuraVolt ERP

A simple ERP for a small electronics assembly business in India (built around solar zatka machine assembly): stock, purchases and delivery tracking, production, GST invoices, money, salary, and profit reports.

```
auravolt-erp/
├── package.json  server.js  .gitignore  README.md
├── views/   app.html (owner and staff screens)  me.html (staff personal finance)
└── public/  login.html  style.css  app.js  erp.js  logo.png  logo-full.png
```

## What it does

| Area | What you get |
|---|---|
| Stock | Raw materials and finished machines, weighted-average cost, stock value, reorder alerts, stock counts, opening stock |
| Purchases | Supplier bills with ordered, in transit and received status, expected delivery dates, overdue flags, part payments. Receiving adds stock |
| Production | Bill of materials per machine. A production run uses up materials, adds finished machines, and works out the cost per unit |
| Sales | GST tax invoices (CGST and SGST, or IGST for other states), auto numbering per financial year, retail and retailer customers, part payments, printable invoice with amount in words, warranty line, certification note |
| Money | Expenses, company fund (capital, drawings, loans), salary, advances and bonus, cash and bank balances |
| Reports | Profit and loss for any dates, GST summary, stock valuation, business worth, who owes you, who you owe, 6-month trend, CSV downloads, print or save as PDF |
| People | Owner sees everything. Staff log in and can make invoices, record production, receive deliveries and view stock, but never see costs, profit, salary or the fund. Staff also keep a private personal finance page |

## First-time setup in the app

1. Sign in as `admin` with your `APP_PASSWORD`.
2. **Team**, Business details: business name, GSTIN, your state, address, invoice prefix (for example `AV`) and a certification note such as your BIS licence number. Save. Invoices need your state to choose the right GST split.
3. **Team**, Add staff: create the two staff logins. Give them to your staff. Passwords are shown once.
4. **Stock**: tap *Load sample items* for a starting list of solar zatka parts, then edit it. Set each item's HSN, GST %, reorder level, and for the machine its selling price, assembly labour per unit and warranty. Check each part's quantity in the bill of materials.
5. **Money**, Company fund: add your starting capital, split between cash and bank, so balances are right.
6. **Parties**: add suppliers and retailers. Walk-in shop customers need no entry.
7. Enter opening stock for materials you already hold (Stock, Add item, opening stock and cost per unit).

## Daily use

- **Buy materials:** Purchases, New purchase. Mark *In transit*, then *Received* when it arrives. Stock rises at that point.
- **Build machines:** Production, New run. The form shows which materials are short before you save.
- **Sell:** Sales, New invoice, then Print. Record the payment now or later with *Receive*.
- **Month end:** Reports, pick the dates, check profit and loss and the GST summary, then Print or Save as PDF for your CA.

## Notes on the numbers

- Stock cost is a weighted average. Purchase GST is treated as claimable input credit, so item cost excludes GST.
- Profit = sales (excluding GST) minus the cost of materials sold, minus expenses, minus salaries and advances paid.
- Cancelling an invoice returns stock and refunds any payment in the books.
- GST figures are estimates from your entries. Confirm tax treatment, HSN codes and rates with your CA.
- Not included yet: serial numbers per machine, e-way bills and e-invoicing, sales returns, TDS, and bank statement import.

## Deploy (MongoDB Atlas, GitHub, Render)

1. **Atlas:** free M0 cluster, database user, Network Access `0.0.0.0/0`, then copy the connection string with `/auravolt` before the `?`.
2. **Local test:** `npm install`, set `MONGODB_URI` and `APP_PASSWORD`, run `npm start`, open `http://localhost:3000`.
3. **GitHub:** new private repo, then `git init`, `git add .`, `git commit -m "AuraVolt ERP"`, `git branch -M main`, `git remote add origin <repo url>`, `git push -u origin main`. If you already have the earlier finance app in the repo, replace its files with these.
4. **Render:** New Web Service from the repo. Build `npm install`, start `npm start`. Environment variables: `MONGODB_URI`, `APP_PASSWORD`, `SESSION_SECRET` (any long random text), optional `ADMIN_USER`. Auto-deploy runs on every push to `main`.
5. Free Render services sleep when idle, so the first load can take about 30 seconds. Download the CSV exports now and then as a backup, and consider Atlas backups once the business depends on this.
