const express = require("express");
const dotenv = require("dotenv");
const { Client } = require("@notionhq/client");
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const notionTrigger = new Client({ auth: process.env.NOTION_API_KEY_TRIGGER });
const databaseId = process.env.NOTION_DATABASE_ID;
const notionNewBlock = new Client({ auth: process.env.NOTION_API_KEY_BLOCK });
const pageId = process.env.NOTION_PAGE_ID;

//the father one!
let anaHrItems = [];

app.get("/", (req, res) => {
  setInitialTaskPageIdToStatusMap().then(() => {
    setInterval(findNewAnaHrPage, 5000);
  });
  res.send("Express on Vercel");
});

/**
 * Initialize local data store.
 * Then poll for changes every 1 seconds (1000 milliseconds).
 */
// setInitialTaskPageIdToStatusMap().then(() => {
//   setInterval(findNewAnaHrPage, 5000);
// });

async function setInitialTaskPageIdToStatusMap() {
  anaHrItems = await getAnaHrPagesNamesFromNotionDatabase();
}

async function getAnaHrPagesNamesFromNotionDatabase() {
  try {
    const response = await notionTrigger.search({
      query: "-  Linux system -",
      filter: {
        value: "page",
        property: "object",
      },
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    });
    const results = response.results;

    var reduced = results.reduce(function (filtered, result) {
      if (
        result.properties["Status"].select &&
        result.properties["Status"].select.name == "Today" &&
        result.properties["Parent item"].relation[0] &&
        result.properties["Parent item"].relation[0].id ==
          "5fa9a182-f29b-4c6d-b05e-24c99c447514"
      ) {
        var filteredNewValue = {
          title: result.properties["Name"].title[0].text.content,
          id: result.id,
        };
        filtered.push(filteredNewValue);
      }
      return filtered;
    }, []);
    console.log("-------REDUCED-------");
    console.log(reduced);

    return reduced;
  } catch (error) {
    console.error(error.body);
  }
}

async function findNewAnaHrPage() {
  const names = await getAnaHrPagesNamesFromNotionDatabase();
  if (!names) {
    anaHrItems = names;
    return;
  }
  console.log(names.length);
  console.log(anaHrItems.length);
  console.log("=======");
  if (names.length > anaHrItems.length) {
    console.log("UPDATED.");
    console.log("----------");

    let newNames = names
      .filter((x) => !anaHrItems.includes(x))
      .concat(anaHrItems.filter((x) => !names.includes(x)));
    console.log("-------NEW ITEMS-------");
    console.log(newNames);

    const newName = newNames[0].title.concat(" - anaHr");
    const pageId = newNames[0].id;
    const response = await addHeading(newName);

    const blockURL = createNewURL(response);
    // console.log(blockURL);
    const res = await updatePageTitleLink(pageId, newName, blockURL);
    console.log(res);
  }

  anaHrItems = names;
}

async function addHeading(name) {
  try {
    const response = await notionNewBlock.blocks.children.append({
      block_id: pageId,
      children: [
        {
          heading_2: {
            rich_text: [
              {
                text: {
                  content: name,
                },
              },
            ],
          },
        },
      ],
    });
    return response;
  } catch (error) {
    console.error(error.body);
  }
}

function createNewURL(response) {
  let id = response.results[0].id;
  id = id.replace(/-/g, "");

  return `https://www.notion.so/abdallahgaber/Linux-System-Void-AnaHr-${pageId}?pvs=4#${id}`;
}

async function updatePageTitleLink(pageID, name, blockURL) {
  try {
    const response = await notionTrigger.pages.update({
      page_id: pageID,
      properties: {
        Name: {
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: name,
                link: {
                  url: blockURL,
                },
              },
            },
          ],
        },
      },
    });
    return response;
  } catch (error) {
    console.error(error.body);
  }
}

app.listen(port, () => {
  console.log("Running on port 3000.");
});
