import { exec } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const codepilot = new CodePilot();
	context.subscriptions.push(vscode.commands.registerCommand("extension.enableCodePilot", () => {
		codepilot.enable(context);
	}));
	context.subscriptions.push(vscode.commands.registerCommand("extension.disableCodePilot", () => {
		codepilot.disable();
	}));
}

export function deactivate() {}

class CodePilot {

	private subscriptions: vscode.Disposable[] = [];
	private isEnabled = false;

	private extensionContext?: vscode.ExtensionContext;
	private globalStoragePath?: string;
	private dataStream?: fs.WriteStream;

	private gitHeadWatcher? : fs.FSWatcher;
	private gitCommitWatcher? : fs.FSWatcher;
	private gitRootDir? : string;
	private gitDir? : string;
	private gitCommit? : string;
	private gitHead? : string; // possible detach HEAD mode

	private log(msg: string) {
		console.log(`CodePilot [${new Date}] - ${msg}`);
	}

	public enable(context: vscode.ExtensionContext) {
		if (this.isEnabled) {
			return;
		}
		this.extensionContext = context;
		this.globalStoragePath = this.extensionContext.globalStoragePath;
		this.dataStream = fs.createWriteStream(this.globalStoragePath, { flags: 'a' });
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
							this.streamEvent({ type: 'git', event: 'branch' });
							this.syncGit();
						}
					});
				} catch (err) {
					this.log('failed to watch git directory');
					initError = err;
					return;
				}
				this.syncGit();
			}
		});
		if (initError) {
			this.log('initialization error');
			this.log(initError);
			return;
		}
		this.log('reporting for duty');
		this.subscriptions.push(vscode.window.onDidChangeWindowState(this.windowStateHandler.bind(this)));
		this.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(this.activeTextEditorHandler.bind(this)));
		this.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.textEditorSelectionHandler.bind(this)));
		this.subscriptions.push(vscode.window.onDidOpenTerminal(this.terminalHandler.bind(this)));
		this.subscriptions.push(vscode.window.onDidCloseTerminal(this.terminalHandler.bind(this)));
		this.subscriptions.push(vscode.workspace.onDidChangeTextDocument(this.textDocumentHandler.bind(this)));
		this.subscriptions.push(vscode.workspace.onDidCloseTextDocument(this.textDocumentHandler.bind(this)));
		this.subscriptions.push(vscode.debug.onDidStartDebugSession(this.debugSessionHandler.bind(this)));
		this.subscriptions.push(vscode.debug.onDidChangeBreakpoints(this.breakpointHandler.bind(this)));
		this.isEnabled = true;
	}

	public disable() {
		if (!this.isEnabled) {
			return;
		}
		this.log('signing off');
		if (this.dataStream) {
			this.dataStream.end();
		}
		this.subscriptions.forEach((listener) => {
			listener.dispose();
		});
		if (this.gitHeadWatcher) {
			this.gitHeadWatcher.close();
		}
		this.isEnabled = false;
	}

	// mimic git packed-ref via files
	private syncGit() {
		const headPath = `${this.gitDir}/HEAD`;
		fs.readFile(headPath, "utf8", (error, data) => {
			if (error) {
				this.log(`error reading ${headPath}`);
				return;
			};
			this.gitHead = data.trim();
			if (this.gitHead.startsWith('ref')) {
				this.gitHead = this.gitHead.substr(5);
				const ref = `${this.gitDir}/${this.gitHead}`;
				fs.readFile(ref, "utf8", (error, data) => {
					if (error) {
						this.log(`error following HEAD to ${this.gitHead}`);
						return;
					};
					this.gitCommit = data.trim();
				});
				if (this.gitCommitWatcher) { // reset watcher
					this.gitCommitWatcher.close();
				}
				const refPaths = ref.split('/');
				this.gitCommitWatcher = fs.watch(refPaths.slice(0, -1).join('/'), "utf8", (event, filename) => {
					if (filename === refPaths[refPaths.length - 1]) {
						fs.readFile(ref, "utf8", (error, data) => {
							if (error) {
								this.log(`error following HEAD to ${this.gitHead}`);
								return;
							};
							if (this.gitCommit !== data.trim()) {
								this.streamEvent({ type: 'git', event: 'commit' });
								this.gitCommit = data.trim();
							}
						});
					}
				});
			} else {
				this.gitCommit = this.gitHead; // detached HEAD
			}
		});
	}

	private streamEvent(obj: Object) {
		const eventWithMeta = {
			...obj,
			commit: this.gitCommit,
			ref: this.gitHead,
			time: new Date().toISOString(),
		};
		if (this.dataStream) {
			this.dataStream.write(JSON.stringify(eventWithMeta) + "\n");
		} else {
			this.log('file stream not setup');
		}
	}

	private windowStateHandler(event: vscode.WindowState) {
		this.streamEvent({ type: 'window', ...event });
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