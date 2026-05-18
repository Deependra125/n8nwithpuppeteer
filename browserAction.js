// browserAction.js
import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import { injectCredentialsAndLogin } from './loginAction.js';
import { extractDashboardDetails } from './scrapeAction.js';
import 'dotenv/config';


export async function openLinkInPuppeteer(targetUrl) {
    const user = globalThis.process?.env?.TRANE_USERNAME || '';
    const pass = globalThis.process?.env?.TRANE_PASSWORD || '';
    console.log(`🚀 Launching clean browser for: ${targetUrl}`);
    
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        defaultViewport: null,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--incognito',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const pages = await browser.pages();
        const mainPage = pages[0]; 
        await mainPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

        if (pages.length > 1) {
            for (let i = 1; i < pages.length; i++) {
                await pages[i].close().catch(() => {});
            }
        }

        console.log("Navigating to target URL...");
        await mainPage.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log("Searching for Login button...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        await mainPage.evaluate(() => {
            function findInShadow(root){
                var found = [];
                var btns = root.querySelectorAll('button, a');
                btns.forEach(function(b){ if((b.innerText||'').trim().toLowerCase()==='login') found.push(b); });
                var all = root.querySelectorAll('*');
                all.forEach(function(el){ if(el.shadowRoot){ found = found.concat(findInShadow(el.shadowRoot)); } });
                return found;
            }
            var matches = findInShadow(document);
            if(matches.length) matches[0].click();
        });

        await mainPage.waitForSelector('#signInName', { timeout: 10000 }).catch(() => {});
        console.log("Injecting credentials and submitting...");
        
        // 🔥 FIX: Added 'user' and 'pass' variables to the evaluation arguments array
        const loginStatus = await mainPage.evaluate(injectCredentialsAndLogin, user, pass);

            if (loginStatus === 'submitted') {
            console.log("🔑 Credentials submitted! Waiting for dashboard...");
            
            // Wait for initial page redirection to complete
            await mainPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
            
            console.log("⏳ Dashboard layout detected. Waiting for Salesforce record components to render...");
            
            // 🔥 FIX: Target specific Salesforce layout elements (Record Header, Detail Panel, or Flexipage)
            await mainPage.waitForSelector('.record-flexpage-layout, .slds-form, .test-id__record-layout-container', { 
                visible: true, 
                timeout: 25000 
            }).catch((err) => console.log("⚠️ Warning: Salesforce container timed out, proceeding anyway."));

            // Give JavaScript frameworks an extra moment to populate text fields
            await new Promise(resolve => setTimeout(resolve, 4000));

            console.log("🔍 Scraping target layout data elements...");
            const scrapeResult = await mainPage.evaluate(extractDashboardDetails);

            if (scrapeResult.success) {
                const finalData = scrapeResult.data;

                await fs.writeFile('./output.json', JSON.stringify(finalData, null, 2), 'utf8');
                console.log("💾 Output data written to ./output.json");

                await browser.close();
                return { success: true, data: finalData };
            } else {
                await browser.close();
                return { success: false, error: scrapeResult.error };
            }
        } else {
            await browser.close();
            return { success: false, error: "Login fields missing" };
        }


    } catch (error) {
        console.error("❌ Error running browser automation task:", error.message);
        await browser.close();
        return { success: false, error: error.message };
    }
}
