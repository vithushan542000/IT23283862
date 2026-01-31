const { test, expect } = require("@playwright/test");

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
};

// ✅ Helper: normalize spaces (avoid extra space mismatch)
function normalizeText(str) {
  return (str || "")
    .replace(/\s+/g, " ")
    .replace(/\s([,.!?])/g, "$1")
    .trim();
}

// ✅ Helper: type word by word with space (faster + consistent)
async function typeWithSpaces(textarea, sentence) {
  const words = sentence.split(" ");
  for (const word of words) {
    if (!word.trim()) continue;
    await textarea.type(word + " ", { delay: 120 }); // ✅ reduced
  }
  await textarea.page().waitForTimeout(450); // ✅ let engine finish
}

// ✅ Helper: wait until textarea value becomes stable (prevents "நாணலைக்கு" type glitches)
async function waitForStableValue(locator, stableChecks = 2, gapMs = 250) {
  let last = "";
  let same = 0;

  for (let i = 0; i < 40; i++) {
    const v = await locator.inputValue();
    if (v === last) same++;
    else {
      last = v;
      same = 0;
    }
    if (same >= stableChecks) return v;
    await locator.page().waitForTimeout(gapMs);
  }
  return await locator.inputValue();
}

test("Tamil Transliteration - Sequential Positive Tests", async ({ page }) => {
  test.setTimeout(600000);

  await page.goto("https://tamil.changathi.com/", { waitUntil: "domcontentloaded" });

  const textarea = page.locator("#transliterateTextarea");
  await expect(textarea).toBeVisible();

  const tests = [
    {input:'avan nalaiku pokamataan',expected:'அவன் நாளைக்கு போகமாட்டான்'},
    { input: "naan nalaiku kadaiku povean", expected: "நான் நாளைக்கு கடைக்கு போவேன்" },
    { input: "naan vakuppil illai", expected: "நான் வகுப்பில் இல்லை" },
    { input: "avan nalaiku varamataan", expected: "அவன் நாளைக்கு வரமாட்டான்" },
    { input: "naan netru parthen", expected: "நான் நேற்று பார்த்தேன்" },
    { input: "naan poga thevai illai", expected: "நான் போக தேவை இல்லை" },
    {
      input: "avan kovil ponaan appuram veetuku vandhaan",
      expected: "அவன் கோவில் போனான் அப்புறம் வீட்டுக்கு வந்தான்",
    },
    {
      input: "veetil summa iruthaalum naan sutha pogala",
      expected: "வீட்டில் சும்மா இருந்தாலும் நான் சுத்த போகல",
    },
    { input: "avan enga vara ?", expected: "அவன் எங்க வர ?" },
    { input: "ingu vaa", expected: "இங்கு வா" },
    { input: "nanbargal nalaiku varanga", expected: "நண்பர்கள் நாளைக்கு வராங்க" },

  
    { input: "avarkal paadasaalai poranga", expected: "அவர்கள் பாடசாலை போறாங்க" },

    { input: "paadasaalai  irandu manikku mudiyum", expected: "பாடசாலை இரண்டு மணிக்கு முடியும்" },
    { input: "sari, road side nillu varen", expected: "சரி, ரோடு  சைடு நில்லு வரேன்" },
    { input: "romba romba sandhoshamaa aa irukku", expected: "ரொம்ப ரொம்ப சந்தோஷமா ஆ இருக்கு" },
    { input: "enasollugireergal", expected: "எனசொல்லுகிறீர்கள்" },
    { input: "avan bike start pannuran", expected: "அவன் பைக் ஸ்டார்ட் பண்ணுறன்" },
    { input: "vellam paaiuthu naan varala", expected: "வெள்ளம் பாயுது நான் வரல" },
    { input: "naan thuka poren", expected: "நான் துக்க போறேன்" },
    { input: "kamal varaan kovilukku poraan", expected: "கமல் வாரான் கோவிலுக்கு போறான்" },
    {
      input:
        "avan indha website romba neram use pannitu irukkran.idhu pala vishayathuku help aagudhu athoda vraivaga saijalpaduthu",
      expected:
        "அவன் இந்த வெப்சைட் ரொம்ப நேரம் உஸ் பண்ணிட்டு இருக்கிறான்.இது பல விஷயத்துக்கு ஹெல்ப் ஆகுது அதோட விரைவாக ஷஜல்படுத்து",
    },
    { input: "antha velai mudichutu vaa", expected: "அந்த வேலை முடிச்சுட்டு வா" },
    { input: "avan than atha senjaan", expected: "அவன் தன அத செஞ்சான்" },
    { input: "naan entaiku varanuma", expected: "நான் இண்டைக்கு வரணுமா" },

        // {input:'',expected:' '},
    // {input:' ',expected:''},
    {input:'keels, Jung man',expected:'No tamil conversion with validation message'},
    {input:'cxvcbcvncvb',expected:'No tamil conversion with validation message'},
    {input:'643568',expected:'No tamil conversion with validation message '},
    {input:'*&#@$&@()',expected:'No tamil conversion with validation message '},
    {input:'veedulaakalaila',expected:'Correct tamil sentence with proper word separation'},
    {input:'avan email potaan',expected:'tamil convention'},
    {input:'enaku thips RS 345 kidaikuma',expected:'currancy symbol and  tamil letter transalation'},
    {input:'*clear the input field',expected:'Tamil output should clearly represent a future tense sentence'},
    {input:'naan veeda pokala',expected:''}
  ];

  for (let i = 0; i < tests.length; i++) {
    const { input, expected } = tests[i];

    await textarea.fill("");
    await typeWithSpaces(textarea, input);

    //  Wait Tamil appears
    await page.waitForFunction((selector) => {
      const ta = document.querySelector(selector);
      return ta && /[\u0B80-\u0BFF]/.test(ta.value);
    }, "#transliterateTextarea");

    // Wait stable output (IMPORTANT)
    const output = await waitForStableValue(textarea, 2, 250);

    const outN = normalizeText(output);
    const expN = normalizeText(expected);

    try {
      expect(outN).toContain(expN);
      console.log(colors.green(`✅ Pos_Fun_${i + 1}: "${input}" | Output: "${output}"`));
    } catch (e) {
      console.log(
        colors.red(
          `❌ Pos_Fun_${i + 1} FAILED: "${input}" | Output: "${output}" | Expected: "${expected}"`
        )
      );
      throw e;
    }

    // clear for next case
    await textarea.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
  }
});
