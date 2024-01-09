import * as schedule from 'node-schedule';
import { canRegister, getConfig, login } from './lib';
import { sendEmail } from './send-email';
import puppeteer from 'puppeteer';

schedule.scheduleJob('*/6 * * * * *', function () {
  const config = getConfig();
  const selfServiceLogin = `https://login.mun.ca/cas/login?service=https%3A%2F%2Fselfservice.mun.ca%2Fadmit%2F`;

  puppeteer.launch({ headless: true })
    .then(browser => {
      return browser.newPage().then(page => {
        return page.goto(selfServiceLogin)
          .then(() => page.type('#username', config.username))
          .then(() => page.type('#password', config.password))
          .then(() => page.click('.btn.btn-login.btn-block'))
          .then(() => {
            return page.waitForNavigation().catch(error => {
              if (error instanceof puppeteer.) {
                console.error('Navigation timeout exceeded: ', error);
              }
            });
          })
          .then(() => {

            console.log(`successfully logged in ${config.username}`);
            const coursePromises = config.courses.map(course => {
              const { subject, subjectNumber } = course;
              const admitUrl = 'https://selfservice.mun.ca/admit/';
              const courseRegistrationUrl = `https://selfservice.mun.ca/admit/bwskfcls.P_GetCrse?term_in=${config.term}&sel_subj=dummy&sel_subj=${subject}&SEL_CRSE=${subjectNumber}&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View%20Sections`;

              return page.goto(admitUrl)
                .then(() => page.goto(courseRegistrationUrl))
                .then(() => {
                  console.log(`Checking ${course.subject} ${course.subjectNumber}`);
                  return canRegister(page, course.subject, course.subjectNumber);
                })
                .then(canRegister => {
                  if (canRegister) {
                    console.log(`${config.username} can now register for ${course.subject} ${course.subjectNumber}`);
                    return sendEmail(config.email, course.subject, course.subjectNumber, config.resendApiKey);
                  } else {
                    console.log(`No changes: Cannot yet register for ${course.subject} ${course.subjectNumber}`);
                  }
                });
            });

            return Promise.all(coursePromises);
          });
      });
    })
    .catch(error => {
      console.error('An error occurred:', error);
    });

    setTimeout(() => {
      console.log('I\'m done');
    }, 3000)
});