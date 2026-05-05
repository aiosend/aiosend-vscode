import * as vscode from "vscode";
import { isAiosendFile } from "./extension";

const VALID_ASSETS = ["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC", "JET"];
const VALID_FIATS  = [
    "USD", "EUR", "RUB", "UAH", "AED", "AMD", "AZN", "BRL", "BYN",
    "CNY", "GBP", "GEL", "IDR", "ILS", "INR", "KGS", "KZT", "PLN",
    "THB", "TJS", "TRY", "UZS",
];

interface MethodCompletion {
    name: string;
    detail: string;
    doc: string;
    snippet: string;
}

const METHODS: MethodCompletion[] = [
    {
        name: "get_me",
        detail: "async get_me() -> App",
        doc: "Get app information — name and payment bot username.",
        snippet: "get_me()",
    },
    {
        name: "create_invoice",
        detail: "async create_invoice(amount, asset, ...) -> Invoice",
        doc: "Create a payment invoice. Returns pay_url for the payer.",
        snippet: 'create_invoice(\n\tamount=${1:100},\n\tasset="${2|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}",\n\tdescription="${3:Payment description}"\n)',
    },
    {
        name: "delete_invoice",
        detail: "async delete_invoice(invoice_id: int) -> bool",
        doc: "Delete an active invoice by ID.",
        snippet: "delete_invoice(invoice_id=${1:invoice_id})",
    },
    {
        name: "get_invoices",
        detail: "async get_invoices(...) -> ItemsList[Invoice]",
        doc: "List invoices with optional filters.",
        snippet: 'get_invoices(asset="${1|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}")',
    },
    {
        name: "get_invoice",
        detail: "async get_invoice(invoice_id: int) -> Invoice",
        doc: "Fetch a single invoice by ID.",
        snippet: "get_invoice(invoice_id=${1:invoice_id})",
    },
    {
        name: "create_check",
        detail: "async create_check(asset, amount, ...) -> Check",
        doc: "Create a one-time crypto check redeemable via Telegram.",
        snippet: 'create_check(\n\tasset="${1|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}",\n\tamount=${2:100}\n)',
    },
    {
        name: "delete_check",
        detail: "async delete_check(check_id: int) -> bool",
        doc: "Delete an active check by ID.",
        snippet: "delete_check(check_id=${1:check_id})",
    },
    {
        name: "get_checks",
        detail: "async get_checks(...) -> ItemsList[Check]",
        doc: "List checks with optional filters.",
        snippet: 'get_checks(asset="${1|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}")',
    },
    {
        name: "get_check",
        detail: "async get_check(check_id: int) -> Check",
        doc: "Fetch a single check by ID.",
        snippet: "get_check(check_id=${1:check_id})",
    },
    {
        name: "transfer",
        detail: "async transfer(user_id, asset, amount, spend_id, ...) -> Transfer",
        doc: "Send crypto from app balance to a Telegram user.",
        snippet: 'transfer(\n\tuser_id=${1:user_id},\n\tasset="${2|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}",\n\tamount=${3:100},\n\tspend_id="${4:unique-spend-id}"\n)',
    },
    {
        name: "get_transfers",
        detail: "async get_transfers(...) -> ItemsList[Transfer]",
        doc: "List transfers with optional filters.",
        snippet: 'get_transfers(asset="${1|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}")',
    },
    {
        name: "get_transfer",
        detail: "async get_transfer(transfer_id: int) -> Transfer",
        doc: "Fetch a single transfer by ID.",
        snippet: "get_transfer(transfer_id=${1:transfer_id})",
    },
    {
        name: "get_balance",
        detail: "async get_balance() -> list[Balance]",
        doc: "Get app balance for all assets.",
        snippet: "get_balance()",
    },
    {
        name: "get_balance_by_asset",
        detail: "async get_balance_by_asset(asset) -> Balance",
        doc: "Get balance for a specific asset.",
        snippet: 'get_balance_by_asset("${1|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}")',
    },
    {
        name: "get_exchange_rates",
        detail: "async get_exchange_rates() -> ItemsList[ExchangeRate]",
        doc: "Get current exchange rates.",
        snippet: "get_exchange_rates()",
    },
    {
        name: "exchange",
        detail: "async exchange(amount, source, target) -> str",
        doc: "Convert an amount between currencies.",
        snippet: 'exchange(\n\tamount=${1:100},\n\tsource="${2|USDT,TON,BTC|}",\n\ttarget="${3|USDT,TON,BTC|}"\n)',
    },
    {
        name: "get_currencies",
        detail: "async get_currencies() -> ItemsList[Currency]",
        doc: "List all supported currencies.",
        snippet: "get_currencies()",
    },
    {
        name: "get_stats",
        detail: "async get_stats() -> AppStats",
        doc: "Get app trading volume statistics.",
        snippet: "get_stats()",
    },
];

const INSTANCE_RE = /(\w+)\s*=\s*CryptoPay\s*\(/;

function findInstances(text: string): Set<string> {
    const names = new Set<string>();
    for (const line of text.split("\n")) {
        const m = INSTANCE_RE.exec(line);
        if (m) {
            names.add(m[1]);
        }
    }
    return names;
}

export class AiosendCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        if (document.languageId !== "python") {
            return [];
        }

        const text = document.getText();
        if (!isAiosendFile(text)) {
            return [];
        }

        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.slice(0, position.character);

        // Method completions after "cp." or any known instance name
        const instances = findInstances(text);
        const dotMatch = new RegExp(`\\b(${[...instances].join("|")}|cp)\\.\\s*$`).exec(linePrefix);
        if (dotMatch) {
            return METHODS.map((m) => {
                const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
                item.detail = m.detail;
                item.documentation = new vscode.MarkdownString(m.doc);
                item.insertText = new vscode.SnippetString(m.snippet);
                item.sortText = `0_${m.name}`;
                return item;
            });
        }

        // Asset value completions after asset=
        if (/\basset\s*=\s*["']?\s*$/.test(linePrefix)) {
            return VALID_ASSETS.map((a) => {
                const item = new vscode.CompletionItem(a, vscode.CompletionItemKind.EnumMember);
                item.detail = "aiosend Asset";
                item.documentation = new vscode.MarkdownString(`**Asset.${a}** — supported cryptocurrency`);
                item.insertText = a;
                return item;
            });
        }

        // Fiat value completions after fiat=
        if (/\bfiat\s*=\s*["']?\s*$/.test(linePrefix)) {
            return VALID_FIATS.map((f) => {
                const item = new vscode.CompletionItem(f, vscode.CompletionItemKind.EnumMember);
                item.detail = "aiosend Fiat";
                item.documentation = new vscode.MarkdownString(`**Fiat.${f}** — supported fiat currency`);
                item.insertText = f;
                return item;
            });
        }

        // Status completions after status=
        if (/\bstatus\s*=\s*["']?\s*$/.test(linePrefix)) {
            return ["active", "paid", "expired", "activated"].map((s) => {
                const item = new vscode.CompletionItem(s, vscode.CompletionItemKind.EnumMember);
                item.detail = "aiosend status value";
                item.insertText = s;
                return item;
            });
        }

        return [];
    }
}
