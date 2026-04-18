# Bulk Mail Launcher v3

Drop an Excel file → Gmail opens with all emails pre-filled in BCC/TO — using your currently active Gmail account.

## How to use

1. Open `index.html` in Chrome or Edge
2. Drop your `.xlsx` or `.xls` file (emails must be in Column A)
3. Verify the email count in the preview
4. Add a subject line, choose BCC or TO
5. Click "Open Gmail" — Gmail compose window opens using your **currently active Gmail account** with all addresses pre-filled

## Active Gmail account

The compose window automatically uses whichever Gmail account is **currently active** in your browser (the one you are logged into in the current tab/session).

To send from a different Gmail account:
1. Open [Gmail](https://mail.google.com) in a new tab
2. Click your profile picture (top-right) → **Switch account** → choose the desired account
3. Return here and click **Open Gmail**

(No manual email entry needed anymore — the tool now detects and uses your active browser session automatically.)

## Notes

- Gmail allows ~500 recipients per send. Lists larger than 500 are split into batches automatically
- The tool now automatically uses your active browser Gmail account (no manual entry required)
- Batch 1 opens automatically; remaining batches appear as clickable links
- Everything runs in your browser — no data is sent to any server
- Duplicate emails are removed automatically
- Invalid or empty rows in Column A are skipped

## File structure

```
bulk-mail-launcher/
├── index.html   — page structure
├── style.css    — all styles
├── app.js       — all logic (Excel parsing, Gmail launch)
└── README.md    — this file
```

## Requirements

- Chrome or Edge (recommended)
- Internet connection (to load Excel parser and open Gmail)
- Must be logged into Gmail in the same browser