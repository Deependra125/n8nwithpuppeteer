/**
 * Scrapes and extracts structural lead profile details from the Trane Partner Portal page.
 * This function executes directly inside the browser's DOM context.
 */
export function extractDashboardDetails() {
    try {
        const pageText = document.body.innerText || "";
        const currentUrl = window.location.href;

        // Extract the unique Lead ID directly from the browser's current active address path
        let leadId = "Not Found";
        const idMatch = currentUrl.match(/\/lead\/([^/]+)/);
        if (idMatch && idMatch[1]) {
            leadId = idMatch[1];
        }

        // Initialize our target payload dataset structure
        const data = {
            "Lead Id": leadId,
            "Lead Link": currentUrl,
            "Job description": "Not Found",
            "Full name": "Not Found",
            "First name": "Not Found",
            "Last name": "Not Found",
            "email": "Not Found",
            "phone": "Not Found",
            "address": "Not Found",
            "city": "Not Found",
            "state": "Not Found",
            "zipcode": "Not Found"
        };

        // 1. IMPROVED: Parse Job Description using line parsing logic
        const textLinesArray = pageText.split('\n').map(line => line.trim());
        
        // Find the line that actually contains the HVAC lead link details
        const targetDescLine = textLinesArray.find(line => line.startsWith("hvac.com Lead"));
        
        if (targetDescLine) {
            data["Job description"] = targetDescLine;
        } else {
            // Fallback: Find "Job Description" label and grab the next non-empty line below it
            const labelIndex = textLinesArray.findIndex(line => line.toLowerCase() === "job description");
            if (labelIndex !== -1 && labelIndex < textLinesArray.length - 1) {
                data["Job description"] = textLinesArray[labelIndex + 1];
            }
        }

        // 2. Parse Full Name and separate into First/Last name components
        const nameMatch = pageText.match(/Name:\s*([^\n]+)/i);
        if (nameMatch && nameMatch[1]) {
            const fullName = nameMatch[1].trim();
            data["Full name"] = fullName;
            
            const nameParts = fullName.split(/\s+/);
            if (nameParts.length > 0) data["First name"] = nameParts[0];
            if (nameParts.length > 1) data["Last name"] = nameParts.slice(1).join(" ");
        }

        // 3. Parse Email Address via matching pattern rules
        const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
            data["email"] = emailMatch[0].trim();
        }

        // 4. Parse Phone Number sequence
        const phoneMatch = pageText.match(/Phone Number:\s*([^\n]+)/i);
        if (phoneMatch && phoneMatch[1]) {
            data["phone"] = phoneMatch[1].trim();
        } else {
            const rawPhone = pageText.match(/\(\d{3}\)\s*\d{3}-\d{4}/);
            if (rawPhone) data["phone"] = rawPhone[0].trim();
        }

        // 5. Parse and break down the complete Address dataset fields
        const addressBlockIndex = pageText.indexOf("Address:");
        if (addressBlockIndex !== -1) {
            const remainingText = pageText.substring(addressBlockIndex + 8).trim();
            const textLines = remainingText.split('\n').map(l => l.trim()).filter(Boolean);
            
            if (textLines.length >= 2) {
                // First line is the local street address
                data["address"] = textLines[0];
                
                // Second line contains: City, ST Zipcode (e.g. San Antonio, TX 78253)
                const cityStateZipLine = textLines[1];
                
                // Regex rule to split components out cleanly
                const parsingRegex = /^([^,]+),\s*([A-Z]{2})\s*(\d{5})/;
                const parsedAddress = cityStateZipLine.match(parsingRegex);
                
                if (parsedAddress) {
                    data["city"] = parsedAddress[1].trim();
                    data["state"] = parsedAddress[2].trim();
                    data["zipcode"] = parsedAddress[3].trim();
                }
            }
        }

        return { success: true, data: data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
