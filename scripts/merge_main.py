import subprocess
import sys
import os

PROJECT_DIR = "/vercel/path0"

def run(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=PROJECT_DIR)
    print(f"CMD: {cmd}")
    print(f"STDOUT: {result.stdout.strip()}")
    if result.stderr.strip():
        print(f"STDERR: {result.stderr.strip()}")
    print(f"RC: {result.returncode}")
    print("---")
    return result

# Confirm the directory exists
print(f"PROJECT_DIR exists: {os.path.isdir(PROJECT_DIR)}")
print(f"Contents: {os.listdir(PROJECT_DIR)[:10] if os.path.isdir(PROJECT_DIR) else 'N/A'}")

# Show current branch
run("git branch --show-current")

# Fetch latest from origin
run("git fetch origin")

# Show what commits are on main that we don't have
run("git log HEAD..origin/main --oneline")

# Merge origin/main
result = run("git merge origin/main --no-edit")

if result.returncode != 0:
    print("MERGE FAILED - showing conflicts:")
    run("git status")
    sys.exit(1)

# Confirm the merge
run("git log --oneline -5")
run("git status")
print("DONE")
