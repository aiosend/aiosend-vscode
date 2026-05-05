import * as vscode from "vscode";
import { AiosendApiExplorer } from "./apiExplorer";
import { AiosendWorkspaceProvider } from "./workspaceProvider";
import { AiosendDiagnosticsProvider } from "./diagnosticsProvider";
import { AiosendHoverProvider } from "./hoverProvider";
import { AiosendCompletionProvider } from "./completionProvider";
import { AiosendCodeLensProvider } from "./codeLensProvider";
import { AiosendQuickFixProvider } from "./quickFixProvider";
import type { ApiMethodItem } from "./apiExplorer";
import type { CallInfo } from "./workspaceProvider";

export function isAiosendFile(text: string): boolean {
    return /(?:from\s+aiosend\s+import|import\s+aiosend\b|CryptoPay\s*\()/.test(text);
}

function buildMethodSnippet(name: string): string | null {
    const map: Record<string, string> = {
        get_me:
            "await ${1:cp}.get_me()",
        create_invoice:
            "await ${1:cp}.create_invoice(\n\tamount=${2:100},\n\tasset=\"${3|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\",\n\tdescription=\"${4:Payment description}\"\n)",
        delete_invoice:
            "await ${1:cp}.delete_invoice(invoice_id=${2:invoice_id})",
        get_invoices:
            "await ${1:cp}.get_invoices(\n\tasset=\"${2|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\",\n\tstatus=\"${3|active,paid,expired|}\"\n)",
        get_invoice:
            "await ${1:cp}.get_invoice(invoice_id=${2:invoice_id})",
        create_check:
            "await ${1:cp}.create_check(\n\tasset=\"${2|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\",\n\tamount=${3:100}\n)",
        delete_check:
            "await ${1:cp}.delete_check(check_id=${2:check_id})",
        get_checks:
            "await ${1:cp}.get_checks(asset=\"${2|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\")",
        get_check:
            "await ${1:cp}.get_check(check_id=${2:check_id})",
        transfer:
            "await ${1:cp}.transfer(\n\tuser_id=${2:123456789},\n\tasset=\"${3|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\",\n\tamount=${4:100},\n\tspend_id=\"${5:unique-spend-id}\"\n)",
        get_transfers:
            "await ${1:cp}.get_transfers(asset=\"${2|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\")",
        get_transfer:
            "await ${1:cp}.get_transfer(transfer_id=${2:transfer_id})",
        get_balance:
            "await ${1:cp}.get_balance()",
        get_balance_by_asset:
            "await ${1:cp}.get_balance_by_asset(asset=\"${2|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\")",
        get_exchange_rates:
            "await ${1:cp}.get_exchange_rates()",
        exchange:
            "await ${1:cp}.exchange(\n\tamount=${2:100},\n\tsource=\"${3|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\",\n\ttarget=\"${4|USDT,TON,BTC,ETH,LTC,BNB,TRX,USDC|}\"\n)",
        get_currencies:
            "await ${1:cp}.get_currencies()",
        get_stats:
            "await ${1:cp}.get_stats()",
    };
    return map[name] ?? null;
}

export function activate(context: vscode.ExtensionContext) {
    const explorer   = new AiosendApiExplorer(context);
    const workspace  = new AiosendWorkspaceProvider(context);
    vscode.window.registerTreeDataProvider("aiosendApi", explorer);
    vscode.window.registerTreeDataProvider("aiosendWorkspace", workspace);

    new AiosendDiagnosticsProvider(context);

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            { language: "python" },
            new AiosendHoverProvider()
        ),
        vscode.languages.registerCompletionItemProvider(
            { language: "python" },
            new AiosendCompletionProvider(),
            ".",
            "("
        ),
        vscode.languages.registerCodeLensProvider(
            { language: "python" },
            new AiosendCodeLensProvider()
        ),
        vscode.languages.registerCodeActionsProvider(
            { language: "python" },
            new AiosendQuickFixProvider(),
            { providedCodeActionKinds: AiosendQuickFixProvider.providedCodeActionKinds }
        )
    );

    const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    bar.command = "aiosend.openDocs";
    bar.tooltip = "aiosend — open documentation";
    context.subscriptions.push(bar);

    const refreshBar = (doc?: vscode.TextDocument) => {
        const d = doc ?? vscode.window.activeTextEditor?.document;
        if (d?.languageId === "python" && isAiosendFile(d.getText())) {
            bar.text = "$(symbol-method) aiosend";
            bar.show();
        } else {
            bar.hide();
        }
    };

    vscode.window.onDidChangeActiveTextEditor(
        (e) => refreshBar(e?.document),
        null,
        context.subscriptions
    );
    refreshBar();

    context.subscriptions.push(
        vscode.commands.registerCommand("aiosend.refreshApi", () => explorer.refresh()),
        vscode.commands.registerCommand("aiosend.refreshWorkspace", () => workspace.refresh()),

        vscode.commands.registerCommand("aiosend.goToCall", async (call: CallInfo) => {
            const doc    = await vscode.workspace.openTextDocument(call.filePath);
            const editor = await vscode.window.showTextDocument(doc);
            const pos    = new vscode.Position(call.line, 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        }),

        vscode.commands.registerCommand("aiosend.openDocs", () => {
            vscode.env.openExternal(
                vscode.Uri.parse("https://aiosend.readthedocs.io/ru/stable/")
            );
        }),

        vscode.commands.registerCommand(
            "aiosend.insertSnippet",
            async (item: ApiMethodItem) => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage("No active editor");
                    return;
                }
                const snippet = buildMethodSnippet(item.method.name);
                if (snippet) {
                    await editor.insertSnippet(new vscode.SnippetString(snippet));
                } else {
                    vscode.window.showInformationMessage(`No snippet available for ${item.method.name}`);
                }
            }
        ),

        vscode.commands.registerCommand(
            "aiosend.copyMethodSignature",
            (item: ApiMethodItem) => {
                vscode.env.clipboard.writeText(item.method.signature);
                vscode.window.showInformationMessage(`Copied: ${item.method.signature}`);
            }
        )
    );
}

export function deactivate() {}
