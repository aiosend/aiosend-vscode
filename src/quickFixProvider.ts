import * as vscode from "vscode";
import {
    DIAG_MISSING_AWAIT,
    DIAG_INVALID_ASSET,
    DIAG_INVALID_FIAT,
    DIAG_MISSING_RETURN,
    DIAG_STRING_AMOUNT,
    DIAG_INVALID_STATUS,
    DIAG_STRING_ID,
} from "./diagnosticsProvider";

const VALID_ASSETS    = ["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC", "JET"];
const VALID_FIATS     = [
    "USD", "EUR", "RUB", "UAH", "AED", "AMD", "AZN", "BRL", "BYN",
    "CNY", "GBP", "GEL", "IDR", "ILS", "INR", "KGS", "KZT", "PLN",
    "THB", "TJS", "TRY", "UZS",
];
const VALID_STATUSES  = ["active", "paid", "expired", "activated"];

export class AiosendQuickFixProvider implements vscode.CodeActionProvider {
    static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diag of context.diagnostics) {
            if (diag.source !== "aiosend") {
                continue;
            }

            switch (diag.code) {
                case DIAG_MISSING_AWAIT:
                    actions.push(this.fixMissingAwait(document, diag));
                    break;
                case DIAG_INVALID_ASSET:
                    actions.push(...this.fixInvalidEnum(document, diag, VALID_ASSETS, "asset"));
                    break;
                case DIAG_INVALID_FIAT:
                    actions.push(...this.fixInvalidEnum(document, diag, VALID_FIATS, "fiat"));
                    break;
                case DIAG_INVALID_STATUS:
                    actions.push(...this.fixInvalidEnum(document, diag, VALID_STATUSES, "status"));
                    break;
                case DIAG_MISSING_RETURN:
                    actions.push(this.fixMissingReturn(document, diag));
                    break;
                case DIAG_STRING_AMOUNT:
                    actions.push(this.fixStringAmount(document, diag));
                    break;
                case DIAG_STRING_ID:
                    actions.push(this.fixStringId(document, diag));
                    break;
            }
        }

        return actions;
    }

    private fixMissingAwait(
        document: vscode.TextDocument,
        diag: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction("Add `await`", vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diag];
        action.isPreferred = true;

        const lineNum = diag.range.start.line;
        const col     = diag.range.start.character;

        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, new vscode.Position(lineNum, col), "await ");
        action.edit = edit;
        return action;
    }

    private fixInvalidEnum(
        document: vscode.TextDocument,
        diag: vscode.Diagnostic,
        validValues: string[],
        _paramName: string
    ): vscode.CodeAction[] {
        const lineNum = diag.range.start.line;
        const text    = document.lineAt(lineNum).text;
        const start   = diag.range.start.character;
        const end     = diag.range.end.character;

        const invalidValue = text.slice(start, end);
        const closest = findClosest(invalidValue, validValues);

        const actions: vscode.CodeAction[] = [];

        if (closest) {
            const action = new vscode.CodeAction(
                `Replace with "${closest}"`,
                vscode.CodeActionKind.QuickFix
            );
            action.diagnostics = [diag];
            action.isPreferred = true;
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, diag.range, closest);
            action.edit = edit;
            actions.push(action);
        }

        return actions;
    }

    private fixMissingReturn(
        document: vscode.TextDocument,
        diag: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            "Add `-> None` return type",
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diag];
        action.isPreferred = true;

        const lineNum    = diag.range.start.line;
        const text       = document.lineAt(lineNum).text;
        const closingIdx = text.lastIndexOf(")");

        if (closingIdx !== -1) {
            const colonIdx = text.indexOf(":", closingIdx);
            if (colonIdx !== -1) {
                const edit = new vscode.WorkspaceEdit();
                edit.insert(document.uri, new vscode.Position(lineNum, colonIdx), " -> None");
                action.edit = edit;
            }
        }

        return action;
    }

    private fixStringAmount(
        document: vscode.TextDocument,
        diag: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            "Remove quotes from amount value",
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diag];
        action.isPreferred = true;

        const lineNum = diag.range.start.line;
        const text    = document.lineAt(lineNum).text;
        const match   = /\bamount\s*=\s*(["'])([0-9]+(?:\.[0-9]+)?)\1/.exec(text);

        if (match) {
            const fullRange = new vscode.Range(
                lineNum,
                text.indexOf(match[0]) + match[0].indexOf(match[1]),
                lineNum,
                text.indexOf(match[0]) + match[0].length
            );
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, fullRange, match[2]);
            action.edit = edit;
        }

        return action;
    }

    private fixStringId(
        document: vscode.TextDocument,
        diag: vscode.Diagnostic
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            "Remove quotes from ID (use int)",
            vscode.CodeActionKind.QuickFix
        );
        action.diagnostics = [diag];
        action.isPreferred = true;

        const lineNum = diag.range.start.line;
        const text    = document.lineAt(lineNum).text;
        const match   = /\b(?:invoice_id|check_id|transfer_id)\s*=\s*(["'])(\d+)\1/.exec(text);

        if (match) {
            const quoteStart = text.indexOf(match[0]) + match[0].indexOf(match[1]);
            const fullRange  = new vscode.Range(
                lineNum,
                quoteStart,
                lineNum,
                quoteStart + match[1].length + match[2].length + match[1].length
            );
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, fullRange, match[2]);
            action.edit = edit;
        }

        return action;
    }
}

function findClosest(input: string, candidates: string[]): string | null {
    let best: string | null = null;
    let bestDist = Infinity;

    for (const c of candidates) {
        const dist = levenshtein(input.toUpperCase(), c.toUpperCase());
        if (dist < bestDist) {
            bestDist = dist;
            best = c;
        }
    }

    return bestDist <= 3 ? best : null;
}

function levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] =
                a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[a.length][b.length];
}
