interface ICourseRegistration {
  crn: string;
  subj: string;
  crse: string;
  sec: string;
  cmp: string;
  cred: string;
  title: string;
  days: string;
  time: string;
  instMeth: string;
  cap: number;
  act: number;
  rem: number;
  wlCap: number;
  wlAct: number;
  wlRem: number;
  xlCap: number;
  xlAct: number;
  xlRem: number;
  instructor: string;
  date: string;
  location: string;
}

export { ICourseRegistration };
