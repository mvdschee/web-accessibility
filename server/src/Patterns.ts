/*! Patterns.ts
* Flamingos are pretty badass!
* Copyright (c) 2018 Max van der Schee; Licensed MIT */

// Order based om most common types first
const patterns: string[] = [
	"<div(?:[\\s\\S]*?[^-?])>",
	"<span(?:[\\s\\S]*?[^-?])>",
	"<a(?:.|\\n)*?>(?:.|\\n)*?<\/a>",
	"<img(?:[\\s\\S]*?[^-?])>",
	"<meta(?:[\\s\\S]*?[^-?])>",
	"<html(?:[\\s\\S]*?[^-?])>"
];

export const pattern: RegExp = new RegExp(patterns.join('|'), 'ig');