import * as RegPo from './lib';

async function poll() {
  const term = '202302';
  const subject = 'CLAS';
  const subjectNumber = '2902';
  const url = `https://selfservice.mun.ca/admit/bwskfcls.P_GetCrse?term_in=${term}&sel_subj=dummy&sel_subj=${subject}&SEL_CRSE=${subjectNumber}&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View Sections`;

  try {
    const cookie = process.env.COOKIE;
    if (!cookie || cookie === undefined) {
      throw new Error('Invalid cookie');
    }
    const html = await RegPo.fetchData(url, cookie);
    const courseClasses = RegPo.parseData(html, subject, subjectNumber);
    console.log(courseClasses);
    for (const courseClass of courseClasses) {
      await RegPo.handleRegistration(
        courseClass,
        'samuelayomideadeoye@gmail.com',
        subject,
        subjectNumber
      );
    }
  } catch (error) {
    console.error(error);
  }
}

poll();
