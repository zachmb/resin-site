import dotenv from "dotenv";
// Load .env into process.env
dotenv.config();

import {
  After,
  setDefaultTimeout,
  Before,
  AfterStep,
  BeforeStep,
} from "@dev-blinq/cucumber-js";
import { closeContext, initContext, navigate, executeBrunoRequest, verifyFileExists } from "automation_model";
setDefaultTimeout(60 * 1000);

const url = null;

const elements = {};

let context = null;
Before(async function (scenario) {
  context = await initContext(url, false, false, this);
  await navigate(url);
  await context.web.beforeScenario(this, scenario);
});
After(async function (scenario) {
  await context.web.afterScenario(this, scenario);
  await closeContext();
  context = null;
});

BeforeStep(async function (step) {
  if (context) {
    await context.web.beforeStep(this, step);
  }
});

AfterStep(async function ({ result, pickleStep }) {
  if (context) {
    await context.web.afterStep(this, pickleStep, result);
  }
});