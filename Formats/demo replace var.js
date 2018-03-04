//a context aware js variable replacement example

if(typeof(module)=="undefined") var module = {};
module.exports = (function(Empirler, callback){
    var Syntax = Empirler.Syntax;
    var RuleSet = Empirler.RuleSet;
    var Rule = Empirler.Rule;
    
    var functionToReplaceIn = "test";
    var variableToReplace = "stuff";
    var variableToReplaceWith = "someKindOfStuff";
    
    var ruleSet = new RuleSet([
        new Rule({
            n: "functionReplace",
            o: new RegExp("(function "+functionToReplaceIn+")\\(([^\\)]*)\\){"),
            or: function(match, prefix){
                var args = match.substring(prefix.length).replace(new RegExp("\\b"+variableToReplace+"\\b"), variableToReplaceWith);
                return match.substring(0, prefix.length)+args;
            },
            c: "}",
            cr: "}",
            r: {
                a: [
                    new Rule({
                        n: "variable",
                        o: new RegExp("\\b"+variableToReplace+"\\b"),
                        or: variableToReplaceWith
                    })
                ]
            }
        }), new Rule({
            n: "function",
            o: new RegExp("function(\\s+([^{])*)?\\(([^\\)]*\\b"+variableToReplace+"\\b[^\\)]*)\\){"),
            c: "}",
            r: {
                r: ["variable"]
            }
        }), new Rule({
            n: "balancedBrackets", //makes sure that a function won't close on the first bracket it finds
            o: "{",
            c: "}",
        }), new Rule({
            n: "string1", //makes sure no variables are replaced in strings
            o: '"',
            c: /([^\\])"/,
            r: null //removes any rules, so the matched content will be plain text
        }), new Rule({
            n: "string2",
            o: "'",
            c: /([^\\])'/,
            r: null
        }), new Rule({
            n: "string3",
            o: '`1`',
            c: /([^\\])`/,
            r: null
        })
    ]);
    
    var syntax = new Syntax({
        ruleSet: ruleSet,
    });
    callback(syntax);
});