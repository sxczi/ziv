import fs from "fs";
import path from "path";
import chalk from "chalk";
import prompt from "prompt-sync";

const inp = prompt();
const args = process.argv.slice(2);
const supportFunctions = ["output", "input"];
const datatypes = [
  {
    value: "null",
    regex: /null/,
  },
  {
    value: "int",
    regex: /^\d+$/,
  },
  {
    value: "float",
    regex: /[+-]?(?=\d*[.eE])(?=\.?\d)\d*\.?\d*(?:[eE][+-]?\d+)?/,
  },
  {
    value: "str",
    regex: /(["'])(?:(?=(\\?))\2.)*?\1/,
  },
  {
    value: "bool",
    regex: /(true|false)/,
  },
];

class Stack {
  constructor() {
    this.items = [];
  }

  push(elem) {
    this.items.push(elem);
  }

  pop() {
    return this.items.pop();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

const callstack = new Stack();

if (fs.existsSync(`${args[0]}.ziv`)) {
  parse(fs.readFileSync(`./${args[0]}.ziv`, "utf-8").split("\n"));
} else {
  console.log(
    chalk.bgRed(
      `Error: ${path.resolve(args[0] + ".ziv")}: This file doesn't exist`
    )
  );
}

function parse(code) {
  for (let i = 0; i < code.length - 1; i++) {
    let line = code[i];
    if (!line.startsWith("#")) {
      const currentLine = line.split(" ");
      for (let j = 0; j < currentLine.length - 1; j++) {
        let word = currentLine[j];

        if (word === "mutable" || word === "immutable") {
          let val = line.split(" ").slice(3).join(" ");

          const evaluate = (str) => {
            if (/^[0-9()+\-*.\/]*$/.test(str)) {
              return eval(str);
            } else {
              let string = line.split(" ").slice(3).join(" ");
              if (string.split(" ")[0] === "input") {
                return `"${inp(eval(string.split(" ").slice(1).join(" ")))}"`;
              } else return str;
            }
          };

          val = evaluate(val);

          callstack.push({
            type: "variable",
            kind: word,
            identifier: currentLine[currentLine.indexOf(word) + 1],
            value: val,
            implicitType: datatypes.filter((value) => value.regex.test(val))[0],
          });
        } else if (word === "output") {
          console.log(
            eval(
              line
                .split(" ")
                .slice(1)
                .join(" ")
                .replace(/(?<!\w)#\w+/g, (x) => {
                  const variable = callstack.items.filter((item) => {
                    if (
                      item.type === "variable" &&
                      item.identifier === x.split("#")[1]
                    ) {
                      return item.value;
                    }
                  });
                  // console.log(eval(variable[0].value))
                  return eval(variable[0].value);
                })
            )
          );
        }
      }
    }
  }
}
