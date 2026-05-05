# Changelog

All notable changes to aiosend Extension will be documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.0.1] - 2026-05-05

### Added

- **API Explorer** — sidebar panel with all CryptoPay methods organized by category (App, Invoices, Checks, Transfers, Balance & Rates, Info), plus Models and Enums sections. Click any method to open docs.
- **Strict Diagnostics** — 8 inline checks:
  - Missing `await` on async API calls (Error)
  - Non-`async def` function using aiosend calls (Error)
  - Hardcoded API token in `CryptoPay()` (Warning)
  - Invalid `asset=` value (Warning)
  - Invalid `fiat=` value (Warning)
  - Missing return type annotation (Warning)
  - String `amount=` instead of numeric (Warning)
  - Duplicate `spend_id` across the file (Warning)
- **Quick Fixes** — one-click fixes for every diagnostic:
  - Insert `await` before call
  - Insert `async` on def
  - Replace token with `os.environ.get('CRYPTOPAY_TOKEN', '')`
  - Closest-match suggestion for invalid asset/fiat
  - Add `-> None` return type
  - Unquote string amount
- **Hover Documentation** — hover over any API method call to see full signature, parameter table (name, type, required, description), return type, and code example.
- **Smart Completion** — method completions after `cp.`, asset/fiat enum values after `asset=` and `fiat=`, status values after `status=`.
- **CodeLens** — `$(book) aiosend docs` and `$(refresh) Refresh Explorer` above imports and `CryptoPay()` instantiations.
- **Snippets** — 11 code snippets: setup, invoice, check, transfer, balance, polling, webhook, error handling, and full aiogram bot example.
- **Status Bar** — shows `$(symbol-method) aiosend` when an aiosend file is active; click to open documentation.
