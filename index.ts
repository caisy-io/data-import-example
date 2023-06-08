import csvtojson from "csvtojson";
import { initSdk } from "@caisy/sdk";
import { parseHTMLToJSON } from "@caisy/rich-text-html-parser";

const token = process.env.CAISY_PRIVATE_ACCES_TOKEN;
const projectId = process.env.CAISY_PROJECT_ID;
const blueprintName = "BlogPost";

(async () => {
    if (!token) {
        console.error("CAISY_PRIVATE_ACCES_TOKEN env variable is missing");
        process.exit(1);
    }
    if (!projectId) {
        console.error("CAISY_PROJECT_ID env variable is missing");
        process.exit(1);
    }
    // our relavant input header fields are title and content
    const importData = (await csvtojson().fromFile("./posts.csv"))
    const importDataParsed = importData.map((item) => {
        return {
            title: item.Title,
            text: parseHTMLToJSON(item.Content)
        }
    });

    console.log(` importDataParsed`, JSON.stringify(importDataParsed, null, 2));
    const sdk = initSdk({token});
    const blueprintResponse = await sdk.GetBlueprintByName({input: {blueprintName, projectId}})
    const blueprint = blueprintResponse?.GetBlueprintByName?.blueprint
    if (!blueprint) {
        console.error("Blueprint not found, please create a blueprint with name BlogPost and the fields title and text first");
        process.exit(1);
    }
    const fields = blueprint.groups?.[0]?.fields?.filter((field) => field?.name === "title" || field?.name === "text");
    if (!fields || fields.length !== 2) {
        console.error("Blueprint does not have the expected fields, please create a blueprint with name BlogPost and the fields title and text first");
        process.exit(1);
    }

})();