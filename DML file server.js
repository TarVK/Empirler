var express = require('express');
var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');
var Empirler = require(path.join(__dirname, 'Empirler.js'));
Empirler.setSyntax("DML");

var router = express();
var server = http.createServer(router);
var docsFolder = path.join(__dirname); //you can join extra parts here for a relative path

function writeFile(dir, contents, callback){
    fs.writeFile(dir, contents, function(err){
        if(err){
            return console.log(err);
        }
        if(callback) callback(err);
    }); 
}

//read file with modification dates
var fileData = {};
var fileDataName = "DML file info.json";
fs.readFile(fileDataName, 'utf8', function(err, data){
    if(!err){
        try{
            fileData = JSON.parse(data);
        }catch(e){}
    }
});
function saveFileData(){
    fs.writeFile(fileDataName, JSON.stringify(fileData, null, 4), function(err){
        if(err){
            return console.log(err);
        }
    }); 
}

//use ?singleFile=true in the file request to compile the file into a single src file
router.get(/./, function(req, res){
    var filePath = path.join(docsFolder, url.parse(req.url).pathname.replace(/%20/g," "));
    var ext = path.extname(filePath).substring(1).toLowerCase();
    
    DML: if(ext=="html" || ext=="dml"){
        var dirs = filePath.split(/\\|\//);
        var fileName = dirs.pop();
        fileName = fileName.split(".");
        fileName.pop();
        fileName.join(".");
        
        var srcFile;
        if(ext!="html"){ //redirect when user navigated to the .dml file
            srcPath = path.sep+path.join.apply(path, dirs);
            var folder = dirs.pop();
            if(folder=="DML src"){
                var parentDirs = path.sep+path.join.apply(path, dirs);
                var outputFile = path.join(parentDirs, fileName+".html").replace(__dirname, "");
                
                res.writeHead(302, {
                    'Location': outputFile
                });
                res.end();
                return
            }else{
                dirs = path.sep+path.join.apply(path, dirs);
                srcFile = filePath;
                outputFile = null;
            }
        }else{
            dirs = path.sep+path.join.apply(path, dirs);
            srcFile = path.join(dirs, "DML src", fileName+".dml");
            var outputFile = filePath;
        }
        
        
        //get proper in and output file pat
        var embedLocation = path.join(__dirname, path.sep);
        if(!fs.existsSync(srcFile)){
            break DML;
        }
        
        //check whether the file should be transpiled into a single file
        var singleFile = req.query.singleFile=="true";
        Empirler.embedFiles = singleFile;
        
        //check if the file actually has to be transpiled
        var stats = fs.statSync(srcFile);
        // console.log(stats.mtime.toString(), stats);
        if(fileData[outputFile] && fileData[outputFile][0]==stats.mtime.toString() && (fileData[outputFile][1]==singleFile || !req.query.singleFile))
            break DML; //just pipe the file as it is already up to date    
        fileData[outputFile] = [stats.mtime.toString(), singleFile];
        saveFileData();
        
        //transpile and save the file
        var content = fs.readFileSync(srcFile).toString();
        Empirler.embedLocation = embedLocation; //it will embed files relative to this location
        
        Empirler.compile(content, dirs, function(empirled){
            res.send(empirled);
            res.end();
            if(outputFile)
                writeFile(outputFile, empirled);
        });
        return;
    }
    
    //pipe file if it wasn't dml
    if(ext!="html"){
        filePath = path.join(__dirname, url.parse(req.url).pathname.replace(/%20/g," "));
    }
    if(fs.existsSync(filePath)){
        var readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
        return true;
    }
        
    res.send("File not found").end();
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
    var addr = server.address();
    console.log("server listening at", addr.address + ":" + addr.port);
});


process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
