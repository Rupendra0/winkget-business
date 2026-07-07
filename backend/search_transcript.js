const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function run() {
  const logDir = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\ed7c96b6-30ea-4e3d-a61a-193c4066218f\\.system_generated\\logs';
  const transcriptPath = path.join(logDir, 'transcript_full.jsonl');

  if (!fs.existsSync(transcriptPath)) {
    console.error("Transcript file not found at:", transcriptPath);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      if (step.type === 'USER_INPUT' && step.content && step.content.includes('69da7bbe4f6cf9c8f1f0b384') && step.content.length > 1000) {
        console.log("Found step length:", step.content.length);
        // Print the first 500 characters
        console.log("Start of content:", step.content.substring(0, 500));
        // Print the end of content
        console.log("End of content:", step.content.substring(step.content.length - 500));
        
        // Search if "detailedDescription" or "detailedDescriptionBlocks" is present anywhere in the content
        console.log("Contains 'detailedDescriptionBlocks':", step.content.includes('detailedDescriptionBlocks'));
        console.log("Contains 'detailedDescription':", step.content.includes('detailedDescription'));
        console.log("Contains 'detailed_description':", step.content.includes('detailed_description'));
        console.log("Contains 'description':", step.content.includes('description'));
      }
    } catch (err) {}
  }
}

run().catch(console.error);
