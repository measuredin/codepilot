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
	private gitDir? : string;
	private gitCommit? : string;
	private gitHead? : string; // possible detach HEAD mode

	private log(msg: string) {
		console.log(`CodePilot [${new Date}] - ${msg}`);
	}

	public enable() {
		if (this.isEnabled) {
			return;
		}
		let initError;
		exec('git rev-parse --show-toplevel', (error, stdout, stderr) => {
			if (error) {
				this.log('failed to get git root directory');
				initError = error;
				return;
			}
			if (stdout) {
				this.log(`git root: ${stdout}`);
				this.gitRootDir = stdout.trim();
				this.gitDir = `${this.gitRootDir}/.git`;
				// watcher
				try {
					this.gitHeadWatcher = fs.watch(this.gitDir, "utf8", (event, filename) => {
						if (filename === 'HEAD') {
							this.log('git branch changed');
							this.syncBranchAndCommit();
						}
					});
				} catch (err) {
					this.log('failed to watch git directory');
					initError = err;
					return;
				}
			}
		});
		if (initError) {
			this.log('initialization error');
			this.log(initError);
			return;
		}
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

	// mimic git packed-ref via files
	private syncBranchAndCommit() {
		fs.readFile(`${this.gitDir}/HEAD`, "utf8", (error, data) => {
			if (error) {
				this.log('error reading HEAD');
				return;
			};
			this.gitHead = data.trim();
			this.gitCommit = this.gitHead; // in the case of detached HEAD
			if (this.gitHead.startsWith('ref')) { // follow ref to get SHA
				fs.readFile(`${this.gitDir}/${this.gitHead.substr(5)}`, "utf8", (error, data) => {
					if (error) {
						this.log('error following HEAD');
						return;
					};
					this.gitCommit = data.trim();
					this.log(`${this.gitHead} (HEAD) ${this.gitCommit} (SHA)`);
				});
			}
		});
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