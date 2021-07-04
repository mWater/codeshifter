module.exports = {
  jscodeshiftScripts: [
    "prefer-function-declarations.js",
    "./codeshifter/manual-bind-to-arrow.js"
  ],
  decaffeinateArgs: [
    "--loose",
    "--use-cs2",
    "--disable-suggestion-comment",
    "--optional-chaining"
  ],
  useJSModules: true,
  outputFileExtension: "js"
};
