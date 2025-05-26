// This Playwright accessibility test spec was generated based on the following BDD scenario:
/*
Scenario: Check address availability and test page accessibility
  Given I am on the AlloFiber "Get Allo" Step 1 page
  Then I should capture a DOM snapshot of the initial page view
  And I should check the page for accessibility violations
  When I enter "346 Roberts St" into the address input field
  And I click the address input field to trigger the dropdown
  And I select the first option from the address dropdown
  Then I should capture a DOM snapshot after address selection
  And I should check the page for accessibility violations after address selection
  When I click the "Check Address" button
  Then I should be on the next page
  And I should capture a DOM snapshot of the result view page
  And I should check the page for accessibility violations on the result view page
*/
// It utilizes Playwright's MPC (presumably the underlying mechanism used) and was created with the help of Cursor.

import { test, expect } from '@playwright/test';
// Install the accessibility testing library: npm install --save-dev @axe-core/playwright
import AxeBuilder from '@axe-core/playwright';

test('Accessibility test with DOM snapshots and axe-core', async ({ page }) => {
  // Given I am on the AlloFiber "Get Allo" Step 1 page
  await page.goto('https://customer.allofiber.com/get-allo/step1');

  // Capture initial DOM snapshot
  const initialDOM = await page.content();
  console.log('--- Initial DOM Snapshot ---');
  console.log(initialDOM.substring(0, 5000) + '...'); // Print first 5000 characters to avoid excessive output
  console.log('--------------------------');

  // Check page for accessibility violations
  console.log('--- Checking initial page for accessibility violations ---');
  const initialAccessibilityScanResults = await new AxeBuilder({ page }).analyze();
  console.log('--- Initial page accessibility violations ---');
  console.log(initialAccessibilityScanResults.violations);
  console.log('--- Initial page accessibility check complete ---');

  // When I enter "346 Roberts St" into the address input field
  await page.fill('#autocomplete-address1', '346 Roberts St');

  // And I click the address input field to trigger the dropdown
  await page.click('#autocomplete-address1');

  // And I wait for the dropdown to appear (optional, often happens automatically after click/fill)
  // await page.waitForSelector('#autocomplete-address1-option-0'); // Example wait if needed

  // And I select the first option from the address dropdown
  await page.click('#autocomplete-address1-option-0');

  // Capture DOM snapshot after address selection
  const afterAddressSelectionDOM = await page.content();
  console.log('--- DOM Snapshot After Address Selection ---');
  console.log(afterAddressSelectionDOM.substring(0, 5000) + '...'); // Print first 5000 characters
  console.log('--------------------------------------------');

  // Check page for accessibility violations after address selection
  console.log('--- Checking page for accessibility violations after address selection ---');
  const afterSelectionAccessibilityScanResults = await new AxeBuilder({ page }).analyze();
  console.log('--- Accessibility violations after address selection ---');
  console.log(afterSelectionAccessibilityScanResults.violations);
  console.log('--- Accessibility check after address selection complete ---');

  // And I click the "Check Address" button
  // Need to ensure the popup is closed if it appeared before clicking Check Address
  // Based on previous steps, I clicked #mui-10 > div > div:nth-child(2) > button to close a popup.
  // We should add a check or attempt to click this button before clicking the Check Address button.
  const popupCloseButtonSelector = '#mui-10 > div > div:nth-child(2) > button';
  const popupCloseButton = await page.$(popupCloseButtonSelector);
  if (popupCloseButton) {
    await popupCloseButton.click();
    console.log('Closed popup before clicking Check Address.');
  } else {
    console.log('No popup found to close before clicking Check Address.');
  }

  await page.click('#root > div:nth-child(1) > main > div:nth-child(2) > div > div > div > div > div.css-k2fugm > form > div > button');

  // Then I should be on the next page
  // We can add an assertion here to confirm navigation or wait for a specific element on the next page
  await page.waitForLoadState('domcontentloaded'); // Wait for network to be idle after navigation

  // Capture DOM snapshot of the next page (result view)
  const resultViewDOM = await page.content();
  console.log('--- DOM Snapshot of Result View Page ---');
  console.log(resultViewDOM.substring(0, 5000) + '...'); // Print first 5000 characters
  console.log('--------------------------------------');

  // Check page for accessibility violations on the result view page
  console.log('--- Checking result view page for accessibility violations ---');
  const resultViewAccessibilityScanResults = await new AxeBuilder({ page }).analyze();
  console.log('--- Result view page accessibility violations ---');
  console.log(resultViewAccessibilityScanResults.violations);
  console.log('--- Result view page accessibility check complete ---');

  // Add further accessibility checks here using the captured DOM snapshots if needed
}); 