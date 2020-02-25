/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getDocUri, activate, activateExtension, testCompletion, testHover, testDiagnostics, sleep } from './helper';

describe('Tests for schema provider feature', () => {
	const docUri = getDocUri('completion/completion.yaml');
	const hoverUri = getDocUri('hover/basic.yaml');
	const nullUri = getDocUri('hover/null.yaml');

    it('completion, hover, and validation work with registered contributor schema', async () => {
		const client = await activate(docUri);

		client.registerContributor(SCHEMA, onRequestSchema1URI, onRequestSchema1Content);
		await testCompletion(docUri, new vscode.Position(0, 0), {
			items: [
				{
                    label: "version",
                    kind: 9
                }
			]
		});

		await vscode.window.showTextDocument(hoverUri);
		await testHover(hoverUri, new vscode.Position(0, 3), [{
			contents: [
				"A stringy string string"
			]
		}]);

		await sleep(2000); // Wait for the diagnostics to compute on this file
		await testDiagnostics(hoverUri, [
			{
				message: "Value is not accepted. Valid values: \"test\".",
				range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 14)),
				severity: 0
			}
		]);

	});

	it('Validation occurs automatically with registered contributor schema', async () => {
		const client = await activate(hoverUri);
		client.registerContributor(SCHEMA, onRequestSchema1URI, onRequestSchema1Content);

		await sleep(2000); // Wait for the diagnostics to compute on this file
		await testDiagnostics(hoverUri, [
			{
				message: "Value is not accepted. Valid values: \"test\".",
				range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 14)),
				severity: 0
			}
		]);
	});

	it('Validation of Null-Values', async () => {
		// get extension and register constributor
		const client = await activateExtension();
		client.registerContributor(SCHEMA4, onRequestSchemaNullURI, onRequestSchemaNullContent);

		// activate the document
		await activate(nullUri)

		await sleep(2000); // Wait for the diagnostics to compute on this file

		// no diagnostics should be available
		// as the provided schema is valid
		await testDiagnostics(nullUri, []);
	});

	it('Multiple contributors can match one file', async () => {
		const client = await activate(docUri);
		client.registerContributor(SCHEMA2, onRequestSchema2URI, onRequestSchema2Content);
		client.registerContributor(SCHEMA3, onRequestSchema3URI, onRequestSchema3Content);

		await testCompletion(docUri, new vscode.Position(0, 0), {
			items: [
				{
                    label: "apple",
					kind: 9,
					documentation: "An apple"
				},
				{
                    label: "version",
					kind: 9,
					documentation: "A stringy string string"
                }
			]
		});
    });
});

const SCHEMA = "myschema";
const SCHEMA2 = "myschema2";
const SCHEMA3 = "myschema3";
const SCHEMA4 = "custom_null";

const schemaJSON = JSON.stringify({
	type: "object",
	properties: {
		version: {
			type: "string",
			description: "A stringy string string",
			enum: [
				"test"
			]
		}
	}
});

function onRequestSchema1URI(resource: string): string | undefined {
	if (resource.endsWith('completion.yaml') || resource.endsWith('basic.yaml')) {
		return `${SCHEMA}://schema/porter`;
	}
	return undefined;
}

function onRequestSchemaNullURI(resource: string): string | undefined {
	if (resource.endsWith('null.yaml')) {
		return `${SCHEMA4}://schema/porter`;
	}
	return undefined;
}

function onRequestSchemaNullContent(schemaUri: string): string | undefined {
	return JSON.stringify({
		type: 'object',
		required: ['name', 'values'],
		properties: {
			name: {
				type: 'string',
			},
			values: {
				type: 'array',
				items: {
					type: 'null'
				}
			}
		}
	})
}

function onRequestSchema1Content(schemaUri: string): string | undefined {
	return schemaJSON;
}

const schemaJSON2 = JSON.stringify({
	"type": "object",
	"properties": {
		"apple": {
			"type": "string",
			"description": "An apple",
		}
	}
});

function onRequestSchema2URI(resource: string): string | undefined {
	return `${SCHEMA2}://schema/porter`;
}

function onRequestSchema2Content(schemaUri: string): string | undefined {
	return schemaJSON2;
}

function onRequestSchema3URI(resource: string): string | undefined {
	return `${SCHEMA3}://schema/porter`;
}

function onRequestSchema3Content(schemaUri: string): string | undefined {
	return schemaJSON;
}
