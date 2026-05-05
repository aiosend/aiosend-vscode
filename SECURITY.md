# Security Policy

## Reporting Security Vulnerabilities

We take the security of aiosend Extension seriously. Do **not** create public GitHub issues for security vulnerabilities.

Email: **yap8572@gmail.com**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- VS Code version, OS, extension version
- Proof of concept (if applicable)

### Response Timeline

- **Initial response** — within 48 hours
- **Investigation** — within 7 days
- **Resolution** — 30–90 days depending on complexity
- **Public disclosure** — coordinated after fix

## Extension Security Measures

- **No network requests** — the extension itself makes no HTTP calls; all API calls are made by the user's Python code
- **No credential storage** — tokens are never read, stored, or transmitted by the extension
- **Filesystem scope** — no file writes outside of VS Code workspace
- **Input validation** — all regex matching is done on local document text only

### Hardcoded Token Detection

The extension's `DIAG_HARDCODED_TOKEN` diagnostic warns when it detects a string literal that looks like a real API token inside `CryptoPay(...)`. This is a static analysis hint only — no data leaves the editor.

## Security Best Practices for Users

```python
# ✅ Good: token from environment variable
import os
from aiosend import CryptoPay

cp = CryptoPay(token=os.environ['CRYPTOPAY_TOKEN'])

# ❌ Bad: hardcoded token (extension will warn)
cp = CryptoPay(token="1234:AbCdEfGhIjKlMnOp")
```

Use `.env` files with `python-dotenv` for local development:

```bash
# .env
CRYPTOPAY_TOKEN=your_token_here
```

```python
from dotenv import load_dotenv
load_dotenv()
```

Never commit `.env` files to version control.

## Dependencies

The extension has no runtime dependencies — only `@types/vscode` and `typescript` as dev-only packages with no network access at runtime.

Run `npm audit` to check for known vulnerabilities in dev dependencies.
