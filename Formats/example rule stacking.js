if(typeof(module)=="undefined") var module = {}; //support node as well as client side transpiling
module.exports = (function(Empirler, callback){
    var Syntax = Empirler.Syntax;
    var RuleSet = Empirler.RuleSet;
    var Rule = Empirler.Rule;
    
    //the rules to use
    var ruleSet = new RuleSet([
        new Rule({ //create a group in which capitals will get additional formatting
            name: "capitals",
            opening: "{",
            openingReplacement: "",
            closing: "}",
            closingReplacement: "",
            rules: {
                addition:[new Rule({ //detect capitals and apply additional formatting
                    name: "capital",
                    opening: /[A-Z]+/g,
                    openingReplacement: "<span style=text-decoration:underline>@0</span>"
                })]
            }
        }), new Rule({ //create a group in which lower case character will get additional formatting
            name: "noCapitals",
            opening: "[",
            openingReplacement: "",
            closing: "]",
            closingReplacement: "",
            rules: {
                addition:[new Rule({ //detect lower case characters and apply additional formatting
                    name: "lowerCase",
                    opening: /[a-z]+/g,
                    openingReplacement: "<span style=color:red>@0</span>"
                })],
                removal: [ //don't allow the capital rule to be used in this group
                    "capitals"
                ]
            }
        }), new Rule({ //create a group in which capitals will get additional formatting, but only when directly in this group
            name: "capitalsDontCarry",
            opening: "(",
            openingReplacement: "",
            closing: ")",
            closingReplacement: "",
            rules: {
                dontCarryAddition:[new Rule({ //detect capitals and apply additional formatting
                    name: "capitalDontCarry",
                    opening: /[A-Z]+/g,
                    openingReplacement: "<span style=text-decoration:underline>@0</span>"
                })]
            }
        }), new Rule({ //create a group in which none of the rules apply
            name: "literal",
            opening: "-",
            openingReplacement: "",
            closing: "-",
            closingReplacement: "",
            rules: null
        })
    ]);
    
    var syntax = new Syntax({ruleSet: ruleSet});
    callback(syntax);
});