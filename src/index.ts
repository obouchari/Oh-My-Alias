#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import {
  addAlias,
  clearAliases,
  initCliConfig,
  listAliases,
  removeAlias,
  runAlias,
  syncShellAliases,
} from "./alias-manager";
import { displayMessage } from "./utils";

async function main() {
  yargs(hideBin(process.argv))
    .scriptName("oma")
    .usage("Usage: $0 <command> [options]")
    .command(
      "init",
      "Initialize Oh-My-Alias CLI configuration and provide instructions for shell integration.",
      {},
      async () => {
        try {
          await initCliConfig();
          displayMessage(
            "Oh-My-Alias CLI initialized successfully! Follow the instructions to integrate it with your shell.",
            "success"
          );
        } catch (error) {
          displayMessage(
            `Failed to initialize Oh-My-Alias CLI: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error"
          );
          process.exit(1);
        }
      }
    )
    .command(
      "add <name> <command>",
      "Add a new alias",
      (yargs) => {
        yargs
          .positional("name", {
            describe: 'The name of the alias (e.g., "gcl" for git clone)',
            type: "string",
            demandOption: true,
          })
          .positional("command", {
            describe: 'The command the alias will execute (e.g., "git clone")',
            type: "string",
            demandOption: true,
          });
      },
      async (argv) => {
        try {
          await addAlias(argv.name as string, argv.command as string);
          displayMessage(
            `Alias '${argv.name}' added successfully. Remember to run 'source ~/.your_shell_config' or 'oma sync' and then re-source your config if changes don't appear immediately.`,
            "success"
          );
        } catch (error) {
          displayMessage(
            `Failed to add alias: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error"
          );
          process.exit(1);
        }
      }
    )
    .command("list", "List all current aliases", {}, async () => {
      try {
        await listAliases();
      } catch (error) {
        displayMessage(
          `Failed to list aliases: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error"
        );
        process.exit(1);
      }
    })
    .command(
      "remove <name>",
      "Remove an existing alias",
      (yargs) => {
        yargs.positional("name", {
          describe: "The name of the alias to remove",
          type: "string",
          demandOption: true,
        });
      },
      async (argv) => {
        try {
          await removeAlias(argv.name as string);
          displayMessage(
            `Alias '${argv.name}' removed successfully. Remember to run 'source ~/.your_shell_config' or 'oma sync' and then re-source your config if changes don't appear immediately.`,
            "success"
          );
        } catch (error) {
          displayMessage(
            `Failed to remove alias: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error"
          );
          process.exit(1);
        }
      }
    )
    .command("clear", "Clear all stored aliases", {}, async () => {
      try {
        await clearAliases();
      } catch (error) {
        displayMessage(
          `Failed to clear aliases: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error"
        );
        process.exit(1);
      }
    })
    .command(
      "run <name> [args...]",
      "Execute a stored alias command. This is primarily for testing; you should normally run aliases directly in your shell.",
      (yargs) => {
        yargs
          .positional("name", {
            describe: "The name of the alias to run",
            type: "string",
            demandOption: true,
          })
          .positional("args", {
            describe: "Additional arguments to pass to the aliased command",
            type: "string",
            array: true,
          });
      },
      async (argv) => {
        try {
          await runAlias(argv.name as string, (argv.args as string[]) || []);
        } catch (error) {
          displayMessage(
            `Failed to run alias: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error"
          );
          process.exit(1);
        }
      }
    )
    .command("sync", "Sync aliases with the shell script", {}, async () => {
      try {
        await syncShellAliases();
        displayMessage(
          "Shell alias script synchronized. Remember to re-source your shell config (e.g., `source ~/.bashrc`) for changes to take effect in your current terminal session.",
          "success"
        );
      } catch (error) {
        displayMessage(
          `Failed to synchronize shell aliases: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error"
        );
        process.exit(1);
      }
    })
    .demandCommand(1, "You need to specify a command.")
    .strict()
    .help()
    .alias("h", "help")
    .alias("v", "version")
    .version() // Automatically uses package.json version
    .epilogue("For more information, visit [project README URL].").argv;
}

main();
