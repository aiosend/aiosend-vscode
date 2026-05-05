# Contributing to aiosend Extension

## Setup

```bash
git clone https://github.com/aiosend/aiosend-vscode
cd aiosend-vscode
npm install
```

## Development

Open the folder in VS Code and press `F5` to launch the Extension Development Host.

```bash
npm run watch   # watch mode — recompiles on save
npm run compile # one-shot compile
```

## Project structure

```
src/
├── extension.ts           # entry point, command registration, status bar
├── apiExplorer.ts         # sidebar TreeView — methods, models, enums
├── diagnosticsProvider.ts # 8 inline diagnostics (missing await, bad asset, etc.)
├── hoverProvider.ts       # hover docs for all API methods
├── completionProvider.ts  # method + enum completions
├── codeLensProvider.ts    # CodeLens above imports and CryptoPay()
└── quickFixProvider.ts    # quick fixes for all diagnostics
snippets/
└── aiosend.json           # 11 Python code snippets
```

## Guidelines

- No comments unless the WHY is non-obvious
- No new dependencies without discussion
- Diagnostics must not produce false positives on non-aiosend Python files (check `isAiosendFile()` first)
- Test with both aiosend and non-aiosend Python files open simultaneously
- Keep hover docs accurate — cross-check with [aiosend docs](https://aiosend.readthedocs.io/ru/stable/)

## Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit your changes
4. Push and open a PR against `master`

## Reporting bugs

Open an issue at [github.com/aiosend/aiosend-vscode/issues](https://github.com/aiosend/aiosend-vscode/issues).
