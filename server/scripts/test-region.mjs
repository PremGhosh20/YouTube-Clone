import {
  SOUTH_INDIA_STATES,
  getISTHour,
  isMorningLightWindow,
  isSouthIndiaState,
  resolveTheme,
} from "../lib/region.js";

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

assert("Tamil Nadu is south", isSouthIndiaState("Tamil Nadu", "TN"));
assert("Maharashtra not south", !isSouthIndiaState("Maharashtra", "MH"));
assert("KL code is south", isSouthIndiaState("", "KL"));
assert("5 states defined", SOUTH_INDIA_STATES.length === 5);

assert(
  "light theme south + morning",
  resolveTheme({ isSouthIndia: true, isMorningWindow: true }) === "light"
);
assert(
  "dark theme south + evening",
  resolveTheme({ isSouthIndia: true, isMorningWindow: false }) === "dark"
);
assert(
  "dark theme north + morning",
  resolveTheme({ isSouthIndia: false, isMorningWindow: true }) === "dark"
);

const hour = getISTHour();
assert("IST hour 0-23", hour >= 0 && hour <= 23);
assert("isMorningLightWindow boolean", typeof isMorningLightWindow() === "boolean");

console.log(`\n${passed}/${passed + failed} region/theme checks passed`);
process.exit(failed > 0 ? 1 : 0);
