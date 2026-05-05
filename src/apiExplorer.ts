import * as vscode from "vscode";

export interface MethodDef {
    name: string;
    signature: string;
    description: string;
    returns: string;
    docUrl: string;
}

export interface CategoryDef {
    label: string;
    icon: string;
    methods: MethodDef[];
}

export interface EnumDef {
    name: string;
    values: string[];
    description: string;
}

export interface ModelDef {
    name: string;
    description: string;
    fields: string[];
}

const DOCS = "https://aiosend.readthedocs.io/ru/stable/";

const CATEGORIES: CategoryDef[] = [
    {
        label: "App",
        icon: "symbol-misc",
        methods: [
            {
                name: "get_me",
                signature: "async get_me() -> App",
                description: "Get app information — name and payment bot username.",
                returns: "App",
                docUrl: DOCS,
            },
        ],
    },
    {
        label: "Invoices",
        icon: "file-text",
        methods: [
            {
                name: "create_invoice",
                signature: "async create_invoice(amount, asset, *, description?, payload?, expires_in?, ...) -> Invoice",
                description: "Create a payment invoice. Returns a pay_url the user opens to pay.",
                returns: "Invoice",
                docUrl: DOCS,
            },
            {
                name: "delete_invoice",
                signature: "async delete_invoice(invoice_id: int) -> bool",
                description: "Delete an invoice by ID. Only active invoices can be deleted.",
                returns: "bool",
                docUrl: DOCS,
            },
            {
                name: "get_invoices",
                signature: "async get_invoices(*, asset?, fiat?, ids?, status?, offset?, count?) -> ItemsList[Invoice]",
                description: "List invoices with optional filters.",
                returns: "ItemsList[Invoice]",
                docUrl: DOCS,
            },
            {
                name: "get_invoice",
                signature: "async get_invoice(invoice_id: int) -> Invoice",
                description: "Fetch a single invoice by ID.",
                returns: "Invoice",
                docUrl: DOCS,
            },
        ],
    },
    {
        label: "Checks",
        icon: "check",
        methods: [
            {
                name: "create_check",
                signature: "async create_check(asset, amount, *, pin_to_user_id?, pin_to_username?) -> Check",
                description: "Create a crypto check redeemable once via Telegram.",
                returns: "Check",
                docUrl: DOCS,
            },
            {
                name: "delete_check",
                signature: "async delete_check(check_id: int) -> bool",
                description: "Delete an active check by ID.",
                returns: "bool",
                docUrl: DOCS,
            },
            {
                name: "get_checks",
                signature: "async get_checks(*, asset?, ids?, status?, offset?, count?) -> ItemsList[Check]",
                description: "List checks with optional filters.",
                returns: "ItemsList[Check]",
                docUrl: DOCS,
            },
            {
                name: "get_check",
                signature: "async get_check(check_id: int) -> Check",
                description: "Fetch a single check by ID.",
                returns: "Check",
                docUrl: DOCS,
            },
        ],
    },
    {
        label: "Transfers",
        icon: "arrow-swap",
        methods: [
            {
                name: "transfer",
                signature: "async transfer(user_id, asset, amount, spend_id, *, comment?, disable_send_notification?) -> Transfer",
                description: "Transfer crypto from app balance to a Telegram user. spend_id must be unique per transfer.",
                returns: "Transfer",
                docUrl: DOCS,
            },
            {
                name: "get_transfers",
                signature: "async get_transfers(*, asset?, ids?, spend_id?, offset?, count?) -> ItemsList[Transfer]",
                description: "List transfers with optional filters.",
                returns: "ItemsList[Transfer]",
                docUrl: DOCS,
            },
            {
                name: "get_transfer",
                signature: "async get_transfer(transfer_id: int) -> Transfer",
                description: "Fetch a single transfer by ID.",
                returns: "Transfer",
                docUrl: DOCS,
            },
        ],
    },
    {
        label: "Balance & Rates",
        icon: "symbol-numeric",
        methods: [
            {
                name: "get_balance",
                signature: "async get_balance() -> list[Balance]",
                description: "Get app balance across all supported assets.",
                returns: "list[Balance]",
                docUrl: DOCS,
            },
            {
                name: "get_balance_by_asset",
                signature: "async get_balance_by_asset(asset: Asset | str) -> Balance",
                description: "Get balance for a specific cryptocurrency.",
                returns: "Balance",
                docUrl: DOCS,
            },
            {
                name: "get_exchange_rates",
                signature: "async get_exchange_rates() -> ItemsList[ExchangeRate]",
                description: "Get current exchange rates for all supported currencies.",
                returns: "ItemsList[ExchangeRate]",
                docUrl: DOCS,
            },
            {
                name: "exchange",
                signature: "async exchange(amount, source, target) -> str",
                description: "Convert amount from source currency to target currency.",
                returns: "str",
                docUrl: DOCS,
            },
        ],
    },
    {
        label: "Info",
        icon: "info",
        methods: [
            {
                name: "get_currencies",
                signature: "async get_currencies() -> ItemsList[Currency]",
                description: "List all supported fiat and crypto currencies.",
                returns: "ItemsList[Currency]",
                docUrl: DOCS,
            },
            {
                name: "get_stats",
                signature: "async get_stats() -> AppStats",
                description: "Get app statistics — trading volumes by asset.",
                returns: "AppStats",
                docUrl: DOCS,
            },
        ],
    },
];

const MODELS: ModelDef[] = [
    {
        name: "Invoice",
        description: "Payment invoice created via create_invoice()",
        fields: ["invoice_id", "hash", "asset", "amount", "status", "pay_url", "bot_invoice_url", "created_at", "expired_at", "description", "payload"],
    },
    {
        name: "Check",
        description: "Crypto check redeemable once via Telegram",
        fields: ["check_id", "hash", "asset", "amount", "status", "bot_check_url", "web_app_check_url", "created_at", "activated_at", "expires_at"],
    },
    {
        name: "Transfer",
        description: "Completed crypto transfer to a Telegram user",
        fields: ["transfer_id", "user_id", "asset", "amount", "status", "completed_at"],
    },
    {
        name: "Balance",
        description: "App balance for a single asset",
        fields: ["crypto_code", "available", "onhold"],
    },
    {
        name: "ExchangeRate",
        description: "Exchange rate for a currency pair",
        fields: ["is_crypto", "is_blockchain", "currency_code", "rate"],
    },
    {
        name: "Currency",
        description: "Supported currency (crypto or fiat)",
        fields: ["code", "name", "is_blockchain", "is_stablecoin", "is_fcoin", "url"],
    },
    {
        name: "AppStats",
        description: "App trading volume statistics by asset",
        fields: ["volume_usdt", "volume_ton", "volume_btc", "volume_eth", "volume_ltc", "volume_bnb", "volume_trx", "volume_usdc"],
    },
    {
        name: "App",
        description: "Application info returned by get_me()",
        fields: ["name", "payment_processing_bot_username"],
    },
];

const ENUMS: EnumDef[] = [
    {
        name: "Asset",
        description: "Supported cryptocurrencies",
        values: ["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC", "JET"],
    },
    {
        name: "Fiat",
        description: "Supported fiat currencies",
        values: ["USD", "EUR", "RUB", "UAH", "AED", "AMD", "AZN", "BRL", "BYN", "CNY", "GBP", "GEL", "IDR", "ILS", "INR", "KGS", "KZT", "PLN", "THB", "TJS", "TRY", "UZS"],
    },
    {
        name: "InvoiceStatus",
        description: "Possible states of an Invoice",
        values: ["active", "paid", "expired"],
    },
    {
        name: "CheckStatus",
        description: "Possible states of a Check",
        values: ["active", "activated", "expired"],
    },
    {
        name: "UpdateType",
        description: "Webhook/polling update event types",
        values: ["invoice_paid", "invoice_expired", "check_activated", "check_expired"],
    },
    {
        name: "PaidBtnName",
        description: "Button label shown after payment",
        values: ["viewItem", "openApp", "openUrl", "callback"],
    },
];

class SectionItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        icon: string,
        public readonly children: vscode.TreeItem[]
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon(icon);
        this.contextValue = "section";
    }
}

export class ApiMethodItem extends vscode.TreeItem {
    constructor(public readonly method: MethodDef) {
        super(method.name, vscode.TreeItemCollapsibleState.None);
        this.description = `→ ${method.returns}`;
        this.tooltip = new vscode.MarkdownString(
            `**${method.name}**\n\n${method.description}\n\n\`\`\`python\n${method.signature}\n\`\`\``
        );
        this.iconPath = new vscode.ThemeIcon("symbol-method");
        this.contextValue = "method";
    }
}

class ModelItem extends vscode.TreeItem {
    constructor(model: ModelDef) {
        super(model.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = model.description;
        this.tooltip = new vscode.MarkdownString(
            `**${model.name}**\n\n${model.description}\n\nFields: \`${model.fields.join("`, `")}\``
        );
        this.iconPath = new vscode.ThemeIcon("symbol-class");
        this.contextValue = "model";
    }
}

class ModelFieldItem extends vscode.TreeItem {
    constructor(field: string) {
        super(field, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon("symbol-field");
        this.contextValue = "field";
    }
}

class EnumItem extends vscode.TreeItem {
    constructor(enumDef: EnumDef) {
        super(enumDef.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = enumDef.description;
        this.tooltip = new vscode.MarkdownString(
            `**${enumDef.name}**\n\n${enumDef.description}\n\nValues: \`${enumDef.values.join("`, `")}\``
        );
        this.iconPath = new vscode.ThemeIcon("symbol-enum");
        this.contextValue = "enum";
    }
}

class EnumValueItem extends vscode.TreeItem {
    constructor(value: string) {
        super(value, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon("symbol-enum-member");
        this.contextValue = "enumValue";
    }
}

type AnyTreeItem =
    | SectionItem
    | ApiMethodItem
    | ModelItem
    | ModelFieldItem
    | EnumItem
    | EnumValueItem;

export class AiosendApiExplorer implements vscode.TreeDataProvider<AnyTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AnyTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(_context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AnyTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AnyTreeItem): AnyTreeItem[] {
        if (!element) {
            return this.buildRoot();
        }

        if (element instanceof SectionItem) {
            return element.children as AnyTreeItem[];
        }

        if (element instanceof ModelItem) {
            const model = MODELS.find((m) => m.name === element.label);
            return model ? model.fields.map((f) => new ModelFieldItem(f)) : [];
        }

        if (element instanceof EnumItem) {
            const e = ENUMS.find((en) => en.name === element.label);
            return e ? e.values.map((v) => new EnumValueItem(v)) : [];
        }

        return [];
    }

    private buildRoot(): AnyTreeItem[] {
        const methodSections = CATEGORIES.map(
            (cat) =>
                new SectionItem(
                    cat.label,
                    cat.icon,
                    cat.methods.map((m) => new ApiMethodItem(m))
                )
        );

        const modelsSection = new SectionItem(
            "Models",
            "symbol-class",
            MODELS.map((m) => new ModelItem(m))
        );

        const enumsSection = new SectionItem(
            "Enums",
            "symbol-enum",
            ENUMS.map((e) => new EnumItem(e))
        );

        return [...methodSections, modelsSection, enumsSection];
    }
}
