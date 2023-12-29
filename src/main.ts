import * as schedule from 'node-schedule';
import { canRegister, getConfig, login } from './lib';
import { sendEmail } from './send-email';

schedule.scheduleJob('*/6 * * * * *', async function () {
  const config = getConfig();
  await login(config.username, config.password, async (page) => {
    console.log(`successfully logged in ${config.username}`);
    for (const course of config.courses) {
      const { subject, subjectNumber } = course;
      const admitUrl = 'https://selfservice.mun.ca/admit/';
      const courseRegistrationUrl = `https://selfservice.mun.ca/admit/bwskfcls.P_GetCrse?term_in=${config.term}&sel_subj=dummy&sel_subj=${subject}&SEL_CRSE=${subjectNumber}&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View%20Sections`;
      await page.goto(admitUrl);
      await page.goto(courseRegistrationUrl);

      console.log(`Checking ${course.subject} ${course.subjectNumber}`);

      if (await canRegister(page, course.subject, course.subjectNumber)) {
        console.log(
          `${config.username} can now register for ${course.subject} ${course.subjectNumber}`
        );
        sendEmail(
          config.email,
          course.subject,
          course.subjectNumber,
          config.resendApiKey
        );
      } else {
        console.log(
          `No changes: Cannot yet register for ${course.subject} ${course.subjectNumber}`
        );
      }
    }
  });
});
