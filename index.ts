import csvtojson from "csvtojson";
import dotenv from "dotenv";
import {
  BlueprintField,
  DocumentFieldInput,
  DocumentWithFieldsInput,
  IUploadResult,
  initSdk,
  uploadFile,
} from "@caisy/sdk";
import { parseHTMLToJSON } from "@caisy/rich-text-html-parser";
import https from "https";
import path from "path";

// Load environment variables
dotenv.config();

const token = process.env.CAISY_PRIVATE_ACCES_TOKEN!;
const projectId = process.env.CAISY_PROJECT_ID!;
const blueprintName = "BlogPost";
const fieldNamesToImport = ["title", "text", "thumbnail"];

// Checks if token and projectId are present
function validateEnvVariables() {
  if (!token) {
    console.error("CAISY_PRIVATE_ACCES_TOKEN env variable is missing");
    process.exit(1);
  }
  if (!projectId) {
    console.error("CAISY_PROJECT_ID env variable is missing");
    process.exit(1);
  }
}

// Read and parse the csv data
async function readAndParseData() {
  const importData = await csvtojson().fromFile("./posts.csv");
  return importData.map((item) => ({
    ...item,
    text: item.text && parseHTMLToJSON(item.text),
  }));
}

// Get blueprint details
async function getBlueprintDetails(sdk: ReturnType<typeof initSdk>) {
  const blueprintResponse = await sdk.GetBlueprintByName({
    input: { blueprintName, projectId },
  });
  return blueprintResponse?.GetBlueprintByName?.blueprint;
}

// Validate if blueprint and fields are available in caisy
function validateBlueprintAndFields(blueprint?: Awaited<ReturnType<typeof getBlueprintDetails>>) {
  if (!blueprint) {
    throw(
      "Blueprint not found, please create a blueprint with name BlogPost and the fields title and text first"
    );
  }

  const fields = blueprint.groups?.[0]?.fields?.filter(
    (field) => field?.name && fieldNamesToImport.includes(field.name)
  );

  if (!fields || fields.length !== fieldNamesToImport.length) {
    throw(
      "Blueprint does not have the expected fields, please create a blueprint with name BlogPost and the fields title and text first"
    );
  }

  return fields as BlueprintField[];
}

(async () => {
  validateEnvVariables();
  const importDataParsed = await readAndParseData();

  const sdk = initSdk({ token });
  const blueprint = await getBlueprintDetails(sdk);
  const fields = validateBlueprintAndFields(blueprint);

  // Map importDataParsed to upload thumbnails and generate the documentsWithThumbnails list
  const documentsWithThumbnails = await Promise.all(
    importDataParsed.map(async (rowData) => {
      // If thumbnail does not exist, return the row data as is
      if (!rowData.thumbnail) {
        return rowData;
      }

      // Download the image, upload it to caisy and receive an id
      const uploadedImage = await downloadImageAndUploadToCaisy({
        thumbnail: rowData.thumbnail,
        token,
        projectId,
      });

      // If image upload failed, set thumbnail as null and return the row data
      if (!uploadedImage) {
        rowData.thumbnail = null;
        return rowData;
      }

      // If image upload was successful, replace thumbnail with the document id
      return {
        ...rowData,
        thumbnail: [uploadedImage.documentId],
      };
    })
  );

  // Generate input for PutManyDocuments method
  const documentsInput = {
    input: {
      projectId,
      documentInputs: documentsWithThumbnails.map((rowData) => {
        return {
          documentId: rowData.id,
          title: rowData.title,
          statusId: 2,
          blueprintId: blueprint?.blueprintId,
          fields: Object.keys(rowData)
            .map((key) => {
              const value = rowData[key];
              const matchingField = fields.find((field) => field?.name === key);

              return {
                blueprintFieldId: matchingField?.blueprintFieldId,
                data: value,
              } as DocumentFieldInput;
            })
            .filter((field) => !!field?.blueprintFieldId),
        } as DocumentWithFieldsInput;
      }),
    },
  };

  // Call the sdk.PutManyDocuments method and get the result
  const upsertResult = await sdk.PutManyDocuments(documentsInput);

  upsertResult?.PutManyDocuments?.successfulDocumentIds?.length &&
    console.info(
      `successfully imported ${upsertResult.PutManyDocuments.successfulDocumentIds.length} documents`
    );

  if (upsertResult?.PutManyDocuments?.errors?.length) {
    console.error(
      `Some errors occoured during the import: `,
      upsertResult.PutManyDocuments.errors
    );
  }
})();

function downloadImageAndUploadToCaisy({
  thumbnail,
  token,
  projectId,
}: {
  thumbnail: string;
  token: string;
  projectId: string;
}): Promise<IUploadResult | null> | null {
  if (!thumbnail) {
    return null;
  }

  // read the filename from the url in to the meta data
  let meta: any = {};
  try {
    const url = new URL(thumbnail);
    const pathname = url.pathname;
    meta.filename = path.basename(pathname);
  } catch (err) {
    console.error(` err parse image url`, err);
    return null;
  }

  return new Promise((resolve) => {
    try {
      https.get(thumbnail, (res) => {
        const data: any[] = [];

        res.on("data", (chunk) => data.push(chunk));

        res
          .on("end", () => {
            uploadFile({
              file: Buffer.concat(data),
              meta,
              projectId,
              token,
            }).then((res) => {
              resolve(res);
            });
          })
          .on("error", (err) => {
            throw err;
          });
      });
    } catch (err) {
      console.log(`downloading ${thumbnail} failed: `, err);
      resolve(null);
    }
  });
}
