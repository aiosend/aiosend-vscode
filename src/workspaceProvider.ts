import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export interface CallInfo {
    method: string;
    filePath: string;
    line: number;
    lineText: string;
}

const INSTANCE_RE = /(\w+)\s*=\s*CryptoPay\s*\(/;
const IMPORT_RE   = /(?:from\s+aiosend\s+import|import\s+aiosend)/;

const ASYNC_METHODS = [
    "get_me", "create_invoice", "delete_invoice", "get_invoices", "get_invoice",
    "create_check", "delete_check", "get_checks", "get_check",
    "transfer", "get_transfers", "get_transfer",
    "get_balance", "get_balance_by_asset", "get_exchange_rates", "exchange",
    "get_currencies", "get_stats",
];

function findInstanceNames(lines: string[]): Set<string> {
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
        `\\b(?:${escaped})\\.(${ASYNC_METHODS.join("|")})\\s*\\(`,
        "g"
    );
}

export function parseCallsFromFile(filePath: string): CallInfo[] {
    let content: string;
    try {
        content = fs.readFileSync(filePath, "utf-8");
    } catch {
        return [];
    }

    if (!IMPORT_RE.test(content) && !content.includes("CryptoPay(")) {
        return [];
    }

    const lines   = content.split("\n");
    const names   = findInstanceNames(lines);
    if (names.size === 0) {
        return [];
    }

    const callRE  = buildCallRE(names);
    const calls: CallInfo[] = [];

    for (let i = 0; i < lines.length; i++) {
        callRE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = callRE.exec(lines[i])) !== null) {
            calls.push({
                method:   m[1],
                filePath,
                line:     i,
                lineText: lines[i].trim(),
            });
        }
    }

    return calls;
}

// ─── Tree Items ───────────────────────────────────────────────────────────────

class EmptyItem extends vscode.TreeItem {
    constructor() {
        super("No aiosend usage found in workspace", vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon("info");
    }
}

export class WorkspaceFileItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
        public readonly calls: CallInfo[]
    ) {
        super(path.basename(filePath), vscode.TreeItemCollapsibleState.Expanded);
        this.description  = `${calls.length} call${calls.length !== 1 ? "s" : ""}`;
        this.tooltip      = filePath;
        this.iconPath     = new vscode.ThemeIcon("file-code");
        this.contextValue = "wsFile";
        this.resourceUri  = vscode.Uri.file(filePath);
    }
}

export class WorkspaceCallItem extends vscode.TreeItem {
    constructor(public readonly call: CallInfo) {
        super(call.method, vscode.TreeItemCollapsibleState.None);
        this.description  = `:${call.line + 1}`;
        this.tooltip      = call.lineText;
        this.iconPath     = new vscode.ThemeIcon("symbol-method");
        this.contextValue = "wsCall";
        this.command      = {
            command:   "aiosend.goToCall",
            title:     "Go to call",
            arguments: [call],
        };
    }
}

type WorkspaceTreeItem = WorkspaceFileItem | WorkspaceCallItem | EmptyItem;

// ─── Provider ─────────────────────────────────────────────────────────────────

export class AiosendWorkspaceProvider
    implements vscode.TreeDataProvider<WorkspaceTreeItem>
{
    private _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private callsByFile = new Map<string, CallInfo[]>();

    constructor(context: vscode.ExtensionContext) {
        vscode.workspace.onDidSaveTextDocument(
            (doc) => { if (doc.languageId === "python") { this.parseFile(doc.fileName); this.fire(); } },
            null, context.subscriptions
        );
        vscode.workspace.onDidOpenTextDocument(
            (doc) => { if (doc.languageId === "python") { this.parseFile(doc.fileName); this.fire(); } },
            null, context.subscriptions
        );
        vscode.workspace.onDidCloseTextDocument(
            (doc) => { this.callsByFile.delete(doc.fileName); this.fire(); },
            null, context.subscriptions
        );

        this.scanWorkspace();
    }

    refresh(): void {
        this.callsByFile.clear();
        this.scanWorkspace();
    }

    getCallCount(): number {
        let total = 0;
        for (const calls of this.callsByFile.values()) {
            total += calls.length;
        }
        return total;
    }

    private fire(): void {
        this._onDidChangeTreeData.fire();
    }

    private parseFile(filePath: string): void {
        const calls = parseCallsFromFile(filePath);
        if (calls.length > 0) {
            this.callsByFile.set(filePath, calls);
        } else {
            this.callsByFile.delete(filePath);
        }
    }

    private scanWorkspace(): void {
        vscode.workspace.textDocuments.forEach((doc) => {
            if (doc.languageId === "python") {
                this.parseFile(doc.fileName);
            }
        });

        vscode.workspace
            .findFiles(
                "**/*.py",
                "{**/node_modules/**,**/.venv/**,**/venv/**,**/env/**,**/__pycache__/**}",
                200
            )
            .then((uris) => {
                uris.forEach((uri) => this.parseFile(uri.fsPath));
                this.fire();
            });
    }

    getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: WorkspaceTreeItem): WorkspaceTreeItem[] {
        if (!element) {
            if (this.callsByFile.size === 0) {
                return [new EmptyItem()];
            }
            return Array.from(this.callsByFile.entries()).map(
                ([fp, calls]) => new WorkspaceFileItem(fp, calls)
            );
        }

        if (element instanceof WorkspaceFileItem) {
            return element.calls.map((c) => new WorkspaceCallItem(c));
        }

        return [];
    }
}
