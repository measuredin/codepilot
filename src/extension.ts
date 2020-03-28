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

	public enable() {
		console.log('CodePilot reporting for duty');
		this.subscriptions.push(vscode.window.onDidChangeWindowState(this.eventHandler));
		this.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(this.eventHandler));
		this.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.eventHandler));
		this.subscriptions.push(vscode.window.onDidOpenTerminal(this.eventHandler));
		this.subscriptions.push(vscode.window.onDidCloseTerminal(this.eventHandler));
		this.subscriptions.push(vscode.workspace.onDidChangeTextDocument(this.eventHandler));
		this.subscriptions.push(vscode.workspace.onDidCloseTextDocument(this.eventHandler));
		this.subscriptions.push(vscode.debug.onDidStartDebugSession(this.eventHandler));
		this.subscriptions.push(vscode.debug.onDidChangeBreakpoints(this.eventHandler));
	}

	public disable() {
		console.log('CodePilot signing off');
		this.subscriptions.forEach((listener) => {
			listener.dispose();
		});
	}

	public eventHandler(event: any) {
		console.log(event);
	}
}