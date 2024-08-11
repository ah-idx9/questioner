# questioner
A nodejs project to generate short and long questions and answers from PDF files.

This project is split into two parts:
1. Extraction: This part takes in a PDF file as input and divides the PDF file into sections. This is done mostly in a hard coded manner right now (see extract.js). TODO: Allow section division regex to be configurable.
2. Generating questions: This part takes input from a text file generated from part 1. This text file is split into sections delimited by '----' in a single line. 

The reason to do this in 2 parts is so that sections can be reviewed and removed completely if they dont make sense. e.g. the Introduction paragraph of a set of images etc. 

So the workflow is as follows:


Step 1. Checkout the repository.
Step 2. Run `npm install`
Step 3. Run the extract command as follows:  `npm run extract -- <path to pdf file>`
Step 4. The previous step (if successful) will create a file called `<filename provided>.sections.txt`
Step 5. Review this sections text file and remove any unnecessary sections. Make sure each section is delimited by a single line containing `----` characters.
Step 6. Once the sections text file is successfully updated, run the generate questions step as follows: `npm run genq -- <path to sections.txt> <number of questions per section> <short/long>`

The final output will be in a file called `<filename provided>.sections.txt.qna.txt`
Output is also available in JSON and just questions in appropriately named files.





