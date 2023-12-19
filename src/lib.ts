import axios from 'axios';
import * as cheerio from 'cheerio';
import { ICourseRegistration, IPollResult } from './ICourseRegistration';
import { sendEmail } from './send-email';

async function fetchData(url: string, cookie: string) {
  const response = await axios.get(url, {
    headers: {
      Cookie: cookie,
    },
    withCredentials: true,
  });
  return response.data;
}

function parseData(html: string, subject: string, subjectNumber: string) {
  function parseHtml() {
    let $ = cheerio.load(html);

    let data = [] as ICourseRegistration[];

    $('tr').each(function () {
      let row = $(this);
      let rowData = {} as ICourseRegistration;

      rowData['crn'] = row.find('a').first().text();
      rowData['subj'] = row.find('td').eq(2).text();
      rowData['crse'] = row.find('td').eq(3).text();
      rowData['sec'] = row.find('td').eq(4).text();
      rowData['cmp'] = row.find('td').eq(5).text();
      rowData['cred'] = row.find('td').eq(6).text();
      rowData['title'] = row.find('td').eq(7).text();
      rowData['days'] = row.find('td').eq(8).text();
      rowData['time'] = row.find('td').eq(9).text();
      rowData['instMeth'] = row.find('td').eq(10).text();
      rowData['cap'] = parseInt(row.find('td').eq(11).text());
      rowData['act'] = parseInt(row.find('td').eq(12).text());
      rowData['rem'] = parseInt(row.find('td').eq(13).text());
      rowData['wlCap'] = parseInt(row.find('td').eq(14).text());
      rowData['wlAct'] = parseInt(row.find('td').eq(15).text());
      rowData['wlRem'] = parseInt(row.find('td').eq(16).text());
      rowData['xlCap'] = parseInt(row.find('td').eq(17).text());
      rowData['xlAct'] = parseInt(row.find('td').eq(18).text());
      rowData['xlRem'] = parseInt(row.find('td').eq(19).text());
      rowData['instructor'] = row.find('td').eq(20).text();
      rowData['date'] = row.find('td').eq(21).text();
      rowData['location'] = row.find('td').eq(22).text();

      data.push(rowData);
    });
    return data;
  }

  function processCourses(data: ICourseRegistration[]) {
    const availableCourses = data
      .filter((datum) => datum.subj === subject && datum.crse === subjectNumber)
      .map((datum) => {
        const numberOfSeatsLeft = datum.cap - datum.act;
        const canRegister =
          numberOfSeatsLeft > 0 && datum.title !== 'Laboratory';
        return {
          crn: datum.crn,
          subj: datum.subj,
          crse: datum.crse,
          canRegister,
        };
      });

    return availableCourses;
  }
  const data = parseHtml();
  return processCourses(data) as IPollResult[];
}

async function handleRegistration(
  pollResult: IPollResult,
  email: string,
  subject: string,
  subjectNumber: string
) {
  if (pollResult.canRegister) {
    const emailId = await sendEmail(email, subject, subjectNumber);
    if (emailId) {
      console.log(`Email has been sent to ${email}`);
    }
    return;
  }
}

export { fetchData, handleRegistration, parseData };
