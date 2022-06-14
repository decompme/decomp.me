# Beginner's Guide to Shortcuts and Formatting

This is a short beginner's guide to the keyboard shortcuts available within the [decomp.me](https://decomp.me) code editor, as well as a quick reference guide for the colors and symbols used in code comparisons in the `Compilation` sandbox.

## Keyboard Shortcuts

### Cursor Movement
| Keyboard shortcut 								| Description 								|
| :--- 												| :---										|
| <kbd>Home</kbd>									| Move cursor to beginning of current line 	|
| <kbd>End</kbd>									| Move cursor to end of current line 		|
| <kbd>PgUp</kbd>									| Move cursor one screen up					|
| <kbd>PgDn</kbd>									| Move cursor one screen down				|
| <kbd>Ctrl</kbd>+<kbd>Home</kbd>					| Move cursor to beginning of file			|
| <kbd>Ctrl</kbd>+<kbd>End</kbd>					| Move cursor to end of file				|
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>\\</kbd>	 	| Move cursor to matching bracket			|

### Selection
| Keyboard shortcut 								| Description 								|
| :--- 												| :---										|
| <kbd>Shift</kbd>+<kbd>←</kbd>/<kbd>→</kbd>		| Select backward/forward one character		|
| <kbd>Ctrl</kbd>+<kbd>←</kbd>/<kbd>→</kbd>			| Select backward/forward one 'word'		|
| <kbd>Ctrl</kbd>+<kbd>L</kbd>						| Select current line						|
| <kbd>Ctrl</kbd>+<kbd>A</kbd>						| Select all/entire file					|

### Line Movement
| Keyboard shortcut 								| Description 								|
| :--- 												| :---										|
| <kbd>Enter</kbd>/<kbd>Shift</kbd>+<kbd>Enter</kbd> | Insert new line (with auto indent)		|
| <kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>			| Shift current line up/down				|
| <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> | Duplicate current line up/down	|
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd>		| Delete current line						|

### Undo, Redo, Delete
| Keyboard shortcut 								| Description 								|
| :--- 												| :---										|
| <kbd>Backspace</kbd>/<kbd>Del</kbd>				| Delete character to left/right			|
| <kbd>Ctrl</kbd>+<kbd>Backspace</kbd>/<kbd>Del</kbd> | Delete word to left/right				|
| <kbd>Ctrl</kbd>+<kbd>Z</kbd>						| Undo last action							|
| <kbd>Ctrl</kbd>+<kbd>Y</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>) | Redo last action |
| <kbd>Ctrl</kbd>+<kbd>U</kbd>						| Undo selection							|


### Formatting
| Keyboard shortcut 								| Description 								|
| :--- 												| :---										|
| <kbd>Tab</kbd> (or <kbd>Ctrl</kbd>+<kbd>\]</kbd>)	| Increase indent of cursor/selection		|
| <kbd>Shift</kbd>+<kbd>Tab</kbd> (or <kbd>Ctrl</kbd>+<kbd>\[</kbd>) | Decrease indent of cursor/selection |
| <kbd>Ctrl</kbd>+<kbd>K</kbd>, <kbd>Ctrl</kbd>+<kbd>C</kbd> | Comment current line 			| 
| <kbd>Ctrl</kbd>+<kbd>K</kbd>, <kbd>Ctrl</kbd>+<kbd>U</kbd> | Uncomment current line 			|
| <kbd>Ctrl</kbd>+<kbd>\/</kbd>						| Toggle line comments on selection			|
| <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>A</kbd>		| Toggle block comments on selection		|
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>\[</kbd>	| Collapse code block at bracket			| 
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>\[</kbd>	| Expand code block at bracket 				|
| <kbd>Ctrl</kbd>+<kbd>K</kbd>, <kbd>Ctrl</kbd>+<kbd>0</kbd>		| Collapse all code blocks	|
| <kbd>Ctrl</kbd>+<kbd>K</kbd>, <kbd>Ctrl</kbd>+<kbd>J</kbd>		| Expand all code blocks	|

### Search and Replace
| Keyboard shortcut 								| Description 								|
| :--- 												| :---										|
| <kbd>Ctrl</kbd>+<kbd>G</kbd>						| Go to line...								|
| <kbd>Ctrl</kbd>+<kbd>F</kbd>						| Open search and replace panel				|
| <kbd>Esc</kbd> 									| Close search and replace panel			|
| <kbd>Alt</kbd>+<kbd>Enter</kbd>					| Select matches				 			| 
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd> 	| Replace all								|
| <kbd>Ctrl</kbd>+<kbd>\/</kbd>						| Toggle line comments on selection			|
| <kbd>Ctrl</kbd>+<kbd>D</kbd>						| Select next occurrence					|
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd>		| Select all matches with current selection	(multi edit)|



## Color and Symbol Guide

decomp.me uses color and symbols to help make understanding the assembly code comparisons easier. 
- Branches (`~>`) are color-coded to form "from" and "to" pairs
- Where code aligns **except for registers**, registers used in the same context are equivalently color-coded between `Target` and `Current` to help spot their usage
- Specific types of differences between `Target` and `Current` assembly code are denoted with color and symbol:

| Symbol 		| Color 	| Description 													|
| ---			| ---		| ---															|
| (no symbol)	| White		| Match - lines are the same, up to constant naming				|
| `<`			| <span style="color:#CD0404">Red</span>		| Deletion - line is present (in this spot) in `Target`, but not (in this spot) in `Current` 	|
| `>`			| <span style="color:#43B601">Green</span>		| Insertion - line is present (in this spot) in `Current`, but not (in this spot) in `Target`	|
| `\|`			| <span style="color:#6D6DFF">Blue</span>		| Change - line is a different instruction in `Target` and in `Current`		|
| `i`			| <span style="color:#6D6DFF">Blue</span>		| Immediate difference - instruction matches, but numerical constants are different, or relocated |
| `r`			| <span style="color:#8E7504">Gold</span>		| Register Swap - at least one register used in this line does not match |
| `s`			| <span style="color:#ABC501">Yellow</span>		| Stack Difference - memory allocation does not match			|
