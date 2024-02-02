const readline = require("node:readline");
const stream = require("node:stream");
const { stdout } = require("node:process");
const { exec } = require("node:child_process");
const OpenAI = require("openai");

const mutableStdout = new stream.Writable({
  write: function (chunk, encoding, callback) {
    if (!this.muted) process.stdout.write(chunk, encoding);
    callback();
  },
});

const openAIApi = new OpenAI({
  apiKey: "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",
});

async function mixtral(messages) {
  const result = await openAIApi.chat.completions.create({
    model: "gpt-4-1106-preview",
    stream: false,
    max_tokens: 512,
    messages: messages.map((it) => ({
      role: it.role,
      content: it.text,
    })),
  });

  return {
    text: result.choices[0].message.content || "",
  };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true,
});

const question = (query, options) => {
  return new Promise((resolve) => {
    rl.question(query, (result) => {
      resolve(result);
    });
  });
};

const resetCode = "\x1b[0m";
const red = (str) => `\x1b[31m"${str}${resetCode}`;
const blue = (str) => `\x1b[34m${str}${resetCode}`;
const green = (str) => `\x1b[32m${str}${resetCode}`;

const history = [
  {
    role: "system",
    text: `Provide only shell commands for MacOS without any description.
If there is a lack of details, provide most logical solution.
Ensure the output is a valid shell command.
If multiple steps required try to combine them together using &&.
Provide only plain text without Markdown formatting.
Do not provide markdown formatting such as ${"```"}
If you want to say something to me use echo command`,
  },
];

(async () => {
  while (true) {
    const prompt = await question(green("> "));
    if (!prompt) {
      continue;
    }
    history.push({ role: "user", text: prompt });
    const cmd = await mixtral(history).then((r) => {
      return r.text.split("\n")[0];
    });

    console.log(blue(`\r< ${cmd}`));

    history.push({ role: "assistant", text: cmd });
    exec(cmd, (err, res) => {
      if (err) {
        console.log(red(err.message));
        history.push({ role: "user", text: err.message });
      } else {
        history.push({ role: "user", text: res });
        process.stdin.write(`\r${resetCode}${res}\n`);
        process.stdin.write(green("> "));
      }
    });
  }
})();
