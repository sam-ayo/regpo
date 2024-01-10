use std::env;
use std::error::Error;
use std::fs;
use std::str;
use std::sync::Arc;
pub mod send_notification;
use clokwerk::Interval::*;
use clokwerk::{Scheduler, TimeUnits};
use course_registration::RegistrationDetails;
use dotenv::dotenv;
use headless_chrome::{Browser, Tab};
use regpo_rust::course_registration;
use send_notification::TwilioClient;
use serde::Deserialize; // Scheduler, and trait for .seconds(), .minutes(), etc.
                        // Import week days and WeekDay
use std::thread;
use std::time::Duration;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Config {
    username: String,
    password: String,
    term: String,
    courses: Vec<Course>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Course {
    crn: String,
    number: String,
    subject: String,
}

fn get_course_registration_details(
    tab: &Arc<Tab>,
    crn: &str,
) -> Result<Option<RegistrationDetails>, Box<dyn Error>> {
    let crns: Vec<String> = tab
        .wait_for_elements("td.dddefault:nth-child(2)")?
        .into_iter()
        .map(|e| {
            match e.get_inner_text() {
                Ok(crn_on_self_service) => {
                    return crn_on_self_service;
                }
                Err(_) => {
                    return "".to_string();
                }
            };
        })
        .collect();

    let course_registration_details = crns.into_iter().find_map(|crn_on_self_service| {
        if &crn_on_self_service == crn {
            let capacity: u8 = tab
                .wait_for_element("td.dddefault:nth-child(12)")
                .unwrap()
                .get_inner_text()
                .unwrap()
                .parse()
                .ok()?;
            let actual: u8 = tab
                .wait_for_element("td.dddefault:nth-child(13)")
                .unwrap()
                .get_inner_text()
                .unwrap()
                .parse()
                .ok()?;
            let remaining: u8 = tab
                .wait_for_element("td.dddefault:nth-child(14)")
                .unwrap()
                .get_inner_text()
                .unwrap()
                .parse()
                .ok()?;
            Some(RegistrationDetails::new(capacity, actual, remaining))
        } else {
            None
        }
    });
    Ok(course_registration_details)
}

fn send_message(message: &str) -> Result<(), Box<dyn Error>> {
    dotenv().ok();
    let account_sid = env::var("ACCOUNT_SID")?;
    let auth_token = env::var("AUTH_TOKEN")?;
    let from = env::var("FROM")?;
    let to = env::var("TO")?;

    let client = TwilioClient::new(&account_sid, &auth_token, &from, &to);

    let _ = client.send_message(message);
    Ok(())
}

#[allow(dead_code)]
fn course_details_changed(capacity: u8, actual: u8) -> Result<(), Box<dyn Error>> {
    let db: sled::Db = sled::open("my_db").unwrap();
    // let _ = db.insert("yo!", "v1");

    let crn = "12345";
    let registration_details = RegistrationDetails::new(capacity, actual, capacity - actual);

    let encoded = bincode::serialize(&registration_details).unwrap();
    println!("after encoded");
    let value = db.insert(crn, encoded);
    println!("{:?}", value);

    if let Some(data) = db.get(crn)? {
        let decoded: RegistrationDetails = bincode::deserialize(&data)?;
        println!("{:?}", decoded);
    }

    // for data in db.iter() {
    //     if let Ok((k, v))= data {
    //         let value = String::from_utf8(v.to_vec())?;
    //         let key = String::from_utf8(k.to_vec())?;
    //         println!("{}, {}", key, value)
    //     }
    // }
    Ok(())
}

#[allow(dead_code)]
#[allow(unused_doc_comments)]
fn browse_wikipedia() -> Result<(), Box<dyn Error>> {
    let db = sled::open("course_registration_db")?;
    let contents: String = fs::read_to_string("./config.toml")?;
    let config: Config = toml::from_str(&contents)?;
    let username = &config.username;
    let password = &config.password;
    let term = &config.term;
    let courses_to_watch = &config.courses;

    println!("Loaded config into program");

    let browser = Browser::default()?;

    let tab = browser.new_tab()?;

    let self_service_login =
        "https://login.mun.ca/cas/login?service=https%3A%2F%2Fselfservice.mun.ca%2Fadmit%2F";

    println!("Navigating to Self service for login");
    tab.navigate_to(self_service_login)?;

    println!("Inputting username");
    tab.wait_for_element("input#username")?
        .type_into(username)?;

    println!("Inputting password");
    tab.wait_for_element("input#password")?
        .type_into(password)?;
    tab.wait_for_element(".btn.btn-login.btn-block")?.click()?;
    println!("Logged in as {username}");

    println!("Sleeping for 500milliseconds");
    std::thread::sleep(std::time::Duration::from_millis(500));

    tab.wait_until_navigated()?;

    let length_of_courses_to_watch = courses_to_watch.len();
    println!("Checking all {length_of_courses_to_watch} courses");

    for course in courses_to_watch {
        let crn = &course.crn;
        let subject = &course.subject;
        let subject_number = &course.number;
        let course_registration_url = format!("https://selfservice.mun.ca/admit/bwskfcls.P_GetCrse?term_in={term}&sel_subj=dummy&sel_subj={subject}&SEL_CRSE={subject_number}&SEL_TITLE=&BEGIN_HH=0&BEGIN_MI=0&BEGIN_AP=a&SEL_DAY=dummy&SEL_PTRM=dummy&END_HH=0&END_MI=0&END_AP=a&SEL_CAMP=dummy&SEL_SCHD=dummy&SEL_SESS=dummy&SEL_INSTR=dummy&SEL_INSTR=%25&SEL_ATTR=dummy&SEL_ATTR=%25&SEL_LEVL=dummy&SEL_LEVL=%25&SEL_INSM=dummy&sel_dunt_code=&sel_dunt_unit=&call_value_in=&rsts=dummy&crn=dummy&path=1&SUB_BTN=View%20Sections");
        tab.navigate_to(&course_registration_url)?;
        println!("Checking for {} {}", subject, subject_number);

        if let Some(details) = get_course_registration_details(&tab, crn)? {
            println!("{}", details.capacity);
            if details.changed(&db, crn)? {
                println!("New");
                let RegistrationDetails {
                    capacity: new_capacity,
                    actual: new_actual,
                    remaining: new_remaining,
                } = details;

                let message = format!(
                        "Course Seat has changed since last time\nAfter: Capacity={new_capacity}, Actual={new_actual}, Remaining={new_remaining}"
                    );
                let _ = send_message(&message);
            } else {
                println!("No changes, will not alert");
            }
        }
    }
    Ok(())
}

fn main() {
    // Scheduler, and trait for .seconds(), .minutes(), etc.
    use clokwerk::{Scheduler, TimeUnits};
    // Import week days and WeekDay
    use clokwerk::Interval::*;
    use std::thread;
    use std::time::Duration;

    // Create a new scheduler
    let mut scheduler = Scheduler::new();
    // or a scheduler with a given timezone
    // Add some tasks to it
    scheduler
        .every(1.minutes())
        .run(|| println!("Periodic task"));
    scheduler.every(1.day()).run(|| println!("Daily task"));
    scheduler.every(Tuesday).run(|| println!("Biweekly task"));

    // Manually run the scheduler in an event loop
    for _ in 1..10 {
        scheduler.run_pending();
        thread::sleep(Duration::from_millis(10));
    }
    // Or run it in a background thread
    let thread_handle = scheduler.watch_thread(Duration::from_millis(100));
    // The scheduler stops when `thread_handle` is dropped, or `stop` is called
    thread_handle.stop();
}
