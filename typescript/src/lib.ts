import { readFileSync } from 'fs';
import puppeteer, { Page } from 'puppeteer';
import * as YAML from 'yaml';
import { ICourseRegistration } from './ICourseRegistration';

type Config = {
  username: string;
  password: string;
  courses: Course[];
  term: string;
  email: string;
  resendApiKey: string;
};

type Course = {
  crn: string;
  subject: string;
  subjectNumber: string;
};

async function scrapeTableData(
  page: Page,
  subject: string,
  subject_number: string
): Promise<ICourseRegistration[]> {
  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    return rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      function parseToInt(item: string | null) {
        return parseInt(item as string);
      }
      return {
        crn: cells[1]?.textContent,
        subj: cells[2]?.textContent,
        crse: cells[3]?.textContent,
        sec: cells[4]?.textContent,
        cmp: cells[5]?.textContent,
        cred: cells[6]?.textContent,
        title: cells[7]?.textContent,
        days: cells[8]?.textContent,
        time: cells[9]?.textContent,
        instMeth: cells[10]?.textContent,
        cap: parseToInt(cells[11]?.textContent),
        act: parseToInt(cells[12]?.textContent),
        rem: parseToInt(cells[13]?.textContent),
        wlCap: parseToInt(cells[14]?.textContent),
        wlAct: parseToInt(cells[15]?.textContent),
        wlRem: parseToInt(cells[16]?.textContent),
        xlCap: parseToInt(cells[17]?.textContent),
        xlAct: parseToInt(cells[18]?.textContent),
        xlRem: parseToInt(cells[19]?.textContent),
        instructor: cells[20]?.textContent,
        date: cells[21]?.textContent,
        location: cells[22]?.textContent,
      };
    });
  });
  return data.filter(
    (d) => d.subj == subject && d.crse == subject_number
  ) as ICourseRegistration[];
}

async function login(
  username: string,
  password: string,
  callback: (page: Page) => void
): Promise<Page> {
  const selfServiceLogin = `https://login.mun.ca/cas/login?service=https%3A%2F%2Fselfservice.mun.ca%2Fadmit%2F`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(selfServiceLogin);
  await page.type('#username', username);
  await page.type('#password', password);
  await page.click('.btn.btn-login.btn-block');
  await page.waitForNavigation();
  await callback(page);
  await page.close();
  return page;
}

async function canRegister(
  page: Page,
  subject: string,
  subject_number: string
) {
  const courses = await scrapeTableData(page, subject, subject_number);
  for (const course of courses) {
    const canRegister = course.cap - course.act > 0;
    if (canRegister) {
      return true;
    }
  }
  return false;
}

function getConfig(): Config {
  const file = readFileSync('./config.yml', 'utf8');
  const config: Config = YAML.parse(file);
  return config;
}

export { canRegister, getConfig, login };


