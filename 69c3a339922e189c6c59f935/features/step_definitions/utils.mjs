import {
  Given,
  When,
  Then,
  defineStep,
} from "@dev-blinq/cucumber-js";
import { closeContext, initContext, navigate, executeBrunoRequest, verifyFileExists, TestContext as context } from "automation_model";
import path from "path";

/**
 * Verify text exsits in page
 * @param {string} text the text to verify exists in page
 * @protect
 */
export async function verifyTextExistsInPage(text) {
  await context.web.verifyTextExistInPage(text, null, this);
}
Then("Verify the text {string} can be found in the page", verifyTextExistsInPage);

/**
 * Click on an element given a description
 * @param {string} elementDescription element description
 * @protect
 */
export async function clickOnElement(elementDescription) {
  await context.web.simpleClick(elementDescription, null, null, this);
}
When("click on {string}", clickOnElement);
When("click {string}", clickOnElement);
When("Click on {string}", clickOnElement);
When("Click {string}", clickOnElement);

/**
 * Fill an element with a value
 * @param {string} elementDescription element description
 * @param {string} value value to fill the element with
 * @protect
 */
export async function fillElement(elementDescription, value) {
  await context.web.simpleClickType(elementDescription, value, null, null, this);
}
When("fill {string} with {string}", fillElement);
When("Fill {string} with {string}", fillElement);

/**
 * Verify text does not exist in page
 * @param {string} text the text to verify does not exist in page
 * @protect
 */
export async function verifyTextNotExistsInPage(text) {
  await context.web.waitForTextToDisappear(text, null, this);
}
Then("Verify the text {string} cannot be found in the page", verifyTextNotExistsInPage);

/**
 * Navigate to "<url>"
 * @param {string} url URL to navigate
 * @protect
 */
export async function navigateTo(url) {
  await context.web.goto(url, this);
}
When("Navigate to {string}", navigateTo);

/**
 * Navigate to the current page
 * @protect
 */
export async function browserNavigateBack() {
  await context.web.goBack({}, this);
}
Then("Browser navigate back", browserNavigateBack);

/**
 * Navigate forward in browser history
 * @protect
 */
export async function browserNavigateForward() {
  await context.web.goForward({}, this);
}
Then("Browser navigate forward", browserNavigateForward);

/**
 * Store browser session "<path>"
 * @param {string} filePath the file path or empty to store in the test data file
 * @protect
 */
export async function storeBrowserSession(filePath) {
  await context.web.saveStoreState(filePath, this);
}
When("Store browser session {string}", storeBrowserSession);

/**
 * Reset browser session with session file "<path>"
 * @param {string} filePath the file path or empty
 * @protect
 */
export async function resetBrowserSession(filePath) {
  await context.web.restoreSaveState(filePath, this);
}
When("Reset browser session {string}", resetBrowserSession);

/**
 * Identify the text "<textAnchor>", climb "<climb>" levels in the page, validate text "<textToVerify>" can be found in the context
 * @param {string} textAnchor the anchor text
 * @param {string} climb no of levels to climb up in the tree
 * @param {string} textToVerify the target text to verify
 * @protect
 */
export async function verifyTextRelatedToText(textAnchor, climb, textToVerify) {
  await context.web.verifyTextRelatedToText(textAnchor, climb, textToVerify, null, this);
}
Then(
  "Identify the text {string}, climb {string} levels in the page, validate text {string} can be found in the context",
  verifyTextRelatedToText
);

/**
 * execute bruno single request given the bruno project is placed in a folder called bruno under the root of the cucumber project
 * @requestName the name of the bruno request file
 * @protect
 */
export async function runBrunoRequest(requestName) {
  await executeBrunoRequest(requestName, {}, context, this);
}
When("Bruno - {string}", runBrunoRequest);
When("bruno - {string}", runBrunoRequest);

/**
 * Verify the file "<fileName>" exists
 * @param {string} fileName the downloaded file to verify
 * @protect
 */
export async function verify_the_downloaded_file_exists(fileName) {
  const downloadFolder = path.join(context.reportFolder, "downloads");
  const downloadFile = path.join(downloadFolder, fileName);
  await verifyFileExists(downloadFile, {}, context, this);
}
Then("Verify the file {string} exists", { timeout: 60000 }, verify_the_downloaded_file_exists);

/**
 *  Noop step for running only hooks
 */
When("Noop", async function () {});

/**
 * Verify the page url is "<url>"
 * @param {string} url URL to be verified against current URL
 * @protect
 */
export async function verify_page_url(url) {
  await context.web.verifyPagePath(url, {}, this);
}
Then("Verify the page url is {string}", verify_page_url);

/**
 * Verify the page title is "<title>"
 * @param {string} title Title to be verified against current Title
 * @protect
 */
export async function verify_page_title(title) {
  await context.web.verifyPageTitle(title, {}, this);
}
Then("Verify the page title is {string}", verify_page_title);

/**
 * Explicit wait/sleep function that pauses execution for a specified duration
 * @param {duration} - Duration to sleep in milliseconds (default: 1000ms)
 * @param {options} - Optional configuration object
 * @param {world} - Optional world context
 * @returns Promise that resolves after the specified duration
 */
export async function sleep(duration) {
  await context.web.sleep(duration, {}, this);
}
Then("Sleep for {string} ms", { timeout: -1 }, sleep);
