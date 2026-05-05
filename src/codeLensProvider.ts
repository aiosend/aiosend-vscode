import * as vscode from "vscode";
import { isAiosendFile } from "./extension";

const INSTANCE_RE = /(\w+)\s*=\s*CryptoPay\s*\(/;
const IMPORT_RE   = /from\s+aiosend\s+import|import\s+aiosend/;

export class AiosendCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        if (document.languageId !== "python") {
            return [];
        }

        const text = document.getText();
        if (!isAiosendFile(text)) {
            return [];
        }

        const lenses: vscode.CodeLens[] = [];
        const lines = text.split("\n");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // CodeLens above import lines
            if (IMPORT_RE.test(line)) {
                const range = new vscode.Range(i, 0, i, 0);
                lenses.push(
                    new vscode.CodeLens(range, {
                        title: "$(book) aiosend docs",
                        command: "aiosend.openDocs",
                        tooltip: "Open aiosend documentation",
                    })
                );
            }

            // CodeLens above CryptoPay instantiation
            if (INSTANCE_RE.test(line)) {
                const range = new vscode.Range(i, 0, i, 0);
                lenses.push(
                    new vscode.CodeLens(range, {
                        title: "$(refresh) aiosend: Refresh Explorer",
                        command: "aiosend.refreshApi",
                        tooltip: "Refresh the API Explorer panel",
                    }),
                    new vscode.CodeLens(range, {
                        title: "$(book) Open Docs",
                        command: "aiosend.openDocs",
                        tooltip: "Open aiosend documentation",
                    })
                );
            }
        }

        return lenses;
    }
}
