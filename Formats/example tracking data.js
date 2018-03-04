if(typeof(module)=="undefined") var module = {}; //support node as well as client side transpiling
module.exports = (function(Empirler, callback){
    var Syntax = Empirler.Syntax;
    var RuleSet = Empirler.RuleSet;
    var Rule = Empirler.Rule;
    
    var ruleSet = new RuleSet([
        new Rule({
            name: "header",
            opening: /<h([1-6])>/,
            closing: "</h@1>",
            openingReplacement: function(){
                callback = arguments[arguments.length-1];
                this.assembleContent(function(text){ //assemble the content of the header to set as the ID and store
                    this.input.titles.push(text); //this.input will be the same input passed to the pre and post processor
                    callback("<h@1 id='"+text+"'>");
                });
            },
        })
    ]);
    
    //the completed syntax
    var syntax = new Syntax({
        ruleSet: ruleSet,
        preProcessor: function(input, callback){
            callback = arguments[arguments.length-1]; //arguments might differ, but callback is always the last argument
            input.titles = []; //create a field to store data in
            callback();
        },
        postProcessor: function(input, content, callback){
            callback = arguments[arguments.length-1]; //arguments might differ, but callback is always the last argument
            
            var index = "Contents:<br>";
            //Go through all titles that have been stored in the transpiling process
            for(var i=0; i<input.titles.length; i++){
                var title = input.titles[i];
                index += "<a href='#"+title+"'>"+title+"</a><br>";
            }
            index += "<br>";
            
            callback(index+content);
        }
    });
    callback(syntax);
});