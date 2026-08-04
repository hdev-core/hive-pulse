# 🐛 Hive-Engine Debugging Guide

## Problem
Account `actifit.pay` has Hive-Engine tokens but shows: "✓ No Hive-Engine tokens in wallet"

## Solution: Debug the API Calls

I've added **ultra-detailed console logging** to trace exactly where the issue is.

---

## 🔍 How to Debug

### Step 1: Load the Latest Build
```
npm run build
cd dist
# Load in Chrome: chrome://extensions → Developer Mode → Load unpacked → dist folder
```

### Step 2: Open HivePulse Extension
- Click HivePulse icon in Chrome
- Search for: `actifit.pay`
- Wait for stats to load

### Step 3: Expand Portfolio Card
- Click the **Portfolio Value** card (the blue one with $ icon)
- It will expand showing all sections

### Step 4: Click Hive-Engine Section
- Click **🎮 Hive-Engine Assets** 
- Watch for the loading spinner

### Step 5: Open Browser Console
- Press **F12** in Chrome
- Go to **Console** tab
- You should see colorful logs with 🔵🟢🟡🔴 emojis

---

## 📋 What to Look For

### Successful Flow (you'll see):
```
🔵 ========== HIVE-ENGINE PORTFOLIO FETCH START ==========
Username: actifit.pay
API Endpoint: https://api.hive-engine.com/rpc

🔵 Hive-Engine Request: {...}
🔵 Hive-Engine Response Status: 200 OK
🔵 Hive-Engine Response Data: {
  "result": [
    { "account": "actifit.pay", "symbol": "ACT", "balance": "123.45" },
    ...
  ]
}

🟢 Found 5 token balances

🔵 --- COMBINING RESULTS ---
Balances returned: 5 items
Prices returned: 12 tokens

🔵 --- FINAL RESULT ---
Tokens with prices: 3
  ACT: 123.45 × $0.002 = $0.25
  BEE: 50 × $0.001 = $0.05
  LEO: 10 × $0.15 = $1.50

🟢 Total Portfolio Value: $1.80
```

### Failed Flow (you'll see):
```
🔴 Hive-Engine Response Data: { "result": [], "error": null }
⚠️ Unexpected response format
```

Or:

```
🔴 Failed to fetch Hive-Engine balances: [error message]
```

---

## 🔧 Common Issues & Fixes

### Issue 1: Empty Result Array
**Log shows:** `"result": []`

**Possible causes:**
- Account name is case-sensitive (try different case variations)
- Hive-Engine API is down
- Account really has no tokens

**What to try:**
1. Check if account exists on Hive-Engine: https://hive-engine.com/account/actifit.pay
2. Try different account names
3. Try https://api2.hive-engine.com/rpc as alternative endpoint

### Issue 2: No Price Data
**Log shows:** `Prices returned: 0 tokens` or `price=$0`

**Possible causes:**
- CoinGecko is down
- Token symbol doesn't exist in CoinGecko
- Network issue

**What to try:**
1. Check if CoinGecko is up: https://www.coingecko.com
2. Look for token symbols that ARE in prices
3. Add new token mappings if needed

### Issue 3: API Timeout
**Log shows:** Error with timeout

**What to try:**
1. Check network connection
2. Retry after a few seconds
3. Check if Hive-Engine API is up

---

## 📝 Copy Console Output

To share with me:

1. Right-click in console → **Save as**
2. Save console logs as file
3. Or use: `copy(console.log)` and paste to text file

---

## 🎯 Next Steps

Once you've tested, please share:

1. **Is the "FETCH START" message showing?**
   - If NO: portfolio card isn't triggering fetch
   - If YES: fetch is being called

2. **What does the Hive-Engine Response Data show?**
   - Empty array: API returning no results
   - Error object: API error
   - Full data: we're getting results but filtering wrong

3. **What does CoinGecko prices show?**
   - Empty: prices not fetching
   - Has prices: prices are working

4. **What token symbols appear?**
   - Show me the "ACT", "BEE", etc. that appear
   - We can add them to price mapping if missing

---

## 💡 Quick Test

You can also test the API directly in browser console:

```javascript
// Test Hive-Engine API
fetch('https://api.hive-engine.com/rpc', {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'find',
    params: {
      contract: 'tokens',
      table: 'balances',
      query: { account: 'actifit.pay' },
      limit: 1000
    },
    id: 1
  }),
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d, null, 2)))
.catch(e => console.error(e))
```

This will show exactly what the API returns.

---

**Run the test and share the console output. I'll be able to identify the exact issue!**
