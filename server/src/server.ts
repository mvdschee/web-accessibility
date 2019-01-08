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
import * as Pattern from './patterns';

let connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments = new TextDocuments();
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
	hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
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

interface ServerSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ServerSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ServerSettings = defaultSettings;
let documentSettings: Map<string, Thenable<ServerSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = <ServerSettings>(
			(change.settings.languageServerAccessibility || defaultSettings)
		);
	}

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

documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});


documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

// Only this part is interesting.
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	let settings = await getDocumentSettings(textDocument.uri);
	let text = textDocument.getText();
	let problems = 0;
	let m: RegExpExecArray | null;
	let diagnostics: Diagnostic[] = [];

	while ((m = Pattern.pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		if (m != null) {
			let el = m[0].slice(0, 5);
			switch (true) {
				// Div
				case (/<div/i.test(el)):
					let resultDiv = await Pattern.validateDiv(m);
					if (resultDiv) {
						problems++;
						_diagnostics(resultDiv.meta, resultDiv.mess);
					}
					break;
				// Span
				case (/<span/i.test(el)):
					let resultSpan = await Pattern.validateSpan(m);
					if (resultSpan) {
						problems++;
						_diagnostics(resultSpan.meta, resultSpan.mess);
					}
					break;
				// Links
				case (/<a\s/i.test(el)):
					let resultA = await Pattern.validateA(m);
					if (resultA) {
						problems++;
						_diagnostics(resultA.meta, resultA.mess);
					}
					break;
				// Images
				case (/<img/i.test(el)):
					let resultImg = await Pattern.validateImg(m);
					if (resultImg) {
						problems++;
						_diagnostics(resultImg.meta, resultImg.mess);
					}
					break;
				// input
				case (/<inpu/i.test(el)):
					let resultInput = await Pattern.validateInput(m);
					if (resultInput) {
						problems++;
						_diagnostics(resultInput.meta, resultInput.mess);
					}
					break;
				// Head, title and meta
				case (/<head/i.test(el)):
					if (/<meta(?:.+?)viewport(?:.+?)>/i.test(m[0])) {
						let resultMeta = await Pattern.validateMeta(m);
						if (resultMeta) {
							problems++;
							_diagnostics(resultMeta.meta, resultMeta.mess);
						}
					}
					if (!/<title>/i.test(m[0]) || /<title>/i.test(m[0])) {
						let resultTitle = await Pattern.validateTitle(m);
						if (resultTitle) {
							problems++;
							_diagnostics(resultTitle.meta, resultTitle.mess);
						}
					}
					break;
				// HTML
				case (/<html/i.test(el)):
					let resultHtml = await Pattern.validateHtml(m);
					if (resultHtml) {
						problems++;
						_diagnostics(resultHtml.meta, resultHtml.mess);
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
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.listen(connection);

connection.listen();
