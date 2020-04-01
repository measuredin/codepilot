import { exec } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const codepilot = new CodePilot();
	context.subscriptions.push(vscode.commands.registerCommand("extension.enableCodePilot", () => {
		codepilot.enable();
	}));
	context.subscriptions.push(vscode.commands.registerCommand("extension.disableCodePilot", () => {
		codepilot.disable();
	}));
}

export function deactivate() {}

class CodePilot {

	private subscriptions: vscode.Disposable[] = [];
	private isEnabled = false;

	private gitHeadWatcher? : fs.FSWatcher;
	private gitRootDir? : string;
	private gitCommit? : string;
	private gitHead? : string;

	private log(msg: string) {
		console.log(`CodePilot [${new Date}] - ${msg}`);
	}

	public enable() {
		if (this.isEnabled) {
			return;
		}
		exec('git rev-parse --show-toplevel', (error, stdout, stderr) => {
			if (error) {
				this.log('failed to get git root directory');
				this.disable();
			}
			if (stdout) {
				this.log(`git root: ${stdout}`);
				this.gitRootDir = stdout.trim();
				try {
					this.gitHeadWatcher = fs.watch(`${this.gitRootDir}/.git`, "utf8", (event, filename) => {
						this.log('git branch changed');
						this.log(event);
						this.log(filename);
					});
				} catch (err) {
					this.log('failed to watch git directory');
				}
			}
		});
		this.log('reporting for duty');
		this.subscriptions.push(vscode.window.onDidChangeWindowState(this.windowStateHandler));
		this.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(this.activeTextEditorHandler));
		this.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.textEditorSelectionHandler));
		this.subscriptions.push(vscode.window.onDidOpenTerminal(this.terminalHandler));
		this.subscriptions.push(vscode.window.onDidCloseTerminal(this.terminalHandler));
		this.subscriptions.push(vscode.workspace.onDidChangeTextDocument(this.textDocumentHandler));
		this.subscriptions.push(vscode.workspace.onDidCloseTextDocument(this.textDocumentHandler));
		this.subscriptions.push(vscode.debug.onDidStartDebugSession(this.debugSessionHandler));
		this.subscriptions.push(vscode.debug.onDidChangeBreakpoints(this.breakpointHandler));
		this.isEnabled = true;
	}

	public disable() {
		if (!this.isEnabled) {
			return;
		}
		this.log('signing off');
		this.subscriptions.forEach((listener) => {
			listener.dispose();
		});
		if (this.gitHeadWatcher) {
			this.gitHeadWatcher.close();
		}
		this.isEnabled = false;
	}

	private windowStateHandler(event: vscode.WindowState) {
		console.log(event);
	}

	private activeTextEditorHandler(event?: vscode.TextEditor) {
		console.log(event);
	}

	private textEditorSelectionHandler(event: vscode.TextEditorSelectionChangeEvent) {
		console.log(event);
	}

	private terminalHandler(event: vscode.Terminal) {
		console.log(event);
	}

	private textDocumentHandler(event: vscode.TextDocument | vscode.TextDocumentChangeEvent) {
		console.log(event);
	}

	private debugSessionHandler(event: vscode.DebugSession) {
		console.log(event);
	}

	private breakpointHandler(event: vscode.BreakpointsChangeEvent) {
		console.log(event);
	}
}