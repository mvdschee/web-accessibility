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
		m.forEach(el => {
			if (el != undefined){
				// problemsRecognition(el);
				switch (true) {
					// Div
					case (/<div/.test(el) && !/role=(?:.*?[a-z].*?)"/i.test(el)):
						problems++;
						_diagnostics('Use Semantic HTML5 or specify a WAI-ARIA role=""');
						break;
					// Span
					case (/<span/.test(el) && !/role=(?:.*?[a-z].*?)"/i.test(el)):
						if (/<span(?:.+?)button(?:.+?)>/.test(el)) {
							problems++;
							_diagnostics('Change to a <button>');
						} else {
							problems++;
							_diagnostics('Provide a WAI-ARIA role=""');
						}
						break;
					// Links
					case (/<a/.test(el) && !/>(?:\s+?[a-z]+\s+?)</i.test(el)):
						problems++;
						_diagnostics('Provide a descriptive text between the tags');
						break;
					// Images
					case (/<img/.test(el) && !/alt=(?:.*?[a-z].*?)"/i.test(el)):
						problems++;
						_diagnostics('Provide an alt="" text that describes the image');
						break;
					// Head, title and meta
					case (/<head/.test(el)):
						connection.console.log(el);
						if (/<meta(?:.+?)viewport/.test(el)) {
							if (!/scalable=(?:\s+?yes)/i.test(el)) {
								problems++;
								_diagnostics('Enable pinching to zoom with user-scalable=yes');
							}
							if (/maximum-scale=(?:\s+?1)/i.test(el)) {
								problems++;
								_diagnostics('Avoid using maximum-scale=1');
							}
						}
						if (!/<title>(?:.*?[a-z].*?)</i.test(el)) {
							problems++;
							_diagnostics('Provide a title with in the <head> tags');
						}
						break;
					// HTML
					case (/<html/.test(el) && !/lang=(?:.*?[a-z].*?)"/i.test(el)):
						problems++;
						_diagnostics('Provide a language with lang=""');
						break;
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

// async function problemsRecognition(el: string) {
	
// }

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// Make the HTML document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
