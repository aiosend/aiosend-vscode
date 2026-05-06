<p align="center">
  <img src="https://aiosend.readthedocs.io/ru/stable/_static/logo.png" style="border-radius:20px; width:100px">
</p>

<h1 align="center">aiosend</h1>

<p align="center">
  VS Code extension for <a href="https://github.com/vovchic17/aiosend">aiosend</a> — the async Crypto Pay API client for Python.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=aiosend.aiosend-vscode">
    <img src="https://img.shields.io/visual-studio-marketplace/v/aiosend.aiosend-vscode?color=%2334D058&label=marketplace&style=flat-square" alt="Marketplace version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=aiosend.aiosend-vscode">
    <img src="https://img.shields.io/visual-studio-marketplace/i/aiosend.aiosend-vscode?color=%2334D058&style=flat-square" alt="Installs">
  </a>
  <a href="https://github.com/aiosend/aiosend-vscode/releases">
    <img src="https://img.shields.io/github/v/release/aiosend/aiosend-vscode?color=%2334D058&style=flat-square" alt="Release">
  </a>
  <a href="https://github.com/aiosend/aiosend-vscode">
    <img src="https://img.shields.io/github/stars/aiosend/aiosend-vscode?style=flat-square" alt="Stars">
  </a>
</p>

---

## Features

### API Explorer
Browse every `CryptoPay` method, model, and enum directly in the sidebar — organized by category. Insert a snippet at cursor or copy a signature with one click.

### Workspace Scanner
A second sidebar tab scans your entire project for aiosend API calls and lists them by file. Click any entry to jump straight to that line.

### Strict Diagnostics

12 inline checks — stricter than a basic linter:

| Problem | Severity |
|:--|:--:|
| `cp.method()` without `await` | ❌ Error |
| `def` instead of `async def` | ❌ Error |
| Hardcoded API token in `CryptoPay()` | ⚠️ Warning |
| Invalid `asset=` value (e.g. `"DOGE"`) | ⚠️ Warning |
| Invalid `fiat=` value | ⚠️ Warning |
| Invalid `status=` value (e.g. `"canceled"`) | ⚠️ Warning |
| Missing `-> ReturnType` annotation | ⚠️ Warning |
| `amount="100"` — string instead of number | ⚠️ Warning |
| `invoice_id="123"` — string instead of int | ⚠️ Warning |
| `transfer()` without `spend_id=` | ⚠️ Warning |
| `create_invoice()` without `amount=` | ⚠️ Warning |
| `create_invoice()` without `asset=` | ⚠️ Warning |
| Duplicate `spend_id` in same file | ⚠️ Warning |

### Quick Fixes

Every diagnostic has a one-click fix (`Ctrl+.` / `Cmd+.`):

- Insert missing `await`
- Add `async` to `def`
- Replace hardcoded token with `os.environ.get('CRYPTOPAY_TOKEN', '')`
- Auto-correct invalid asset or fiat (Levenshtein nearest match)
- Add `-> None` return type
- Unquote string `amount`

### Hover Documentation

Hover over any API call to see the full signature, parameter table, return type, and a code example — without leaving the editor.

```python
invoice = await cp.create_invoice(amount=100, asset="USDT")
#                  ^─ hover here
```

### Smart Completions

- Method names after `cp.`
- Asset values after `asset=` — `USDT`, `TON`, `BTC`, `ETH` …
- Fiat codes after `fiat=` — `USD`, `EUR`, `RUB` …
- Status values after `status=`

### Snippets

| Prefix | Inserts |
|:--|:--|
| `aiosend` | Import statement |
| `aiosend-setup` | Full async setup |
| `aiosend-invoice` | `create_invoice()` |
| `aiosend-invoice-ex` | Invoice with expiry + payload |
| `aiosend-check` | `create_check()` |
| `aiosend-transfer` | `transfer()` |
| `aiosend-balance` | `get_balance()` loop |
| `aiosend-poll` | Polling handler |
| `aiosend-webhook` | aiohttp webhook |
| `aiosend-try` | `try/except CryptoPayError` |
| `aiosend-aiogram` | Full aiogram bot example |

---

## Requirements

- VS Code `^1.85.0`
- Python with `aiosend` installed

```bash
pip install aiosend
```

## Installation

```
Ctrl+P → ext install aiosend.aiosend-vscode
```

Or search **aiosend** in the Extensions panel.

---

## Best Practices

```python
# ✅ extension is happy
import os
from aiosend import CryptoPay

cp = CryptoPay(token=os.environ['CRYPTOPAY_TOKEN'])

async def handle() -> None:
    invoice = await cp.create_invoice(
        amount=100,
        asset="USDT",
        description="Premium"
    )
    print(invoice.pay_url)
```

```python
# ❌ triggers diagnostics
cp = CryptoPay("real_token_here")           # hardcoded token
invoice = cp.create_invoice(amount=100)     # missing await
def handler():                              # not async, no return type
    ...
```

---

## Links

- **aiosend library** — [github.com/vovchic17/aiosend](https://github.com/vovchic17/aiosend)
- **Documentation** — [aiosend.readthedocs.io](https://aiosend.readthedocs.io/ru/stable/)
- **Issues** — [github.com/aiosend/aiosend-vscode/issues](https://github.com/aiosend/aiosend-vscode/issues)

## License

[MIT](LICENSE)
