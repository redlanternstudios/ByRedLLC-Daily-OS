import fs from "node:fs"

const requiredFiles = [
  "learning-loop/README.md",
  "learning-loop/LOOP_ROUTING_MAP.json",
  "learning-loop/MOTIONS_LIBRARY.md",
  "learning-loop/LEARNING_LEDGER.md",
  "learning-loop/RECIPES.md",
  "BYREDLLC_OPERATING_RECEIPT.md",
]

const requiredSections = {
  "learning-loop/MOTIONS_LIBRARY.md": ["## Web App Motions", "## Provider-Team Motions"],
  "learning-loop/LEARNING_LEDGER.md": [
    "## Web App Lessons",
    "## Dashboard UX Lessons",
    "## Provider-Team Lessons",
    "## Deployment Env Lessons",
    "## Universal Candidates",
  ],
  "learning-loop/RECIPES.md": ["## Dashboard UX Recipes", "## Provider-Team Recipes"],
}

const failures = []

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing file: ${file}`)
}

for (const [file, sections] of Object.entries(requiredSections)) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, "utf8")
  for (const section of sections) {
    if (!text.includes(section)) failures.push(`missing section in ${file}: ${section}`)
  }
}

if (fs.existsSync("learning-loop/LOOP_ROUTING_MAP.json")) {
  try {
    const map = JSON.parse(fs.readFileSync("learning-loop/LOOP_ROUTING_MAP.json", "utf8"))
    const categories = new Set((map.routing_rules ?? []).map((rule) => rule.category))
    for (const category of [
      "web_app_feature",
      "dashboard_ux",
      "provider_team",
      "deployment_env",
      "ios_agent",
      "universal_candidate",
    ]) {
      if (!categories.has(category)) failures.push(`missing routing category: ${category}`)
    }
    if (!Array.isArray(map.never_store) || !map.never_store.includes("API keys")) {
      failures.push("routing map must include secret no-store rule")
    }
  } catch (error) {
    failures.push(`invalid LOOP_ROUTING_MAP.json: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const result = {
  ok: failures.length === 0,
  checked_files: requiredFiles.length,
  failures,
}

console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exit(1)
