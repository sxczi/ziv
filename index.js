#! /usr/bin/env node

import fs, { copyFileSync } from "fs";
import path from "path";
import chalk from "chalk";
import prompt from "prompt-sync";

const inp = prompt();
const args = process.argv.slice(2);
const operators = ["=", "+=", "-=", "*=", "/=", "%="];
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
  // console.log(callstack.items);
} else {
  console.log(
    chalk.bgRed(
      `Error: ${
        args[0]
          ? path.resolve(args[0] + ".ziv: This file doesn't exist")
          : "Please provide a file"
      }`
    )
  );
}

function parse(code) {
  try {
    for (let i = 0; i < code.length; i++) {
      let line = code[i];
      let lineNumber = i + 1;
      if (!line.startsWith("#")) {
        const currentLine = line.trim().replace(/\s+/g, " ").split(" ");

        for (let j = 0; j < currentLine.length; j++) {
          let word = currentLine[j];

          if (word === "mutable" || word === "immutable") {
            let val = line.replace(/\s+/g, " ").split(" ").slice(3).join(" ");

            const evaluate = (str) => {
              if (/^[0-9()+\-*.\/]*$/.test(str)) {
                return eval(str);
              } else {
                let string = line
                  .replace(/\s+/g, " ") // removes extra whitespace between words
                  .split(" ")
                  .slice(3)
                  .join(" ");
                if (string.split(" ")[0] === "input") {
                  return `"${inp(eval(string.split(" ").slice(1).join(" ")))}"`;
                } else return str;
              }
            };

            val = eval(evaluate(val));

            callstack.push({
              type: "variable",
              kind: word,
              identifier: currentLine[currentLine.indexOf(word) + 1],
              value: val,
              implicitType: datatypes.filter((value) =>
                value.regex.test(val)
              )[0],
            });
            break;
          } else if (word === "output") {
            console.log(
              eval(
                line
                  .replace(/\s+/g, " ")
                  .split(" ")
                  .slice(1)
                  .join(" ")
                  .replace(/(?<!\w)@\w+/g, (x) => {
                    // for words that start with @
                    const variable = callstack.items.filter((item) => {
                      if (
                        item.type === "variable" &&
                        item.identifier === x.split("@")[1]
                      ) {
                        return item.value;
                      }
                    });
                    // console.log(eval(variable[0].value))
                    return eval(variable[0]?.value || null);
                  })
              )
            );
            break;
          } else if (
            callstack.items.some((item) => item.identifier === word) &&
            operators.includes(currentLine[1])
          ) {
            let val = line.replace(/\s+/g, " ").split(" ").slice(2).join(" ");
            val = eval(val);

            callstack.items.filter((item) => {
              if (item.identifier === word) {
                if (item.kind === "mutable") {
                  if (currentLine[1] === "=") {
                    item.value = val;
                  } else if (currentLine[1] === "+=") {
                    item.value += val;
                  } else if (currentLine[1] === "-=") {
                    item.value -= val;
                  } else if (currentLine[1] === "*=") {
                    item.value *= val;
                  } else if (currentLine[1] === "/=") {
                    item.value /= val;
                  } else if (currentLine[1] === "%=") {
                    item.value %= val;
                  }
                } else {
                  throw `Error: ${path.resolve(
                    args[0] + ".ziv"
                  )}:${lineNumber}\n"${line}" -> You can't reassign an immutable variable!`;
                }
              }
            });
          }
        }
      }
    }
  } catch (err) {
    console.log(chalk.bgRed(err));
  }
}
