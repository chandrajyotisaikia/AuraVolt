# AuraVolt ERP (version 5)

Small ERP for a solar zatka machine assembly business in India. It follows your real workflow:

| Step | Where in the app |
|---|---|
| 1. Order materials | **Orders**, *+ New order / invoice* |
| 2. Get the invoice | Same form: upload the invoice photo or PDF. The details are read for you and you check them |
| 3. Make payment | **Orders**, *Pay*: upload the payment screenshot. Amount, date, UTR number and payee are read and saved with the file |
| 4. Arrange delivery | **Orders**, *Delivery*: upload the courier receipt. Company, tracking number and dates are read. If the delivery date is missing it asks you. Only possible after a payment is recorded |
| 5. Receive | *Received* button on the delivery (owner or workshop staff). Stock goes up at that moment |
| 6. Manufacture | **Production**, *+ Add today's units*: total units made today. Materials are used up and the cost per machine is worked out |
| 7. Sell | **Sales**, *+ New invoice*. A sales-only login sees just this screen |
| 8. Split profit 60:40 | **Phases**: profit for each phase, split between investor and operations, plus payouts |

## New settings (Render, Environment)

| Variable | Needed | What it does |
|---|---|---|
| `MONGODB_URI`, `APP_PASSWORD`, `SESSION_SECRET` | Yes | As before |
| `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` | Optional | Lets the app read invoices, payment screenshots and delivery receipts. Without it you type the details in and the files are still saved |
| `GEMINI_MODEL` / `ANTHROPIC_MODEL` | Optional | Change the reading model if the default is retired |
| `CRON_KEY` | Optional | A secret word for the daily reminder link (below) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional | Where reminders are sent |

Uploaded files are sent to the AI provider you choose, only to read them. Check what you are comfortable sharing. Details that are read are always shown for you to check before saving.

## Phases and the 60:40 split

- **Phases, Start new phase** (for example Phase 1 starting 10 Sept). Starting a new phase closes the previous one. Orders, production and expenses go to the current phase automatically.
- Sales use the **oldest unsold units first**, so Phase 1 units are sold before Phase 2 units, and each phase keeps its own cost per unit.
- **Profit for a phase** = sales of its units sold (excluding GST) minus the cost of those units minus the matching share of the phase's expenses and salaries (sold units divided by built units). Example: 20 built, 14 sold means 14/20 of the phase expenses are counted, and the 6 unsold machines carry their cost forward.
- The split (default 60 investor, 40 operations) and the names are in **Team, Business details**. **Record payout** tracks what has been paid to each person and what is still due.
- Expenses that have no phase are placed by date into the phase that was running that day.

## Reminders

- **Remind me** on any delivery adds the arrival date to your phone calendar with an alarm.
- The dashboard shows a **Delivery reminder** box for deliveries due today or overdue.
- **Telegram messages**: create a bot with @BotFather, get your chat ID, set the three variables above, then create a free job on cron-job.org that opens `https://YOUR-SITE.onrender.com/api/cron/reminders?key=YOUR_CRON_KEY` every morning. It also wakes the sleeping free Render service. It lists overdue and due-today deliveries and low-stock items.
- **Tracking**: the *Track* button searches the courier and tracking number. Live tracking is not built in because most Indian carriers have no public tracking service.

## Sales person login and installing the app

1. **Team, Add staff**: set **Department** to *Sales*. Give them the generated ID and password.
2. They sign in at your site on their phone. They see only **Sales** and **My money**. They can make invoices, mark customers as paid and view stock and prices, but see no costs, profit, suppliers or other people's sales.
3. To install it like an app: in Chrome tap the *Install app* button at the top (or the browser menu, *Add to Home screen*).

## Cleaning up duplicate entries

**Money, Expenses or Fund, Remove duplicate entries** counts entries that are exact copies (same date, amount, type, mode and note), asks you to confirm, and keeps one of each. Importing the same file again now skips exact copies automatically.

## Updating your live site

Upload the changed files to GitHub (replace the old ones, keep the folders: `server.js` in the main folder, `app.html` in `views`, the rest in `public`). Render redeploys by itself in 2 to 3 minutes. Then reload the page. No new packages are needed.

## Notes

- Uploaded invoices, screenshots and receipts are stored in your MongoDB database (about 0.3 MB per photo, photos are shrunk before upload). The free Atlas plan holds 512 MB.
- Stock cost is a weighted average. Purchase GST is treated as claimable input credit, so item cost excludes GST.
- GST figures are estimates from your entries. Confirm tax treatment, HSN codes and rates with your CA.
- Not included yet: serial numbers per machine, e-way bills and e-invoicing, sales returns, partial deliveries, TDS.

## Setup from scratch

1. **Atlas**: free M0 cluster, database user, Network Access `0.0.0.0/0`, copy the connection string with `/auravolt` before the `?`.
2. **GitHub**: private repo, upload these files.
3. **Render**: New Web Service, build `npm install`, start `npm start`, add the environment variables above.
4. Sign in as `admin`, then **Team, Business details** (GSTIN, state, investor names), **Stock** (items and bill of materials), **Money, Fund** (starting capital), **Phases** (start Phase 1).
