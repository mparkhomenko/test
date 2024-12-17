import { test, expect, Page, BrowserContext, Browser, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
require('dotenv').config()

const BASE_URL = process.env.BASE_URL as string;
const SEARCH_QUERY = 'Darth Vader';
const DOWNLOAD_FOLDER = path.join(__dirname, '../downloads');

let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
    if (!fs.existsSync(DOWNLOAD_FOLDER)) {
        fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
    }

    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
    page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'load' });

    await page.click('button[aria-label="Consent"]');
    await page.locator('button[aria-label="Consent"]').isHidden();
});

test.afterAll(async () => {
    await browser.close();
});

test.describe('Image Search and Download', () => {
    test('Open the first image result and download it', async () => {
        const searchInput = page.getByRole('navigation').getByRole("textbox", { name: 'search' });
        await searchInput.fill(SEARCH_QUERY);
        await searchInput.press('Enter');

        await page.locator(`a[title="${SEARCH_QUERY}"]:nth-child(1)`).first().click({ timeout: 10000 });
        await expect(page).toHaveURL(/.*wallpapers\/[a-f0-9\-]+/);

        const freeDownloadButton = page.getByRole('button', { name: 'Download Free' })
        const paidDownloadButton = page.getByRole('button', { name: 'Buy for Ƶ' })

        await expect(freeDownloadButton.or(paidDownloadButton)).toBeVisible();

        const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
        if (await freeDownloadButton.isVisible()) {
            await freeDownloadButton.waitFor({ state: 'visible', timeout: 5000 });
            await freeDownloadButton.click();
        } else {
            await paidDownloadButton.waitFor({ state: 'visible', timeout: 5000 });
            await paidDownloadButton.click();

            // TODO: here some logic for buying
        }
        const download = await downloadPromise;

        const filePath = path.join(DOWNLOAD_FOLDER, download.suggestedFilename());
        await download.saveAs(filePath);

        expect(fs.existsSync(filePath)).toBeTruthy();
    });
});