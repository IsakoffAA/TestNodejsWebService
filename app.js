import express from 'express'

const PORT = 5000;

const app = express();

app.use(express.json());

app.post('/render', (req, res) => {
    //получение JSON и запись его в одну строку
    var request = JSON.stringify(req.body);
    //распарсим JSON
    var fromJSON;
    fromJSON = JSON.parse(request);
    //запись текста шаблона в строку
    var template = fromJSON["template"];
    //получение объекта с подстановками
    var substitutions = fromJSON["substitutions"];
    //получение словаря из строки с подстановками
    var subst = JSON.stringify(substitutions).slice(1).slice(0, -1).split(':').join(',').split(',');
    var subMap = new Map();
    for (var i = 0; i < subst.length; i+=2) {
        subMap.set(subst[i].split('\"')[1], subst[i+1].split('\"')[1]);
    }
    //созание строки, которая передаётся в eval()
    var to_eval = "";
    //создание переменных из словаря подстановок
    subMap.forEach((value, key) => {
        to_eval += "var " +  key + " = \"" + value + "\";\n"
    });
    //разделение шаблона по <?
    try {
        var leftSplited = template.split(/<\?/);
        var firstTempl = leftSplited[0].split(/\?>/);
        if (firstTempl.length > 1) {
            throw new Error("Template parsing error: missing first <?"); //исключение при отсутствии первой скобки <?
        }
        else {
            //создание строки result
            to_eval += "var result = \"\";\nresult += \"" + leftSplited[0] + "\";\n";
            for (var i = 1; i < leftSplited.length; i++) {
                var rightSplited = leftSplited[i].split(/\?>/);
                if (rightSplited.length != 2) {
                    throw new Error("Template parsing error: missing <? or ?>"); //исключение при отсутствии закрывающих скобок ?>
                }
                else {
                    //добавление js вставок в to_eval
                    if (rightSplited[0][0] != "=") {
                        to_eval += rightSplited[0] + "\n";
                    }
                    //добавление в result значений ключей substitutions (<?= ...?>)
                    else {
                        to_eval += "result += " + rightSplited[0].slice(2) + ";\n";
                    }
                    //добавление в result текста вне <?...?>
                    to_eval += "result += \"" + rightSplited[1] + "\";\n";
                }
            }
            //возвращение результата в формате JSON
            to_eval += "res.status(200).json({\"result\": result});";
            eval(to_eval);
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            res.status(500).json("SyntaxError: wrong syntax in <?...?>");
        }
        else {    
            res.status(500).json(error.message);
        }
    }
})

app.listen(PORT);