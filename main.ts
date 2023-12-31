import $ from "https://deno.land/x/dax@0.36.0/mod.ts";
import * as log from "https://deno.land/std@0.210.0/log/mod.ts";
import {
  Command,
  HelpCommand,
} from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

type Options = {
  debug?: boolean | undefined;
  folderId?: string | undefined;
  name?: string | undefined;
};

enum BitwardenItemType {
  Login = 1,
  SecureNote = 2,
  Card = 3,
  Identity = 4,
}

new Command()
  .name("Bitwarden Environment")
  .version("0.1.1")
  .description(
    "Securely sets environment variables from items in a Bitwarden folder and executes commands.",
  )
  .globalOption("-d, --debug", "Enable debug output", { default: false })
  .globalAction((option) => setUp(option))
  .default("help")
  .command("help", new HelpCommand())
  .command("run <command:string>", "Run Command")
  .option(
    "-f, --folder-id <folderId:string>",
    "Bitwarden Folder Id (Default: `BW_FOLDER_ID` environment)",
    {
      default: Deno.env.get("BW_FOLDER_ID"),
    },
  )
  .option(
    "-n, --name <name:string>",
    "Bitwarden Item Name (Item type is SecureNote only)",
    {
      default: undefined,
    },
  )
  .action(async (option, command) => await run(option, command))
  .parse(Deno.args);

const setUp = (option: Options) => {
  let logLevel: log.LevelName = "INFO";
  if (option.debug) {
    $.setPrintCommand(true);
    logLevel = "DEBUG";
  }
  log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler(logLevel, { useColors: true }),
    },
    loggers: {
      default: {
        level: logLevel,
        handlers: ["console"],
      },
    },
  });
};

const run = async (option: Options, command: string) => {
  const logger = log.getLogger();
  if (!option.folderId) {
    logger.error("Please set environment `BW_FOLDER_ID`");
    Deno.exit(1);
  }
  const items = await $`bw list items --folderid ${option.folderId}`.json();
  for (const item of items) {
    // only SecureNote
    if (item.type !== BitwardenItemType.SecureNote) {
      logger.debug(`item type is not SecureNote, item name: ${item.name}`);
      continue;
    }
    if (option.name) {
      if (item.name !== option.name) {
        logger.debug(
          `not match option name: ${option.name}, item name: ${item.name}`,
        );
        continue;
      }
    }
    logger.debug(`set env name: ${item.name}`);
    Deno.env.set(item.name, item.notes);
  }
  await $.raw`${command.split(" ")}`;
};
