/*! server.ts
* Flamingos are pretty badass!
* Copyright (c) 2018 Max van der Schee; Licensed MIT */

import {
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification
} from 'vscode-languageserver';
import * as Pattern from './Patterns';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
	hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: false
			}
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(
			DidChangeConfigurationNotification.type,
			undefined
		);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The server settings
interface ServerSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: ServerSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ServerSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ServerSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ServerSettings>(
			(change.settings.languageServerAccessibility || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ServerSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerAccessibility'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a HTML document has changed. This event is emitted
// when the HTML document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	//Get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);
	
	// The validator creates diagnostics for all errors and more
	let text = textDocument.getText();
	let problems = 0;
	let m: RegExpExecArray | null;
	let diagnostics: Diagnostic[] = [];
	
	while ((m = Pattern.pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		connection.console.log(problems.toString());
		if (m != null) {
			let el = m[0].slice(0, 5);
			switch (true) {
				// Div
				case (/<div/i.test(el)):
					connection.console.log("div");
					{
						let result = await Pattern.validateDiv(m).then(response => response).catch();
						problems + result.numb;
						_diagnostics(result.meta, result.mess);
					}
					break;
				// Span
				case (/<span/i.test(el)):
					connection.console.log("span");
					{
						let result = await Pattern.validateSpan(m).then(response => response).catch();
						problems + result.numb;
						_diagnostics(result.meta, result.mess);
					}
					break;
				// Links
				case (/<a/i.test(el)):
					connection.console.log("a");
					{
						let result = await Pattern.validateA(m).then(response => response).catch();
						problems + result.numb;
						_diagnostics(result.meta, result.mess);
					}
					break;
				// Images
				case (/<img/i.test(el)):
					connection.console.log("img");
					{
						let result = await Pattern.validateImg(m).then(response => response).catch();
						problems + result.numb;
						_diagnostics(result.meta, result.mess);
					}
					break;
				// Head, title and meta
				case (/<head/i.test(el)):
					connection.console.log("head");
					{
						if (/<meta(?:.+?)viewport(?:.+?)>/i.test(m[0])) {
							connection.console.log("meta");
							let result = await Pattern.validateMeta(m).then(response => response).catch();
							problems + result.numb;
							_diagnostics(result.meta, result.mess);
						}
						if (!/<title>/i.test(m[0]) || /<title>/i.test(m[0])) {
							connection.console.log("title");
							let result = await Pattern.validateTitle(m).then(response => response).catch();
							problems + result.numb;
							_diagnostics(result.meta, result.mess);
						}
					}
					break;
				// HTML
				case (/<html/i.test(el)):
					connection.console.log("html");
					{
						let result = await Pattern.validateHtml(m).then(response => response).catch();
						problems + result.numb;
						_diagnostics(result.meta, result.mess);
					}
					break;
				default:
					break;
			}
		}
	}

	async function _diagnostics(regEx: RegExpExecArray, diagnosticsMessage: string) {
		let diagnosic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(regEx.index),
				end: textDocument.positionAt(regEx.index + regEx[0].length)
			},
			message: diagnosticsMessage,
			source: 'web accessibility'
		};
		
		diagnostics.push(diagnosic);
	}		
	
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// Make the HTML document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
