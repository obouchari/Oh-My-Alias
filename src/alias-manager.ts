import fs from "fs/promises";
import { confirm } from "@inquirer/prompts";

import {
  displayMessage,
  executeCommand,
  getAliasDirPath,
  getAliasesJsonPath,
  getShellScriptPath,
} from "./utils";

type Aliases = {
  [key: string]: string;
};

const CLI_COMMENT_START = "# Oh-My-Alias CLI Aliases";
const CLI_COMMENT_END = "# End of Oh-My-Alias CLI Aliases";

/**
 * Initializes the CLI configuration, creates necessary directories/files,
 * and provides instructions for shell integration.
 */
export async function initCliConfig(): Promise<void> {
  const aliasesDirPath = getAliasDirPath();
  const aliasesJsonPath = getAliasesJsonPath();
  const shellScriptPath = getShellScriptPath();

  try {
    // Ensure config directory exists
    await fs.mkdir(aliasesDirPath, { recursive: true });
    displayMessage(
      `Ensured config directory exists at: ${aliasesDirPath}`,
      "info"
    );

    // Ensure aliases.json exists and is empty if new
    try {
      const data = await fs.readFile(aliasesJsonPath, "utf8");
      JSON.parse(data);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        await writeAliasesJson({}); // Create empty JSON file if it doesn't exist
        displayMessage(
          `Created empty aliases file: ${aliasesJsonPath}`,
          "info"
        );
      } else {
        throw error; // Re-throw if it's another read error
      }
    }

    // Generate the initial shell script
    await syncShellAliases();

    // Provide instructions to the user
    displayMessage("\n--- CLI Initialization Complete ---", "info");
    displayMessage(
      'To make your aliases available in your shell, you need to "source" the generated script.',
      "info"
    );
    displayMessage(
      `\nAdd the following line to your shell's configuration file (e.g., ~/.bashrc, ~/.zshrc, ~/.profile):`,
      "info"
    );
    displayMessage(
      `\n  echo 'source "${shellScriptPath}"' >> ~/.your_shell_config`,
      "warning"
    );
    displayMessage(
      `\n(Replace '~/.your_shell_config' with your actual shell config file)`,
      "warning"
    );
    displayMessage(
      `\nAfter adding the line, reload your shell config by running:`,
      "info"
    );
    displayMessage(`  source ~/.your_shell_config`, "warning");
    displayMessage("Or simply open a new terminal session.", "info");
    displayMessage(
      "\nNow you can use `oma add`, `oma list`, etc to manage your aliases!",
      "success"
    );
  } catch (error: any) {
    displayMessage(`Initialization failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Creates or updates the shell script that defines the aliases.
 * @returns {Promise<void>} A promise that resolves when the script is created/updated.
 */
export async function syncShellAliases(): Promise<void> {
  const aliases = await readAliasesJson();
  const scriptContent = generateShellAliasesScriptContent(aliases);
  const shellScriptPath = getShellScriptPath();
  const aliasesDirPath = getAliasDirPath();

  try {
    await fs.mkdir(aliasesDirPath, { recursive: true });
    await fs.writeFile(shellScriptPath, scriptContent, "utf8");
    displayMessage(
      `Shell alias script created/updated at: ${shellScriptPath}`,
      "info"
    );
  } catch (error: any) {
    throw new Error(`Failed to write shell aliases script: ${error.message}`);
  }
}

/**
 * Reads aliases from the JSON configuration file.
 * If the file doesn't exist, it returns an empty object.
 * @returns {Promise<Aliases>} A promise that resolves to the aliases object.
 */
async function readAliasesJson(): Promise<Aliases> {
  const aliasesFilePath = getAliasesJsonPath();
  try {
    const data = await fs.readFile(aliasesFilePath, "utf8");
    return JSON.parse(data) as Aliases;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File not found, return empty aliases
      return {};
    }
    throw new Error(`Error reading aliases file: ${error.message}`);
  }
}

/**
 * Writes aliases to the JSON configuration file.
 * Creates the directory if it doesn't exist.
 * @param {Aliases} aliases The aliases object to write.
 * @returns {Promise<void>} A promise that resolves when the file is written.
 */
async function writeAliasesJson(aliases: Aliases): Promise<void> {
  const aliasesDirPath = getAliasDirPath();
  const aliasesFilePath = getAliasesJsonPath();
  try {
    await fs.mkdir(aliasesDirPath, { recursive: true }); // Ensure directory exists
    await fs.writeFile(
      aliasesFilePath,
      JSON.stringify(aliases, null, 2),
      "utf8"
    );
  } catch (error: any) {
    throw new Error(`Error writing aliases file: ${error.message}`);
  }
}

/**
 * Generates the content for the shell script that defines aliases.
 * @param {Aliases} aliases The aliases object.
 * @returns {string} The content of the shell script.
 */
function generateShellAliasesScriptContent(aliases: Aliases): string {
  let scriptContent = `${CLI_COMMENT_START}\n`;
  for (const name in aliases) {
    if (Object.prototype.hasOwnProperty.call(aliases, name)) {
      // Escape double quotes within the command to ensure it's properly interpreted by the shell
      const command = aliases[name].replace(/"/g, '\\"');
      scriptContent += `alias ${name}="${command}"\n`;
    }
  }
  scriptContent += `${CLI_COMMENT_END}\n`; // Mark the end of our block
  return scriptContent;
}

/**
 * Adds a new alias to the configuration.
 * @param {string} name The alias name.
 * @param {string} command The command to alias.
 */
export async function addAlias(name: string, command: string): Promise<void> {
  const aliases = await readAliasesJson();
  if (aliases[name]) {
    const overwrite = await confirm({
      message: `Alias '${name}' already exists. Do you want to overwrite it?`,
      default: false,
    });
    if (!overwrite) {
      displayMessage("Alias not added.", "info");
      return;
    }
  }
  aliases[name] = command;
  await writeAliasesJson(aliases);
  await syncShellAliases(); // Resync the shell script
}

/**
 * Lists all stored aliases.
 */
export async function listAliases(): Promise<void> {
  const aliases = await readAliasesJson();
  if (Object.keys(aliases).length === 0) {
    displayMessage("No aliases found.", "info");
    return;
  }

  displayMessage("\n--- Your Aliases ---", "info");
  for (const name in aliases) {
    if (Object.prototype.hasOwnProperty.call(aliases, name)) {
      displayMessage(`  ${name}: "${aliases[name]}"`, "info");
    }
  }
  displayMessage("--------------------\n", "info");
}

/**
 * Removes an alias from the configuration.
 * @param {string} name The alias name to remove.
 */
export async function removeAlias(name: string): Promise<void> {
  const aliases = await readAliasesJson();
  if (!aliases[name]) {
    displayMessage(`Alias '${name}' not found.`, "warning");
    return;
  }

  const proceed = await confirm({
    message: `Are you sure you want to remove alias '${name}' ("${aliases[name]}")?`,
    default: false,
  });

  if (!proceed) {
    displayMessage("Alias removal cancelled.", "info");
    return;
  }

  // Proceed with removal
  delete aliases[name];
  await writeAliasesJson(aliases);
  await syncShellAliases(); // Resync the shell script
  displayMessage(`Alias '${name}' has been removed.`, "success");
}

/**
 * Executes a stored alias command.
 * This function is mainly for demonstrating how to run the aliased command programmatically.
 * In practice, users will run aliases directly from their shell after sourcing.
 * @param {string} name The alias name to run.
 * @param {string[]} args Additional arguments to pass to the command.
 */
export async function runAlias(name: string, args: string[]): Promise<void> {
  const aliases = await readAliasesJson();
  const commandToExecute = aliases[name];

  if (!commandToExecute) {
    displayMessage(`Alias '${name}' not found.`, "error");
    return;
  }

  displayMessage(`Executing: ${commandToExecute} ${args.join(" ")}`, "info");

  try {
    await executeCommand(commandToExecute, args);
  } catch (error: any) {
    displayMessage(
      `Error executing alias '${name}': ${error.message}`,
      "error"
    );
  }
}

/**
 * Clears all stored aliases.
 * This function will remove all aliases from the configuration.
 */
export async function clearAliases(): Promise<void> {
  const proceed = await confirm({
    message: "Are you sure you want to clear all aliases?",
    default: false,
  });

  if (!proceed) {
    displayMessage("Alias clearing cancelled.", "info");
    return;
  }

  await writeAliasesJson({}); // Write an empty object to clear aliases
  await syncShellAliases(); // Resync the shell script
  displayMessage(
    "All aliases cleared successfully. Remember to run 'source ~/.your_shell_config' or 'oma sync' and then re-source your config if changes don't appear immediately.",
    "success"
  );
}
