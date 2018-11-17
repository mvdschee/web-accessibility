/*! Patterns.ts
* Flamingos are pretty badass!
* Copyright (c) 2018 Max van der Schee; Licensed MIT */

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