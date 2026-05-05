import * as vscode from "vscode";

export const DIAG_MISSING_AWAIT   = "aiosend.missing-await";
export const DIAG_MISSING_ASYNC   = "aiosend.missing-async";
export const DIAG_HARDCODED_TOKEN = "aiosend.hardcoded-token";
export const DIAG_INVALID_ASSET   = "aiosend.invalid-asset";
export const DIAG_INVALID_FIAT    = "aiosend.invalid-fiat";
export const DIAG_MISSING_RETURN  = "aiosend.missing-return";
export const DIAG_STRING_AMOUNT   = "aiosend.string-amount";
export const DIAG_DUPLICATE_SPEND = "aiosend.duplicate-spend-id";

const VALID_ASSETS = new Set(["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC", "JET"]);
const VALID_FIATS  = new Set([
    "AED", "AMD", "AZN", "BRL", "BYN", "CNY", "EUR", "GBP", "GEL",
    "IDR", "ILS", "INR", "KGS", "KZT", "PLN", "RUB", "THB", "TJS",
    "TRY", "UAH", "USD", "UZS",
]);

const ASYNC_METHODS = new Set([
    "get_me", "create_invoice", "delete_invoice", "get_invoices", "get_invoice",
    "create_check", "delete_check", "get_checks", "get_check",
    "transfer", "get_transfers", "get_transfer",
    "get_balance", "get_balance_by_asset", "get_exchange_rates", "exchange",
    "get_currencies", "get_stats",
]);

const INSTANCE_RE = /(\w+)\s*=\s*CryptoPay\s*\(/;
const TOKEN_STRING_RE = /CryptoPay\s*\(\s*["']([^"']{8,})["']/;
const TOKEN_KWARG_RE  = /CryptoPay\s*\(.*?token\s*=\s*["']([^"']{8,})["']/;
const ASSET_RE        = /\basset\s*=\s*["']([A-Z]+)["']/g;
const FIAT_RE         = /\bfiat\s*=\s*["']([A-Z]+)["']/g;
const AMOUNT_STR_RE   = /\bamount\s*=\s*["'][0-9]+(?:\.[0-9]+)?["']/;
const SPEND_ID_RE     = /spend_id\s*=\s*["']([^"']+)["']/;
const FUNC_DEF_RE     = /^\s*(async\s+)?def\s+\w+\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?\s*:/;

function findInstances(lines: string[]): Set<string> {
    const names = new Set<string>();
    for (const line of lines) {
        const m = INSTANCE_RE.exec(line);
        if (m) {
            names.add(m[1]);
        }
    }
    return names;
}

function buildCallRE(names: Set<string>): RegExp {
    const escaped = [...names]
        .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
    return new RegExp(
        `\\b(${escaped})\\.(${[...ASYNC_METHODS].join("|")})\\s*\\(`,
        "g"
    );
}

function isPlaceholderToken(token: string): boolean {
    const placeholders = [
        "your", "token", "api", "key", "secret", "test", "example",
        "placeholder", "replace", "insert", "here", "xxx",
    ];
    const lower = token.toLowerCase();
    return placeholders.some((p) => lower.includes(p));
}

function parseFuncAt(lines: string[], startLine: number): {
    lineIndex: number;
    isAsync: boolean;
    returnType: string | null;
} | null {
    for (let i = startLine; i < Math.min(startLine + 8, lines.length); i++) {
        const m = FUNC_DEF_RE.exec(lines[i]);
        if (m) {
            return {
                lineIndex: i,
                isAsync: Boolean(m[1]),
                returnType: m[3]?.trim() ?? null,
            };
        }
    }
    return null;
}

export class AiosendDiagnosticsProvider {
    private collection: vscode.DiagnosticCollection;

    constructor(context: vscode.ExtensionContext) {
        this.collection = vscode.languages.createDiagnosticCollection("aiosend");
        context.subscriptions.push(this.collection);

        vscode.workspace.onDidOpenTextDocument((doc) => this.update(doc), null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument((e) => this.update(e.document), null, context.subscriptions);
        vscode.workspace.onDidSaveTextDocument((doc) => this.update(doc), null, context.subscriptions);
        vscode.workspace.onDidCloseTextDocument((doc) => this.collection.delete(doc.uri), null, context.subscriptions);

        vscode.workspace.textDocuments.forEach((doc) => this.update(doc));
    }

    private update(document: vscode.TextDocument): void {
        if (document.languageId !== "python") {
            return;
        }
        this.collection.set(document.uri, this.analyze(document));
    }

    private analyze(document: vscode.TextDocument): vscode.Diagnostic[] {
        const text  = document.getText();
        const lines = text.split("\n");

        const instances = findInstances(lines);
        if (instances.size === 0 && !/(?:from\s+aiosend\s+import|import\s+aiosend\b)/.test(text)) {
            return [];
        }

        const diagnostics: vscode.Diagnostic[] = [];

        // ─── Hardcoded token ───────────────────────────────────────────────
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            for (const re of [TOKEN_STRING_RE, TOKEN_KWARG_RE]) {
                const m = re.exec(line);
                if (m && !isPlaceholderToken(m[1])) {
                    const tokenStart = line.indexOf(m[1]);
                    const range = new vscode.Range(i, tokenStart, i, tokenStart + m[1].length);
                    const d = new vscode.Diagnostic(
                        range,
                        "Hardcoded API token detected. Use os.environ.get('CRYPTOPAY_TOKEN') instead.",
                        vscode.DiagnosticSeverity.Warning
                    );
                    d.code = DIAG_HARDCODED_TOKEN;
                    d.source = "aiosend";
                    diagnostics.push(d);
                    break;
                }
            }
        }

        if (instances.size === 0) {
            return diagnostics;
        }

        const callRE = buildCallRE(instances);

        // ─── Missing await + string amount + invalid asset/fiat ───────────
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Missing await on async API call
            callRE.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = callRE.exec(line)) !== null) {
                const before = line.slice(0, m.index).trimEnd();
                if (!before.endsWith("await")) {
                    const range = new vscode.Range(i, m.index, i, m.index + m[0].length - 1);
                    const d = new vscode.Diagnostic(
                        range,
                        `\`${m[2]}()\` is async — missing \`await\`.`,
                        vscode.DiagnosticSeverity.Error
                    );
                    d.code = DIAG_MISSING_AWAIT;
                    d.source = "aiosend";
                    diagnostics.push(d);
                }
            }

            // amount="100" — string instead of number
            if (AMOUNT_STR_RE.test(line)) {
                const idx = line.search(AMOUNT_STR_RE);
                const range = new vscode.Range(i, idx, i, line.length);
                const d = new vscode.Diagnostic(
                    range,
                    "`amount` must be a number (float/Decimal), not a string.",
                    vscode.DiagnosticSeverity.Warning
                );
                d.code = DIAG_STRING_AMOUNT;
                d.source = "aiosend";
                diagnostics.push(d);
            }

            // Invalid asset value
            ASSET_RE.lastIndex = 0;
            let am: RegExpExecArray | null;
            while ((am = ASSET_RE.exec(line)) !== null) {
                if (!VALID_ASSETS.has(am[1])) {
                    const valIdx = line.indexOf(`"${am[1]}"`, am.index) !== -1
                        ? line.indexOf(`"${am[1]}"`, am.index) + 1
                        : line.indexOf(`'${am[1]}'`, am.index) + 1;
                    const range = new vscode.Range(i, valIdx, i, valIdx + am[1].length);
                    const d = new vscode.Diagnostic(
                        range,
                        `Unknown asset "${am[1]}". Valid: ${[...VALID_ASSETS].join(", ")}.`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    d.code = DIAG_INVALID_ASSET;
                    d.source = "aiosend";
                    diagnostics.push(d);
                }
            }

            // Invalid fiat value
            FIAT_RE.lastIndex = 0;
            let fm: RegExpExecArray | null;
            while ((fm = FIAT_RE.exec(line)) !== null) {
                if (!VALID_FIATS.has(fm[1])) {
                    const valIdx = line.indexOf(`"${fm[1]}"`, fm.index) !== -1
                        ? line.indexOf(`"${fm[1]}"`, fm.index) + 1
                        : line.indexOf(`'${fm[1]}'`, fm.index) + 1;
                    const range = new vscode.Range(i, valIdx, i, valIdx + fm[1].length);
                    const d = new vscode.Diagnostic(
                        range,
                        `Unknown fiat currency "${fm[1]}". Valid: ${[...VALID_FIATS].join(", ")}.`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    d.code = DIAG_INVALID_FIAT;
                    d.source = "aiosend";
                    diagnostics.push(d);
                }
            }
        }

        // ─── Missing async def + missing return type ───────────────────────
        // Any function in an aiosend file that calls await should be async
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            callRE.lastIndex = 0;
            if (!callRE.test(line)) {
                continue;
            }
            // Look backwards for the enclosing def
            for (let j = i; j >= Math.max(0, i - 30); j--) {
                const sig = FUNC_DEF_RE.exec(lines[j]);
                if (!sig) {
                    continue;
                }
                const defLine = document.lineAt(j);

                if (!sig[1]) {
                    const range = new vscode.Range(j, defLine.firstNonWhitespaceCharacterIndex, j, defLine.text.length);
                    const d = new vscode.Diagnostic(
                        range,
                        "Function uses aiosend await calls — must be `async def`.",
                        vscode.DiagnosticSeverity.Error
                    );
                    d.code = DIAG_MISSING_ASYNC;
                    d.source = "aiosend";
                    diagnostics.push(d);
                }

                if (!sig[3]) {
                    const range = new vscode.Range(j, defLine.firstNonWhitespaceCharacterIndex, j, defLine.text.length);
                    const d = new vscode.Diagnostic(
                        range,
                        "Missing return type annotation `-> Type`.",
                        vscode.DiagnosticSeverity.Warning
                    );
                    d.code = DIAG_MISSING_RETURN;
                    d.source = "aiosend";
                    diagnostics.push(d);
                }

                break;
            }
        }

        // ─── Duplicate spend_id within file ───────────────────────────────
        const spendIds = new Map<string, number[]>();
        for (let i = 0; i < lines.length; i++) {
            const sm = SPEND_ID_RE.exec(lines[i]);
            if (sm) {
                if (!spendIds.has(sm[1])) {
                    spendIds.set(sm[1], []);
                }
                spendIds.get(sm[1])!.push(i);
            }
        }
        for (const [id, lineNums] of spendIds) {
            if (lineNums.length < 2) {
                continue;
            }
            for (const lineNum of lineNums) {
                const col = lines[lineNum].indexOf(id);
                const range = new vscode.Range(lineNum, col, lineNum, col + id.length);
                const d = new vscode.Diagnostic(
                    range,
                    `Duplicate spend_id "${id}" — each transfer must have a unique spend_id.`,
                    vscode.DiagnosticSeverity.Warning
                );
                d.code = DIAG_DUPLICATE_SPEND;
                d.source = "aiosend";
                diagnostics.push(d);
            }
        }

        return diagnostics;
    }
}
