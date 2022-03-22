const puppeteer = require("puppeteer");
const pdf = require("pdfkit");
const fs = require("fs");
const path = require("path");

let ctab;
const playListLink =
  "https://www.youtube.com/playlist?list=PLRBp0Fe2GpgnIh0AiYKh7o7HnYAej-5ph";
// const playListLink =
//   "https://www.youtube.com/playlist?list=PL-Jc9J83PIiEeD3I4VXETPDmzJ3Z1rWb4";

(async function () {
  try {
    const browserObj = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });

    const tabs = await browserObj.pages();
    ctab = tabs[0];

    await ctab.goto(playListLink);
    await ctab.waitForSelector("h1#title a");

    const name = await ctab.evaluate(function (selector) {
      return document.querySelector(selector).innerHTML;
    }, "h1#title a");

    const details = await ctab.evaluate(
      getData,
      "#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer"
    );

    let totalVideos = parseInt(details[0].split(" ")[0].split(",").join(""));
    let currentVideos = parseInt(await getCVideosLength());

    while (totalVideos - currentVideos >= 20) {
      await scrollToBottom();
      currentVideos = await getCVideosLength();
    }

    const finalList = await getStats();

    let pdfObj = new pdf();
    console.log(finalList.length);
    pdfObj.pipe(fs.createWriteStream("data.pdf"));
    pdfObj.text(JSON.stringify(finalList));
    pdfObj.end();
  } catch (error) {
    console.log(error);
  }
})();

function getData(selector) {
  allElements = document.querySelectorAll(selector);

  const numberOfVideos = allElements[0].innerText;
  const numberOfViews = allElements[1].innerText;

  return [numberOfVideos, numberOfViews];
}

async function getCVideosLength() {
  try {
    return await ctab.evaluate(function (selector) {
      return document.querySelectorAll(selector).length;
    }, "div#content.style-scope ytd-playlist-video-renderer");
  } catch (error) {
    console.log(error);
  }
}

async function scrollToBottom() {
  try {
    await ctab.evaluate(function () {
      window.scrollBy(0, window.innerHeight);
    });
  } catch (error) {
    console.log(error);
  }
}

async function getStats() {
  let list = await ctab.evaluate(
    getList,
    "div#content.style-scope ytd-playlist-video-renderer #text.style-scope.ytd-thumbnail-overlay-time-status-renderer",
    "div#content.style-scope ytd-playlist-video-renderer #video-title"
  );

  return list;
}

function getList(durationSelector, titleSelector) {
  const durationArr = document.querySelectorAll(durationSelector);
  const titleArr = document.querySelectorAll(titleSelector);

  let list = [];

  for (let i = 0; i < durationArr.length; i++) {
    const duration = durationArr[i].innerText;
    const title = titleArr[i].innerText;
    list.push({ duration, title });
  }

  return list;
}
