import { execSync } from "child_process";

const run = (cmd) => {
  console.log(`[merge-main] $ ${cmd}`);
  const out = execSync(cmd, { cwd: "/vercel/share/v0-project", encoding: "utf8" });
  if (out) console.log(out.trim());
  return out.trim();
};

const branch = run("git branch --show-current");
console.log(`[merge-main] On branch: ${branch}`);

run("git fetch origin");
run("git merge origin/main --no-edit");

console.log("[merge-main] Post-merge log:");
run("git log --oneline -5");
