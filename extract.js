import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * The main function to process a PDF file and extract specific information based on a given regular expression.
 *
 * @param {string} filePath - The path to the PDF file to be processed.
 * @returns {Promise<void>} - A promise that resolves when the processing is complete.
 */
async function main(filePath) {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File at path "${filePath}" does not exist.`);
        return;
    }

    // Check if the file is a PDF
    const fileExtension = path.extname(filePath).toLowerCase();
    if (fileExtension !== '.pdf') {
        console.error(`Error: The file at path "${filePath}" is not a PDF file.`);
        return;
    }

    try {
        // Extract text from the PDF file
        var text = await extractTextFromPDF(filePath);
        const removeLinesR = /^.+?\s*::\s*\d+$/gm;
        text = removeLines(removeLinesR, text);
        const removeLinesR2 = /^\d+\s*::\s*.+$/gm;
        text = removeLines(removeLinesR2, text);

        // Split by section headings
        const sectionSplitR = /^\d+(\.\d+)+/gm;
        var sections = splitTextByRegex(sectionSplitR, text);
        console.log('Sections Found : ', sections.length);

        var sectionsTxt = "";
        for (let i = 0; i < sections.length; i++) {
            sectionsTxt += sections[i];
            sectionsTxt += "\n----\n";
        }

        var outfilePath = filePath + ".sections.txt";
        writeTextToFile(outfilePath, sectionsTxt);
        console.log(`Text sections saved to "${outfilePath}"`);

    } catch (error) {
        // Log any errors that occur during the extraction process
        console.error(`Error extracting text from PDF: ${error.message}`);
    }
}

function splitTextByRegex(regex, text) {
    // Split the text into lines
    const lines = text.split('\n');

    // Initialize the result array
    const result = [];
    let currentSection = '';

    // Iterate over each line
    for (const line of lines) {
        if (regex.test(line)) {
            // If the line matches the regex, push the current section to the result and reset it
            if (currentSection.trim()) {
                result.push(currentSection.trim());
            }
            currentSection = ''; // Reset the current section
        } else {
            // Append the line to the current section
            currentSection += (currentSection ? '\n' : '') + line;
        }
    }

    // Push the last section if it's not empty
    if (currentSection.trim()) {
        result.push(currentSection.trim());
    }

    return result;
}


function removeLines(regex, text) {
    // Split the text into lines, filter out lines that match the regex, and then join the lines back together
    return text
        .split('\n') // Split text by new lines
        .filter(line => !regex.test(line)) // Keep lines that do not match the regex
        .join('\n'); // Join the lines back together with new lines

}

async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdfParse(dataBuffer);
        return data.text;

    } catch (error) {
        throw new Error('Failed to extract text from the PDF');
    }
}

async function writeTextToFile(fileName, text) {
    return new Promise((resolve, reject) => {
        fs.writeFile(fileName, text, 'utf8', (err) => {
            if (err) {
                return reject(new Error(`Failed to write to file "${fileName}": ${err.message}`));
            }
            resolve();

        });

    });
}

const filePath = process.argv[2];

if (!filePath) {
    console.error('Error: Please provide a file path as a command-line argument.');

} else {
    main(filePath);
}
