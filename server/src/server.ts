/*! server.ts - v0.1.0 - 2018
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

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
// let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
	hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
	// hasDiagnosticRelatedInformationCapability =
	// 	!!(capabilities.textDocument &&
	// 	capabilities.textDocument.publishDiagnostics &&
	// 	capabilities.textDocument.publishDiagnostics.relatedInformation);

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
	// order based om most common types: div span a img meta html
	let pattern: RegExp = /<div(?:[\s\S]*?[^-?])>|<span(?:[\s\S]*?[^-?])>|<a(?:.|\n)*?>(?:.|\n)*?<\/a>|<img(?:[\s\S]*?[^-?])>|<meta(?:[\s\S]*?[^-?])>|<html(?:[\s\S]*?[^-?])>/ig;
	let m: RegExpExecArray | null;
	let problems = 0;
	let diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		m.forEach(el => {
			if (el != undefined){
				switch (true) {
					// Div
					case (/<div/.test(el) && !/role/i.test(el)):
						problems++;
						_diagnostics('try using Semantic HTML instead of <div> or specify a WAI-ARIA role=""');
						break;
					// Span
					case (/<span/.test(el) && !/role/i.test(el)):
						if (/button/.test(el)) {
							problems++;
							_diagnostics('Change the <span> to a <button>');
						} else {
							problems++;
							_diagnostics('Set a WAI-ARIA role="" for the <span>');
						}
						break;
					// Links
					case (/<a/.test(el) && !/>[a-z]+</i.test(el)):
						problems++;
						_diagnostics('<a> should have a descriptive text between the tags');
						break;
					// Images
					case (/<img/.test(el) && !/alt="[a-z]+"/i.test(el)):
						problems++;
						_diagnostics('<img> should have an alt="" text that describes the image');
						break;
					// Meta
					case (/<meta(?:[\s\S]*?[^-?])name="viewport"/.test(el) && !/scalable="yes"/i.test(el)):
						problems++;
						_diagnostics('set pinching to zoom with user-scalable="yes"');
						break;
					// HTML
					case (/<html/.test(el) && !/lang="[a-z]+"/i.test(el)):
						problems++;
						_diagnostics('set the language for your websites content with lang=""');
						break;
					// Head
					// case (/<head/.test(el)):
					// 	if(/<meta name="viewport"/.test(el) && !/scalable="yes"/i.test(el)) {
					// 		problems++;
					// 		_diagnostics('Consider setting pinching to zoom with user-scalable="yes"');
					// 	}
	
					// 	if (!/<title/i.test(el)) {
					// 		problems++;
					// 		_diagnostics('Consider setting a <title> in the <head> tags');
					// 	}
					// 	break;
					default:
						break;
				}

			}

		});

		async function _diagnostics(diagnosticsMessage: string) {
			let diagnosic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: {
					start: textDocument.positionAt(m.index),
					end: textDocument.positionAt(m.index + m[0].length)
				},
				message: diagnosticsMessage,
				source: 'web accessibility'
			};
			
			diagnostics.push(diagnosic);
		}		
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
