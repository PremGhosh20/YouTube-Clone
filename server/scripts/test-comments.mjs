import { validateCommentText } from "../lib/commentModeration.js";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.error(`FAIL: ${name}`);
    failed++;
  }
}

assert("allows English", validateCommentText("Hello world!").ok);
assert("allows Hindi", validateCommentText("नमस्ते दुनिया").ok);
assert("allows Tamil", validateCommentText("வணக்கம்").ok);
assert("blocks @ symbol", !validateCommentText("Hello @user").ok);
assert("blocks # hashtag", !validateCommentText("test #tag").ok);
assert("blocks empty", !validateCommentText("   ").ok);
assert("allows punctuation", validateCommentText("Great video, thanks!").ok);

console.log(`\n${passed}/${passed + failed} comment moderation checks passed`);
process.exit(failed > 0 ? 1 : 0);
