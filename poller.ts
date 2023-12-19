import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import { ISemester, getCoursesFromSemester } from 'yamun';
import { ICourseRegistration } from './course-registration';
dotenv.config();

async function getCourses() {
  const semester: ISemester = {
    year: 2023,
    term: 2,
    level: 1,
  };

  const courses = await getCoursesFromSemester(semester);
  for (const course of courses!) {
    console.log(course);
  }
}

async function poll() {
  const term = '202302';
  const subject = 'COMP';
  const subjectNumber = '4304';

  const url = `https://selfservice.mun.ca/admit/bwskfcls.P_GetCrse?term_in=${term}&sel_subj=dummy&sel_subj=${subject}&SEL_CRSE=${subjectNumber}&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View Sections`;

  axios
    .get(url, {
      headers: {
        Cookie: process.env.COOKIE,
      },
      withCredentials: true,
    })
    .then((response) => {
      const html = response.data;

      let $ = cheerio.load(html);

      let data = [] as ICourseRegistration[];

      $('tr').each(function (i, elem) {
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

      const cleanData = data.filter(
        (datum) => datum.subj === subject && datum.crse === subjectNumber
      );

      console.log(cleanData);
    })
    .catch((error) => {
      console.error(error);
    });
}

poll();
