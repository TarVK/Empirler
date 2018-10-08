# Empirler
Empirler.js is an open-source library, written in JavaScript. It can be used to create your own markup language, and transpile it to a known language like HTML. It is designed to both be usable client and server side. To use the library server side you require node.js.

If you want more information, see example code, or use Empirler online, you can [click here to go to the Empirler website](https://tarvk.github.io/Empirler/docs/About.html).

Even though Empirler was initially designed to build markup languages, it is not limited to them.

It can be used to build transpilers which convert one programming language to another. In general, transpiling with Empirler is easy as long as the 2 languages follow a similar structure. However if the 2 languages have entirely different structures, transpiling will be more difficult to achieve within Empirler. This is one of the major obstacles we want to overcome in Empirler v2

It can also be used in any case where data requires reading or transpiling but contains too much structure to just be understood purely with RegEx. Empirler can be seen as a library to extend the capabilities of a RegEx replacement, by providing structure and context to these replacements.

## Example of the type of transpiling that can be done by empirler
input:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<note>
   <to>Tove</to>
   <from>Jani</from>
   <heading>Reminder</heading>
   <body>Don't forget me this weekend!</body>
</note>
```
output:
```json
{
    "type": "note",
    "children": [
        {
            "type": "to",
            "value": "Tove"
        },
        {
            "type": "from",
            "value": "Jani"
        },
        {
            "type": "heading",
            "value": "Reminder"
        },
        {
            "type": "body",
            "value": "Don't forget me this weekend!"
        }
    ]
}
```

## DML
Currently, we have personally created 1 markup language with Empirler, called DML, which stands for Documentation Markup Language. All of the content on this website, with the exception of the Empirler editor, has been written using DML.

## Notice
The code of Empirler is quite chaotic and may contain mistakes. The reason for this is that this once again is a project that started way simpler. The idea wasn't initially to build a script of more than a thousand lines, more around 200. In other words, very little planning initially went into this project, and parts of the code have been rewritten multiple times, and are likely to contain bugs.

I have learned a lot about programming languages since making this project. So I might make a new version of this in the future. I do quite like the way you can use Empirler, but the code and system behind it I am not so proud of anymore. I would also like to generalize the system, to be able to handle more complex tasks.  

## Known issues
-DML headers don't appear in index when using [h0][/h0] notation
