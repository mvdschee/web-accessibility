# CHANGELOG
## Version 0.2.4
* Enhancement [#17](https://github.com/mvdschee/web-accessibility/issues/17): Option to disable semantically transparent elements highlight
* Enhancement [#15](https://github.com/mvdschee/web-accessibility/issues/15): Make sure all frames and iframes have a title attribute 
* Enhancement [#12](https://github.com/mvdschee/web-accessibility/issues/12): Span check for button doesn't trigger on usage of btn
* Added support for React [#13](https://github.com/mvdschee/web-accessibility/pull/13)
* Fixed diagnostic source displaying as `undefined`
* Updated dependencies 

## Version 0.2.3
* Enhancement [#6](https://github.com/mvdschee/web-accessibility/issues/6) by [Liz Certa (@ecerta)](https://github.com/ecerta): adds more checks for alt text, removes whitespace, fixes false positive on alt="" [pull #9](https://github.com/mvdschee/web-accessibility/pull/9)
* Enhancement [#7](https://github.com/mvdschee/web-accessibility/issues/7): Added check for `tabindex`
* Bug [#8](https://github.com/mvdschee/web-accessibility/issues/8): Title check does not trigger when `<head>` is empty and right next to `</head>`
* Fixed issue with completionProvider
* Changed some error messages to show a contrast between hint/description and a [code example]

## Version 0.2.2
* If the document gets closed, problems disappear.
* Removed all comments that had no real function.

## Version 0.2.1
* Changed the flag for `<a>`. It had way too many wavy lines!
* Remove typo from changelog

## Version 0.2.0
* Added Regex for `<input>`
* Refactored case handling
* Moved pattern case handling to `Patterns.ts`

## Version 0.1.3
* Fixed issue with filter tag being flagged on multiple patterns
* Fixed issue with multi-flag within `<head>` element
* Fixed issue with `<a>` not being flagged correct

## Version 0.1.2
* Removed foreach loop
* Moved `_diagnostics` from while loop
* Better Regex patterns
* Added Regex for `<title>`, multi-line `<head>`, multi-line `<a>`

## Version 0.1.1
* Moved RegEx patterns to Patterns.ts
* Refactored RegEx to be more readable
* Changed switch statements to be more forgiving with typos

## Version 0.1.0
* Added RegEx search qeuries for `<div>, <span>, <a>, <img>, <meta>, <html>`
* Added messages for above coding errors

## Version 0.0.2
* Changed extension type to `language-server`

## Version 0.0.1
* Auto-generated extension for Visual Studio Code with [Yocode](https://code.visualstudio.com/docs/extensions/yocode)