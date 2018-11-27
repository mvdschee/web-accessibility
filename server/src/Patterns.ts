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
	"<head(?:.|)+?>(?:(?:\\s|\\S)+?(?=<\/head>))<\/head>",
	"<html(?:.)+?>"
];

export const pattern: RegExp = new RegExp(patterns.join('|'), 'ig');

export function validateDiv(m: RegExpExecArray) {
	connection.console.log("div function");
	if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return Promise.resolve({
			meta: m,
			numb: 1,
			mess: 'Use Semantic HTML5 or specify a WAI-ARIA role=""'
		});
	}
}

export function validateSpan(m: RegExpExecArray) {
	connection.console.log("span function");
	if (!/role=(?:.*?[a-z].*?)"/i.test(m[0])) {
		if (/<span(?:.+?)button(?:.+?)>/.test(m[0])) {
			return Promise.resolve({
				meta: m,
				numb: 1,
				mess: 'Change to a <button>'
			});
		} else {
			return Promise.resolve({
				meta: m,
				numb: 1,
				mess: 'Provide a WAI-ARIA role=""'
			});
		}
	}
}

export function validateA(m: RegExpExecArray) {
	connection.console.log("a function");
	let filteredString = m[0].replace(/<(?:\s|\S)+?>/ig, "");
	if (!/(?:\S+?)/ig.test(filteredString)) {
		return Promise.resolve({
			meta: m,
			numb: 1,
			mess: 'Provide a descriptive text in between the tags'
		});
	}
}

export function validateImg(m: RegExpExecArray) {
	connection.console.log("img function");
	if (!/alt=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return Promise.resolve({
			meta: m,
			numb: 1,
			mess: 'Provide an alt="" text that describes the image'
		});
	}
}

export function validateMeta(m: RegExpExecArray) {
	connection.console.log("meta function");
	let metaRegEx: RegExpExecArray;
	let oldRegEx: RegExpExecArray = m;
	if ((metaRegEx = /<meta(?:.+?)viewport(?:.+?)>/i.exec(oldRegEx[0]))) {
		metaRegEx.index = oldRegEx.index + metaRegEx.index;
		if (!/scalable=(?:\s+?yes)/i.test(metaRegEx[0])) {
			return Promise.resolve({
				meta: metaRegEx,
				numb: 1,
				mess: 'Enable pinching to zoom with user-scalable=yes'
			});
		}
		if (/maximum-scale=(?:\s+?1)/i.test(metaRegEx[0])) {
			return Promise.resolve({
				meta: metaRegEx,
				numb: 1,
				mess: 'Avoid using maximum-scale=1'
			});
		}
	}
}

export function validateTitle(m: RegExpExecArray) {
	connection.console.log("title function");
	let titleRegEx: RegExpExecArray;
	let oldRegEx: RegExpExecArray = m;
	if (!/<title>/i.test(oldRegEx[0])) {
		titleRegEx = /<head(?:|.+?)>/i.exec(oldRegEx[0]);
		titleRegEx.index = oldRegEx.index;
		return Promise.resolve({
			meta: titleRegEx,
			numb: 1,
			mess: 'Provide a title with in the <head> tags'
		});
	} else {
		titleRegEx = /<title>(?:|.*?[a-z].*?|\s+?)<\/title>/i.exec(oldRegEx[0]);
		if (/>(?:|\s+?)</i.test(titleRegEx[0])) {
			titleRegEx.index = oldRegEx.index + titleRegEx.index;
			return Promise.resolve({
				meta: titleRegEx,
				numb: 1,
				mess: 'Provide a text with in the <title> tags'
			});
		}
	}
}

export function validateHtml(m: RegExpExecArray) {
	connection.console.log("html function");
	if (!/lang=(?:.*?[a-z].*?)"/i.test(m[0])) {
		return Promise.resolve({
			meta: m,
			numb: 1,
			mess: 'Provide a language with lang=""'
		});
	}
}