import * as https from "https";
import * as vscode from "vscode";
import { isAiosendFile } from "./extension";

interface ParamDoc {
    name: string;
    type: string;
    required: boolean;
    desc: string;
}

interface MethodDoc {
    description: string;
    params: ParamDoc[];
    returns: string;
    example: string;
}

const DOCS: Record<string, MethodDoc> = {
    get_me: {
        description: "Get application info — name and payment processing bot username.",
        params: [],
        returns: "App",
        example: "app = await cp.get_me()\nprint(app.name)",
    },
    create_invoice: {
        description: "Create a payment invoice. Share `invoice.pay_url` with the user to collect payment.",
        params: [
            { name: "amount",            type: "float | Decimal", required: true,  desc: "Payment amount" },
            { name: "asset",             type: "Asset | str",     required: true,  desc: "Crypto: USDT, TON, BTC, ETH, LTC, BNB, TRX, USDC" },
            { name: "description",       type: "str",             required: false, desc: "Shown to payer (max 1024 chars)" },
            { name: "hidden_message",    type: "str",             required: false, desc: "Shown after payment (max 2048 chars)" },
            { name: "paid_btn_name",     type: "PaidBtnName",     required: false, desc: "Button label: viewItem | openApp | openUrl | callback" },
            { name: "paid_btn_url",      type: "str",             required: false, desc: "URL for the paid button" },
            { name: "payload",           type: "str",             required: false, desc: "Custom data (max 4096 chars)" },
            { name: "allow_comments",    type: "bool",            required: false, desc: "Allow payer comment (default True)" },
            { name: "allow_anonymous",   type: "bool",            required: false, desc: "Allow anonymous payment (default True)" },
            { name: "expires_in",        type: "int",             required: false, desc: "Lifetime in seconds (1–2678400)" },
        ],
        returns: "Invoice",
        example: 'invoice = await cp.create_invoice(\n    amount=50,\n    asset="USDT",\n    description="Premium subscription"\n)\nprint(invoice.pay_url)',
    },
    delete_invoice: {
        description: "Delete an invoice. Only invoices with `status=active` can be deleted.",
        params: [
            { name: "invoice_id", type: "int", required: true, desc: "ID of the invoice to delete" },
        ],
        returns: "bool",
        example: "deleted = await cp.delete_invoice(invoice_id=123)\nprint(deleted)  # True",
    },
    get_invoices: {
        description: "List invoices with optional filters. Returns up to 1000 results.",
        params: [
            { name: "asset",  type: "Asset | str",         required: false, desc: "Filter by crypto asset" },
            { name: "fiat",   type: "Fiat | str",           required: false, desc: "Filter by fiat currency" },
            { name: "ids",    type: "list[int]",            required: false, desc: "Filter by invoice IDs (max 1000)" },
            { name: "status", type: "InvoiceStatus | str",  required: false, desc: "Filter: active | paid | expired" },
            { name: "offset", type: "int",                  required: false, desc: "Pagination offset (default 0)" },
            { name: "count",  type: "int",                  required: false, desc: "Results per page (default 100, max 1000)" },
        ],
        returns: "ItemsList[Invoice]",
        example: 'result = await cp.get_invoices(asset="USDT", status="paid")\nfor inv in result.items:\n    print(inv.invoice_id)',
    },
    get_invoice: {
        description: "Fetch a single invoice by its ID.",
        params: [
            { name: "invoice_id", type: "int", required: true, desc: "Invoice ID" },
        ],
        returns: "Invoice",
        example: "invoice = await cp.get_invoice(invoice_id=123)",
    },
    create_check: {
        description: "Create a crypto check — a one-time redeemable link sent via Telegram.",
        params: [
            { name: "asset",            type: "Asset | str",     required: true,  desc: "Crypto asset: USDT, TON, BTC, ETH, LTC, BNB, TRX, USDC" },
            { name: "amount",           type: "float | Decimal", required: true,  desc: "Check amount" },
            { name: "pin_to_user_id",   type: "int",             required: false, desc: "Restrict activation to this Telegram user ID" },
            { name: "pin_to_username",  type: "str",             required: false, desc: "Restrict activation to this Telegram username" },
        ],
        returns: "Check",
        example: 'check = await cp.create_check(asset="TON", amount=5)\nprint(check.bot_check_url)',
    },
    delete_check: {
        description: "Delete an active check by ID.",
        params: [
            { name: "check_id", type: "int", required: true, desc: "Check ID" },
        ],
        returns: "bool",
        example: "deleted = await cp.delete_check(check_id=456)",
    },
    get_checks: {
        description: "List checks with optional filters.",
        params: [
            { name: "asset",  type: "Asset | str",        required: false, desc: "Filter by crypto asset" },
            { name: "ids",    type: "list[int]",           required: false, desc: "Filter by check IDs (max 1000)" },
            { name: "status", type: "CheckStatus | str",   required: false, desc: "Filter: active | activated | expired" },
            { name: "offset", type: "int",                 required: false, desc: "Pagination offset" },
            { name: "count",  type: "int",                 required: false, desc: "Results per page (max 1000)" },
        ],
        returns: "ItemsList[Check]",
        example: 'result = await cp.get_checks(status="active")',
    },
    get_check: {
        description: "Fetch a single check by its ID.",
        params: [
            { name: "check_id", type: "int", required: true, desc: "Check ID" },
        ],
        returns: "Check",
        example: "check = await cp.get_check(check_id=456)",
    },
    transfer: {
        description: "Send crypto from app balance to a Telegram user. `spend_id` must be globally unique — it prevents accidental duplicate transfers.",
        params: [
            { name: "user_id",                   type: "int",             required: true,  desc: "Telegram user ID of the recipient" },
            { name: "asset",                     type: "Asset | str",     required: true,  desc: "Crypto asset to send" },
            { name: "amount",                    type: "float | Decimal", required: true,  desc: "Amount to transfer" },
            { name: "spend_id",                  type: "str",             required: true,  desc: "Unique string to prevent duplicates (max 64 chars)" },
            { name: "comment",                   type: "str",             required: false, desc: "Comment shown to recipient (max 1024 chars)" },
            { name: "disable_send_notification", type: "bool",            required: false, desc: "Skip Telegram notification to recipient" },
        ],
        returns: "Transfer",
        example: 'transfer = await cp.transfer(\n    user_id=123456789,\n    asset="USDT",\n    amount=10,\n    spend_id="order-42-reward"\n)',
    },
    get_transfers: {
        description: "List transfers with optional filters.",
        params: [
            { name: "asset",    type: "Asset | str", required: false, desc: "Filter by asset" },
            { name: "ids",      type: "list[int]",   required: false, desc: "Filter by transfer IDs (max 1000)" },
            { name: "spend_id", type: "str",         required: false, desc: "Filter by spend_id" },
            { name: "offset",   type: "int",         required: false, desc: "Pagination offset" },
            { name: "count",    type: "int",         required: false, desc: "Results per page (max 1000)" },
        ],
        returns: "ItemsList[Transfer]",
        example: 'result = await cp.get_transfers(asset="USDT")',
    },
    get_transfer: {
        description: "Fetch a single transfer by its ID.",
        params: [
            { name: "transfer_id", type: "int", required: true, desc: "Transfer ID" },
        ],
        returns: "Transfer",
        example: "transfer = await cp.get_transfer(transfer_id=789)",
    },
    get_balance: {
        description: "Get the app balance for all supported crypto assets.",
        params: [],
        returns: "list[Balance]",
        example: "balances = await cp.get_balance()\nfor b in balances:\n    print(f'{b.crypto_code}: {b.available}')",
    },
    get_balance_by_asset: {
        description: "Get balance for a specific crypto asset.",
        params: [
            { name: "asset", type: "Asset | str", required: true, desc: "Crypto asset code (e.g. USDT)" },
        ],
        returns: "Balance",
        example: 'balance = await cp.get_balance_by_asset("USDT")\nprint(balance.available)',
    },
    get_exchange_rates: {
        description: "Get current exchange rates for all supported currencies.",
        params: [],
        returns: "ItemsList[ExchangeRate]",
        example: "rates = await cp.get_exchange_rates()",
    },
    exchange: {
        description: "Convert an amount from one currency to another using current rates.",
        params: [
            { name: "amount", type: "float | Decimal", required: true, desc: "Amount to convert" },
            { name: "source", type: "str",             required: true, desc: "Source currency code (e.g. USDT)" },
            { name: "target", type: "str",             required: true, desc: "Target currency code (e.g. TON)" },
        ],
        returns: "str",
        example: 'result = await cp.exchange(100, "USDT", "TON")\nprint(result)  # "34.5"',
    },
    get_currencies: {
        description: "List all supported fiat and crypto currencies with metadata.",
        params: [],
        returns: "ItemsList[Currency]",
        example: "currencies = await cp.get_currencies()",
    },
    get_stats: {
        description: "Get app statistics — trading volumes by asset.",
        params: [],
        returns: "AppStats",
        example: "stats = await cp.get_stats()\nprint(stats.volume_usdt)",
    },
};

const CALL_RE = /\b(\w+)\.(get_me|create_invoice|delete_invoice|get_invoices|get_invoice|create_check|delete_check|get_checks|get_check|transfer|get_transfers|get_transfer|get_balance|get_balance_by_asset|get_exchange_rates|exchange|get_currencies|get_stats)\s*\(/;

const TOKEN_RE = /CryptoPay\s*\(\s*["']([^"']+)["']|token\s*=\s*["']([^"']+)["']/;

interface AppInfo {
    name: string;
    appId: number;
    bot: string;
    isTestnet: boolean;
    transferEnabled: boolean;
    checkEnabled: boolean;
}

const CACHE_TTL = 60_000;
const appInfoCache = new Map<string, { info: AppInfo | null; ts: number }>();
const probeLog = vscode.window.createOutputChannel("aiosend probe");

function httpGet(hostname: string, path: string, token: string): Promise<string | null> {
    return new Promise((resolve) => {
        const req = https.get(
            { hostname, path, headers: { "Crypto-Pay-API-Token": token } },
            (res) => {
                let data = "";
                res.setEncoding("utf8");
                res.on("data", (c: string) => { data += c; });
                res.on("end", () => resolve(data));
            }
        );
        req.on("error", () => resolve(null));
        req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    });
}

function httpPost(hostname: string, path: string, token: string, body: string): Promise<string | null> {
    return new Promise((resolve) => {
        const buf = Buffer.from(body);
        const req = https.request(
            {
                hostname,
                path,
                method: "POST",
                headers: {
                    "Crypto-Pay-API-Token": token,
                    "Content-Type": "application/json",
                    "Content-Length": buf.length,
                },
            },
            (res) => {
                let data = "";
                res.setEncoding("utf8");
                res.on("data", (c: string) => { data += c; });
                res.on("end", () => resolve(data));
            }
        );
        req.on("error", () => resolve(null));
        req.setTimeout(3000, () => { req.destroy(); resolve(null); });
        req.write(buf);
        req.end();
    });
}

async function fetchAppInfo(token: string): Promise<AppInfo | null> {
    const cached = appInfoCache.get(token);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.info;
    }

    try {
        const tryGetMe = async (hostname: string) => {
            const raw = await httpGet(hostname, "/api/getMe", token);
            if (!raw) { return null; }
            const json = JSON.parse(raw);
            if (json.ok && json.result?.name) {
                return { result: json.result as Record<string, unknown>, hostname };
            }
            return null;
        };

        const got = await tryGetMe("pay.crypt.bot") ?? await tryGetMe("testnet-pay.crypt.bot");
        if (!got) {
            appInfoCache.set(token, { info: null, ts: Date.now() });
            return null;
        }

        const { result, hostname } = got;

        const [transferRaw, checkRaw] = await Promise.all([
            httpPost(hostname, "/api/transfer",    token, JSON.stringify({ user_id: 0, asset: "USDT", amount: 0.0001, spend_id: "vscode-probe" })),
            httpPost(hostname, "/api/createCheck", token, JSON.stringify({ asset: "USDT", amount: 0.0001 })),
        ]);

        probeLog.appendLine(`[transfer]    ${transferRaw}`);
        probeLog.appendLine(`[createCheck] ${checkRaw}`);

        const isDisabled = (raw: string | null) => {
            if (!raw) { return false; }
            try {
                const j = JSON.parse(raw);
                const name: string = j.error?.name ?? "";
                return j.ok === false && (name === "METHOD_BLOCKED" || name === "METHOD_DISABLED");
            } catch { return false; }
        };

        const info: AppInfo = {
            name:            result.name as string,
            appId:           result.app_id as number,
            bot:             result.payment_processing_bot_username as string,
            isTestnet:       result.payment_processing_bot_username === "CryptoTestnetBot",
            transferEnabled: !isDisabled(transferRaw),
            checkEnabled:    !isDisabled(checkRaw),
        };

        appInfoCache.set(token, { info, ts: Date.now() });
        return info;
    } catch {
        appInfoCache.set(token, { info: null, ts: Date.now() });
        return null;
    }
}

function buildParamTable(params: ParamDoc[]): string {
    if (params.length === 0) {
        return "*No parameters.*";
    }
    const rows = params
        .map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.required ? "✅" : "➖"} | ${p.desc} |`)
        .join("\n");
    return `| Parameter | Type | Req | Description |\n|:--|:--|:--:|:--|\n${rows}`;
}

export class AiosendHoverProvider implements vscode.HoverProvider {
    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Hover | null> {
        if (document.languageId !== "python") {
            return null;
        }
        if (!isAiosendFile(document.getText())) {
            return null;
        }

        const line = document.lineAt(position.line).text;

        // ─── Token hover ────────────────────────────────────────────────────
        const tm = TOKEN_RE.exec(line);
        if (tm) {
            const token = tm[1] ?? tm[2];
            const quote = line.includes(`"${token}"`) ? '"' : "'";
            const tokenStart = line.indexOf(`${quote}${token}${quote}`) + 1;
            const tokenEnd   = tokenStart + token.length;

            if (position.character >= tokenStart && position.character <= tokenEnd) {
                const info = await fetchAppInfo(token);
                const md = new vscode.MarkdownString();
                md.isTrusted = true;
                if (info) {
                    const net = info.isTestnet ? " `testnet`" : "";
                    md.appendMarkdown(`**Crypto Pay App**${net}\n\n`);
                    md.appendMarkdown(`| | |\n|:--|:--|\n`);
                    md.appendMarkdown(`| Name | \`${info.name}\` |\n`);
                    md.appendMarkdown(`| App ID | \`${info.appId}\` |\n`);
                    md.appendMarkdown(`| Bot | \`@${info.bot}\` |\n`);
                    md.appendMarkdown(`| transfer() | ${info.transferEnabled ? "✅ enabled" : "❌ disabled"} |\n`);
                    md.appendMarkdown(`| create_check() | ${info.checkEnabled ? "✅ enabled" : "❌ disabled"} |`);
                } else {
                    md.appendMarkdown(`**Crypto Pay Token**\n\n`);
                    md.appendMarkdown(`⚠️ Could not verify token — invalid or no connection.`);
                }
                return new vscode.Hover(md);
            }
        }

        // ─── Method hover ────────────────────────────────────────────────────
        const m = CALL_RE.exec(line);
        if (!m) {
            return null;
        }

        const methodName = m[2];
        const doc = DOCS[methodName];
        if (!doc) {
            return null;
        }

        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.appendMarkdown(`**aiosend** — \`${methodName}()\`\n\n`);
        md.appendMarkdown(`${doc.description}\n\n`);
        md.appendMarkdown(`${buildParamTable(doc.params)}\n\n`);
        md.appendMarkdown(`**Returns:** \`${doc.returns}\`\n\n`);
        md.appendMarkdown("**Example:**\n");
        md.appendCodeblock(doc.example, "python");
        md.appendMarkdown(
            `\n[Open documentation](https://aiosend.readthedocs.io/ru/stable/)`
        );

        return new vscode.Hover(md);
    }
}
