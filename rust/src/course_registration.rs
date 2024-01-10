use std::error::Error;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RegistrationDetails {
    pub capacity: u8,
    pub actual: u8,
    pub remaining: u8,
}

impl RegistrationDetails {
    pub fn new(capacity: u8, actual: u8, remaining: u8) -> Self {
        RegistrationDetails {
            capacity,
            actual,
            remaining,
        }
    }

    pub fn changed(&self, db: &sled::Db, crn: &str) -> Result<bool, Box<dyn Error>> {
        if let Some(details) = db.get(crn)? {
            let data: RegistrationDetails = bincode::deserialize(&details)?;
            let course_is_changed = data.capacity != self.capacity || data.actual != self.actual;
            if course_is_changed {
                let encoded = bincode::serialize(&self)?;
                let _ = db.insert(crn, encoded);
                return Ok(true);
            }
        } else {
            let encoded = bincode::serialize(&self)?;
            let _ = db.insert(crn, encoded);
        }
        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use std::error::Error;

    use super::*;
    #[test]
    fn course_registration_change() -> Result<(), Box<dyn Error>> {
        let db = sled::open("test_db")?;
        let crn = "12345";
        let _ = db.remove(crn);

        let is_changed = RegistrationDetails::new(10, 10, 0).changed(&db, crn)?;
        assert_eq!(is_changed, false);
        let is_changed = RegistrationDetails::new(10, 9, 1).changed(&db, crn)?;
        assert_eq!(is_changed, true);
        let is_changed = RegistrationDetails::new(10, 9, 1).changed(&db, crn)?;
        assert_eq!(is_changed, false);
        let is_changed = RegistrationDetails::new(11, 9, 2).changed(&db, crn)?;
        assert_eq!(is_changed, true);

        let _ = std::fs::remove_dir_all("./test_db");

        Ok(())
    }
}
