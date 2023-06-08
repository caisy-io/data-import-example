# Importing data into caisy

This example teaches how to import data into caisy. While we're utilizing a CSV as the input format, the same approach can be applied to any data format that can be converted to JSON. We'll be importing blog posts for this demonstration, but the method could be extended to any type of data. The only prerequisite for this example is proficiency in TypeScript.

## What we'll do in this example: 

- Read a sample CSV file. For simplicity, we'll use a basic CSV export, but you can use any source of data that you can somehow parse to json.
- Use the private access token and project ID from the environment to read the blueprint where we want to fill in the data.
- Log a warning if the CSV headers do not match the blueprint fields because if there's no match, no data will be written.
- For this example, we will hardcode the mapping of CSV headers to blueprint fields. If this mapping needs to be done by a non-technical user, I recommend a tool like [react-csv-importer](https://github.com/beamworks/react-csv-importer). However, the usage of such a tool will not be covered here.
- In caisy, the input for the PutManyDocuments mutation has the same structure as the results obtained from GetManyDocuments. This allows for the export and import of the same document without any modifications.
- To understand the desired structure, we can either create a sample document in caisy and retrieve it with GetManyDocuments to see the structure of your blog article document in caisy, or we can utilize the TypeScript definitions provided by the SDK.

## Packages used

- `dotenv` for loading our .env file.
- `csvtojson` for parsing the CSV input into JSON.
- `@caisy/sdk` for accessing caisy's internal API for data read and write operations.
- `@caisy/rich-text-html-parser` for parsing input HTML into a caisy rich text JSON structure with a valid schema.

To install all the required packages in your project, use `npm i @caisy/sdk @caisy/rich-text-html-parser csvtojson dotenv --save`.
