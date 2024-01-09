use std::error::Error;
use std::fs;
use std::sync::Arc;
use serde::Deserialize;

use headless_chrome::{Browser, Tab};

#[derive(Debug)]
#[allow(dead_code)]
struct RegistrationDetails {
    capacity: u8,
    actual: u8,
    remaining: u8
}
impl RegistrationDetails {
    fn new(capacity: u8, actual: u8, remaining: u8) -> Self {
        return RegistrationDetails{
            capacity,
            actual,
            remaining
        }
    }
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Config {
    username: String,
    password: String,
    term: String,
    courses: Vec<Course>
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Course {
    crn: String,
    number: String,
    subject: String
}

fn get_course_registration_details (tab: &Arc<Tab>, crn: &str) -> Result<Option<RegistrationDetails>, Box<dyn Error>> {
    let crns: Vec<String> = tab.wait_for_elements("td.dddefault:nth-child(2)")?.into_iter().map(|e| {
        match e.get_inner_text() {
            Ok(crn_on_self_service) => {
                return crn_on_self_service;
            }
            Err(_) => {
             return "".to_string();
            }
        };
     }).collect();

    let course_registration_details = crns.into_iter().find_map(|crn_on_self_service| {
        if &crn_on_self_service == crn {
            let capacity: u8 =  tab.wait_for_element("td.dddefault:nth-child(12)").unwrap().get_inner_text().unwrap().parse().ok()?;
            let actual: u8 =  tab.wait_for_element("td.dddefault:nth-child(13)").unwrap().get_inner_text().unwrap().parse().ok()?;
            let remaining: u8 =  tab.wait_for_element("td.dddefault:nth-child(14)").unwrap().get_inner_text().unwrap().parse().ok()?;
            Some(RegistrationDetails::new(capacity, actual, remaining))
        } else {
            None
        }
    });
    Ok(course_registration_details)
}

fn can_register(registration_details: RegistrationDetails)-> bool {
    if registration_details.capacity - registration_details.actual > 0 {
        return true;
    }
    false
}

#[allow(unused_doc_comments)]
fn browse_wikipedia() -> Result<(), Box<dyn Error>> {
    let contents: String = fs::read_to_string("./config.toml")?;
    let config: Config =  toml::from_str(&contents)?;
    let username = &config.username;
    let password = &config.password;
    let term = &config.term;
    let courses_to_watch = &config.courses;

    let browser = Browser::default()?;

    let tab = browser.new_tab()?;

    let self_service_login = "https://login.mun.ca/cas/login?service=https%3A%2F%2Fselfservice.mun.ca%2Fadmit%2F";

    tab.navigate_to(self_service_login)?;

    tab.wait_for_element("input#username")?.type_into(username)?;
    tab.wait_for_element("input#password")?.type_into(password)?;
    tab.wait_for_element(".btn.btn-login.btn-block")?.click()?;
    std::thread::sleep(std::time::Duration::from_secs(1));
    tab.wait_until_navigated()?;
    for course in courses_to_watch {
        let crn = &course.crn;
        let subject = &course.subject;
        let subject_number = &course.number;
        let course_registration_url = format!("https://selfservice.mun.ca/admit/bwskfcls.P_GetCrse?term_in={term}&sel_subj=dummy&sel_subj={subject}&SEL_CRSE={subject_number}&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View%20Sections");
        tab.navigate_to(&course_registration_url)?;
        let course_registration_details = get_course_registration_details(&tab, crn)?.is_some();
        println!("{:?}", course_registration_details);
    }
    Ok(())
}

fn main() {
    let _ = browse_wikipedia();
}