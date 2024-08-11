import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});


async function splitFileByDelimiter(fileName) {
    try {
        // Read the content of the file
        const content = fs.readFileSync(fileName, 'utf8');

        // Split the content by the delimiter '----'
        const sections = content.split('----').map(section => section.trim());

        return sections;
    } catch (error) {
        console.error('Error reading the file:', error);
        throw error;
    }
}


async function main(filePath) {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File at path "${filePath}" does not exist.`);
        return;
    }

    // Check if the file is a PDF
    const fileExtension = path.extname(filePath).toLowerCase();
    if (fileExtension !== '.txt') {
        console.error(`Error: The file at path "${filePath}" is not a txt file.`);
        return;
    }

    try {
        var sections = await splitFileByDelimiter(filePath);

        var questionPrompt = '';
        if (questionType === 'short') {
            questionPrompt = ' It should be possible to answer these questions with 2-3 sentences or around 60 words in length';
        } else if (questionType === 'long') {
            questionPrompt = ' Answer to these questions should be 4-5 sentences or around 100 words in length.';
        }

        var assistantPrompt = 'You are an experienced teacher at an esteemed school.' +
            ' Your daily job involves creating and evaluating tests for children and pre-teens.';

        var outJson = [];
        let allQuestions = '';
        let allQna = '';
        let allCnt = 1;
        for (var i = 0; i < sections.length; i++) {
            var sectionTxt = sections[i];

            var userPrompt = ' Your job is to read the paragraph of text that is provided below and' +
                ' come up with ' + numQuestions + ' questions and answers about this paragraph. ' + questionPrompt +
                ' Use simple language for answers but dont change important keywords in the answer ' +
                " Return these records as a JSON Object with the structure [{ 'question' : 'string', 'answer': 'string' }] " +
                " Do not return any non-json text or numbering. Here is the text: '''" + sectionTxt + "'''";

            const params = {
                messages: [
                    {
                        role: 'system',
                        content: assistantPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                model: 'gpt-4o-mini',
                stream: true
            };

            const stream = await openai.beta.chat.completions.stream(params);
            var response = '';

            for await (const chunk of stream) {
                response += chunk.choices[0]?.delta?.content || "";
            }

            var thisJson = {
                sectionTxt,
                qa: JSON.parse(response)
            };
            outJson.push(thisJson);
            console.log(thisJson);
        }

        fs.writeFileSync(filePath + '.' + questionType + ".json", JSON.stringify(outJson), 'utf-8');

        for (var i = 0; i < outJson.length; i++) {
            var eachJSON = outJson[i];
            console.log(eachJSON);

            for (var j = 0; j < eachJSON.qa.length; j++) {
                let question = allCnt + '. ' + eachJSON.qa[j].question + '\n';
                allQuestions += question + '\n';
                allQna += question + 'A. ' + eachJSON.qa[j].answer + '\n\n';
                allCnt++;
            }
        }

        fs.writeFileSync(filePath + '.' + questionType + ".qna.txt", allQna, 'utf-8');
        fs.writeFileSync(filePath + '.' + questionType + ".questions.txt", allQuestions, 'utf-8');
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

function extractLines(regex, text) {
    // Split the text into lines, filter out lines that match the regex, and then join the lines back together
    return text
        .split('\n') // Split text by new lines
        .filter(line => regex.test(line)) // Keep lines that do not match the regex
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
let numQuestions = 3;
if (process.argv[3]) {
    numQuestions = parseInt(process.argv[3]);
}

let questionType = 'short'; // long, truefalse, fillinblanks
if (process.argv[4]) {
    questionType = process.argv[4];
    if (questionType !== 'short' &&
        questionType !== 'long' &&
        questionType !== 'truefalse'
    ) {
        questionType = 'short';
        console.log('Invalid question type. Using "short" as default. Options are "short, long, truefalse, fillinblanks');
    }
}

if (!filePath) {
    console.error('Error: Please provide a file path as a command-line argument.');
} else {
    main(filePath);
}
