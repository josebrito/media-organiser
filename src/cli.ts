#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import chalk from "chalk";
import inquirer from "inquirer";
import { MediaProcessor } from "./services/mediaProcessor";

const program = new Command();

program.name("media-organiser").description("Photo and video grouping utility").version("1.0.0");

program
  .command("extract-dates")
  .description("Extract unique creation dates from files in SOURCE_FOLDER and output as JSON")
  .argument("<source_folder>", "Source folder path")
  .action(async (sourceFolder: string) => {
    try {
      const processor = new MediaProcessor(MediaProcessor.getDefaultConfig());
      const dates = await processor.extractDates(sourceFolder);
      console.log(JSON.stringify(dates));
    } catch (error) {
      console.error(chalk.red("Error:"), error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });

program
  .command("group")
  .description("Group and move/copy files based on date→project mapping")
  .argument("<source_folder>", "Source folder path")
  .argument("<destination_folder>", "Destination folder path")
  .option("--move", "Move files instead of copying")
  .option("--no-rename", "Keep original filenames (don't add project prefix)")
  .option("--mapping <file>", "Path to JSON file mapping date (YYYYMMDD) to project name")
  .action(
    async (
      sourceFolder: string,
      destinationFolder: string,
      options: { move?: boolean; rename?: boolean; mapping?: string },
    ) => {
      try {
        let projectNames: Record<string, string> = {};

        if (options.mapping) {
          const mappingData = fs.readFileSync(options.mapping, "utf8");
          projectNames = JSON.parse(mappingData);
        } else {
          // Interactive mode - extract dates and prompt for project names
          const processor = new MediaProcessor(MediaProcessor.getDefaultConfig());
          const dates = await processor.extractDates(sourceFolder);

          console.log(chalk.blue(`\nFound ${dates.length} unique dates. Please provide project names for each:`));

          for (const dateStr of dates) {
            const date = new Date(
              parseInt(dateStr.slice(0, 4)),
              parseInt(dateStr.slice(4, 6)) - 1,
              parseInt(dateStr.slice(6, 8)),
            );

            const answers = await inquirer.prompt([
              {
                type: "input",
                name: "projectName",
                message: `Enter project name for date ${date.toISOString().split("T")[0]}:`,
                validate: (input: string) => {
                  if (!input.trim()) {
                    return "Project name cannot be empty";
                  }
                  if (input.length > 50) {
                    return "Project name too long. Maximum length is 50 characters.";
                  }
                  return true;
                },
              },
            ]);

            projectNames[dateStr] = answers.projectName;
          }
        }

        const config = MediaProcessor.getDefaultConfig();
        config.moveFiles = options.move || false;
        config.renameFiles = options.rename !== false; // Default to true unless --no-rename is specified

        const processor = new MediaProcessor(config);
        await processor.groupFiles(sourceFolder, destinationFolder, projectNames);

        console.log(chalk.green("Processing completed"));
      } catch (error) {
        console.error(chalk.red("Error:"), error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    },
  );

program.parse();
