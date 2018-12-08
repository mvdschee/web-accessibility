/*! Patterns.ts
* Flamingos are pretty badass!
* Copyright (c) 2018 Max van der Schee; Licensed MIT */
import {
	createConnection,
	ProposedFeatures
} from 'vscode-languageserver';

let connection = createConnection(ProposedFeatures.all);

// Order based om most common types first
const patterns: string[] = [
	"<div(?:.)+?>",
	"<span(?:.)+?>",
	"<a(?:.)+?>(?:(?:\\s|\\S)+?(?=<\/a>))<\/a>",
	"<img(?:.)+?>",
	"<input(?:.)+?>",
	"<head(?:.|)+?>(?:(?:\\s|\\S)+?(?=<\/head>))<\/head>",
	"<html(?:.)+?>"
];

export const pattern: RegExp = new RegExp(patterns.join('|'), 'ig');

export async function validateDiv(m: RegExpExecArray) {
	if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Use Semantic HTML5 or specify a WAI-ARIA role=""'
		};
	}
}

export async function validateSpan(m: RegExpExecArray) {
	if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
		if (/<span(?:.+?)button(?:.+?)>/.test(m[0])) {
			return {
				meta: m,
				mess: 'Change to a <button>'
			};
		} else {
			return {
				meta: m,
				mess: 'Provide a WAI-ARIA role=""'
			};
		}
	}
}

export async function validateA(m: RegExpExecArray) {
	let filteredString = m[0].replace(/<(?:\s|\S)+?>/ig, "");
	if (!/(?:\S+?)/ig.test(filteredString)) {
		return {
			meta: m,
			mess: 'Provide a descriptive text in between the tags'
		};
	}
}

export async function validateImg(m: RegExpExecArray) {
	if (!/alt=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Provide an alt="" text that describes the image'
		};
	}
}

export async function validateMeta(m: RegExpExecArray) {
	let metaRegEx: RegExpExecArray;
	let oldRegEx: RegExpExecArray = m;
	if ((metaRegEx = /<meta(?:.+?)viewport(?:.+?)>/i.exec(oldRegEx[0]))) {
		metaRegEx.index = oldRegEx.index + metaRegEx.index;
		if (!/scalable=(?:\s+?yes)/i.test(metaRegEx[0])) {
			return {
				meta: metaRegEx,
				mess: 'Enable pinching to zoom with user-scalable=yes'
			};
		}
		if (/maximum-scale=(?:\s+?1)/i.test(metaRegEx[0])) {
			return {
				meta: metaRegEx,
				mess: 'Avoid using maximum-scale=1'
			};
		}
	}
}

export async function validateTitle(m: RegExpExecArray) {
	let titleRegEx: RegExpExecArray;
	let oldRegEx: RegExpExecArray = m;
	if (!/<title>/i.test(oldRegEx[0])) {
		titleRegEx = /<head(?:|.+?)>/i.exec(oldRegEx[0]);
		titleRegEx.index = oldRegEx.index;
		return {
			meta: titleRegEx,
			mess: 'Provide a title within the <head> tags'
		};
	} else {
		titleRegEx = /<title>(?:|.*?[a-z].*?|\s+?)<\/title>/i.exec(oldRegEx[0]);
		if (/>(?:|\s+?)</i.test(titleRegEx[0])) {
			titleRegEx.index = oldRegEx.index + titleRegEx.index;
			return {
				meta: titleRegEx,
				mess: 'Provide a text within the <title> tags'
			};
		}
	}
}

export async function validateHtml(m: RegExpExecArray) {
	if (!/lang=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return {
			meta: m,
			mess: 'Provide a language within lang=""'
		};
	}
}

export async function validateInput(m: RegExpExecArray) {
	// Give message based on found error 
	switch (true) {
		case (/aria-label=/i.test(m[0])):
			if (!/aria-label="(?:(?![a-z]*?)|\s|)"/i.test(m[0])){
				break;
			} else {
				return {
					meta: m,
					mess: 'Provide an text with in the aria-label=""'
				};
			}
		case (/id=/i.test(m[0])):
			if (/id="(?:.*?[a-z].*?)"/i.test(m[0])){
					let idValue = /id="(.*?[a-z].*?)"/i.exec(m[0])[1];
					let pattern: RegExp = new RegExp('for="' + idValue + '"', 'i');
					if (pattern.test(m.input)) {
						break;
					} else {
						return {
							meta: m,
							mess: 'Provide an aria-label="" or a <label for="">'
						};	
					}		
				} else {
					return {
						meta: m,
						mess: 'Provide an aria-label=""'
					};
				}
		case (/aria-labelledby=/i.test(m[0])):
			if (!/aria-labelledby="(?:(?![a-z]*?)|\s|)"/i.test(m[0])) {
				// TODO: needs to check elements with the same value.
				break;
			} else {
				return {
					meta: m,
					mess: 'Provide an id with in the aria-labelledby=""'
				};
			}
		case (/role=/i.test(m[0])):
			// TODO: needs to check if <label> is surrounded.
			break;
		default:
			return {
				meta: m,
				mess: 'Provide an aria-label=""'
			};
	}
}