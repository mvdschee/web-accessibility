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
import { pattern } from './Patterns';

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
	let m: RegExpExecArray | null;
	let problems = 0;
	let diagnostics: Diagnostic[] = [];
	
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		if (m != null) {
			let el = m[0].slice(0, 5);
			switch (true) {
				// Div
				case (/<div/i.test(el)):
					if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
						problems++;
						_diagnostics(m,'Use Semantic HTML5 or specify a WAI-ARIA role=""');
					}
					break;
				// Span
				case (/<span/i.test(el)):
					if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
						if (/<span(?:.+?)button(?:.+?)>/.test(m[0])) {
							problems++;
							_diagnostics(m,'Change to a <button>');
						} else {
							problems++;
							_diagnostics(m,'Provide a WAI-ARIA role=""');
						}
					}
					break;
				// Links
				case (/<a/i.test(el)):
					let filteredString = m[0].replace(/<(?:\s|\S)+?>/ig, "");
					if (!/(?:\S+?)/ig.test(filteredString)) {
						problems++;
						_diagnostics(m,'Provide a descriptive text in between the tags');
					}
					break;
				// Images
				case (/<img/i.test(el)):
					if (!/alt=(?:.*?[a-z].*?)"/i.test(m[0])) {
						problems++;
						_diagnostics(m,'Provide an alt="" text that describes the image');
					}
					break;
				// Head, title and meta
				case (/<head/i.test(el)):
					let metaRegEx: RegExpExecArray;
					let titleRegEx: RegExpExecArray;
					let oldRegEx: RegExpExecArray = m;
					if ((metaRegEx = /<meta(?:.+?)viewport(?:.+?)>/i.exec(oldRegEx[0]))) {	
						metaRegEx.index = oldRegEx.index + metaRegEx.index;
						if (!/scalable=(?:\s+?yes)/i.test(metaRegEx[0])) {
							problems++;
							_diagnostics(metaRegEx,'Enable pinching to zoom with user-scalable=yes');
						}
						if (/maximum-scale=(?:\s+?1)/i.test(metaRegEx[0])) {
							problems++;
							_diagnostics(metaRegEx,'Avoid using maximum-scale=1');
						}
					}
					if (!/<title>/i.test(oldRegEx[0])) {
						titleRegEx = /<head(?:|.+?)>/i.exec(oldRegEx[0]);
						titleRegEx.index = oldRegEx.index;
						problems++;
						_diagnostics(titleRegEx,'Provide a title with in the <head> tags');
					} else {
						titleRegEx = /<title>(?:|.*?[a-z].*?|\s+?)<\/title>/i.exec(oldRegEx[0]);
						if (/>(?:|\s+?)</i.test(titleRegEx[0])) {
							titleRegEx.index = oldRegEx.index + titleRegEx.index;
							problems++;
							_diagnostics(titleRegEx, 'Provide a text with in the <title> tags');
						} 
					}
					break;
				// HTML
				case (/<html/i.test(el)):
					if (!/lang=(?:.*?[a-z].*?)"/i.test(m[0])) {
						problems++;
						_diagnostics(m,'Provide a language with lang=""');
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
