/* Based on @codemirror/laegacy-modes/pascasl */
function words(str) {
    const obj = {};
    const words = str.split(" ");
    for (let i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
}
const keywords = words(
    " and array begin case const div do argv date clock argc return time read " +
        " internal downto else end  for function goto if  in addr reset eof chr " +
        " label mod nil not of operator or packed procedure max min rewrite readln succ pred ord " +
        " program record repeat set lshift rshift then to type flush " +
        " until var while with bitxor bitand bitor bitnot packed first last sizeof bitsize real " +
        " break exit continue halt otherwise true false writeln write static firstof lastof discard " +
        " assert extern external forward  hbound lbound  out define univ ",
);

const types = words(
    " integer integer16 integer32 cardinal char file double pointer string text ",
);

const atoms = { null: true };

const isOperatorChar = /[+\-^&%=<>!?|\/]/;

function tokenBase(stream, state) {
    const ch = stream.next();

    if (ch === "#" && state.startOfLine) {
        stream.skipToEnd();
        return "meta";
    }
    if (ch === '"' || ch === "'") {
        state.tokenize = tokenString(ch);
        return state.tokenize(stream, state);
    }
    if ((ch === "(" || ch === "/") && stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
    }
    if (ch === "{") {
        state.tokenize = tokenCommentBraces;
        return tokenCommentBraces(stream, state);
    }
    if (/[\[\]\(\),;\:\.]/.test(ch)) {
        return null;
    }

    if (/\d/.test(ch)) {
        stream.eatWhile(/\d/);

        if (stream.peek() === "#") {
            stream.next();
            if (stream.eatWhile(/[0-9A-Fa-f]/)) {
                return "number";
            } else {
                return null;
            }
        }

        return "number";
    }

    if (isOperatorChar.test(ch)) {
        stream.eatWhile(isOperatorChar);
        return "operator";
    }
    stream.eatWhile(/[\w\$_]/);

    const cur = stream.current().toLowerCase();

    if (keywords[cur]) {
        return "keyword";
    }

    if (atoms[cur]) {
        return "atom";
    }

    if (types[cur]) {
        return "type";
    }

    return "variable";
}

function tokenString(quote) {
    return (stream, state) => {
        let escaped = false;
        let end = false;
        while (!end) {
            const ch = stream.next();

            if (ch == null) {
                break;
            } else if (ch === quote && !escaped) {
                end = true;
                break;
            }
            escaped = !escaped && ch === "\\";
        }
        if (end || !escaped) state.tokenize = null;
        return "string";
    };
}

function tokenComment(stream, state) {
    let maybeEnd = false;
    while (true) {
        const ch = stream.next();

        if (ch == null) {
            break;
        } else if ((ch === ")" || ch === "/") && maybeEnd) {
            state.tokenize = null;
            break;
        }
        maybeEnd = ch === "*";
    }
    return "comment";
}

function tokenCommentBraces(stream, state) {
    while (true) {
        const ch = stream.next();

        if (ch == null) {
            break;
        } else if (ch === "}") {
            state.tokenize = null;
            break;
        }
    }
    return "comment";
}

// Interface

export const pascal = {
    name: "pascal",

    startState: () => ({ tokenize: null }),

    token: (stream, state) => {
        if (stream.eatSpace()) return null;
        const style = (state.tokenize || tokenBase)(stream, state);
        if (style === "comment" || style === "meta") return style;
        return style;
    },

    languageData: {
        indentOnInput: /^\s*[{}]$/,
        commentTokens: {
            block: [
                { open: "(*", close: "*)" },
                { open: "/*", close: "*/" },
            ],
        },
    },
};
