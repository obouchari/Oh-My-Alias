import path from "path";
import os from "os";
import chalk from "chalk";
import { spawn, SpawnOptionsWithoutStdio } from "child_process";

// Constants for CLI configuration
const CLI_DIR_NAME = ".ali-cli";
const ALIASES_JSON_FILE = "aliases.json";
const SHELL_ALIASES_SCRIPT_FILE = "shell-aliases.sh";

/**
 * Returns the path to the CLI's configuration directory.
 * E.g., ~/.ali-cli on Linux/macOS, %USERPROFILE%/.ali-cli on Windows.
 * @returns {string} The full path to the CLI's config directory.
 */
export function getAliasDirPath(): string {
  return path.join(os.homedir(), CLI_DIR_NAME);
}

/**
 * Returns the full path to the JSON file where aliases are stored.
 * @returns {string} The full path to the aliases JSON file.
 */
export function getAliasesJsonPath(): string {
  return path.join(getAliasDirPath(), ALIASES_JSON_FILE);
}

/**
 * Returns the full path to the shell script that defines the aliases.
 * @returns {string} The full path to the shell aliases script.
 */
export function getShellScriptPath(): string {
  return path.join(getAliasDirPath(), SHELL_ALIASES_SCRIPT_FILE);
}

/**
 * Displays a message to the console with styling based on type.
 * @param {string} message The message to display.
 * @param {'info' | 'success' | 'warning' | 'error'} type The type of message for styling.
 */
export function displayMessage(
  message: string,
  type: "info" | "success" | "warning" | "error" = "info"
): void {
  switch (type) {
    case "info":
      console.log(chalk.blue(message));
      break;
    case "success":
      console.log(chalk.green(message));
      break;
    case "warning":
      console.warn(chalk.yellow(message));
      break;
    case "error":
      console.error(chalk.red(message));
      break;
    default:
      console.log(message);
  }
}

/**
 * Executes a shell command and streams its output.
 * @param {string} command The command string (e.g., 'git clone').
 * @param {string[]} args Arguments for the command.
 * @param {SpawnOptionsWithoutStdio} options Optional spawn options.
 * @returns {Promise<void>} A promise that resolves when the command completes successfully, or rejects on error.
 */
export function executeCommand(
  command: string,
  args: string[] = [],
  options?: SpawnOptionsWithoutStdio
): Promise<void> {
  return new Promise((resolve, reject) => {
    // For cross-platform compatibility, especially on Windows, it's often better
    // to run commands via a shell.
    const shell = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
    const shellArgs =
      process.platform === "win32"
        ? ["-Command", `${command} ${args.map((a) => `"${a}"`).join(" ")}`]
        : ["-c", `${command} ${args.map((a) => `'${a}'`).join(" ")}`];

    const child = spawn(shell, shellArgs, {
      stdio: "inherit", // Inherit stdin, stdout, stderr of the parent process
      ...options,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start command: ${err.message}`));
    });
  });
}
