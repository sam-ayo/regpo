use reqwest::{blocking::Client, Error, StatusCode};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct SMSResponse {
    account_sid: Option<String>,
    api_version: String,
    body: String,
    date_created: String,
    date_sent: String,
    date_updated: String,
    direction: String,
    error_code: String,
    error_message: String,
    from: String,
    messaging_service_sid: String,
    num_media: String,
    num_segments: String,
    price: String,
    price_unit: String,
    sid: String,
    status: String,
    subresource_uris: SubresourceUris,
    to: String,
    uri: String,
}

#[derive(Serialize, Deserialize)]
struct SubresourceUris {
    all_time: String,
    today: String,
    yesterday: String,
    this_month: String,
    last_month: String,
    daily: String,
    monthly: String,
    yearly: String,
}

#[derive(Serialize, Deserialize)]
struct ErrorResponse {
    code: u16,
    message: String,
    more_info: String,
    status: u16,
}

pub(crate) struct TwilioClient<'a> {
    account_sid: &'a str,
    auth_token: &'a str,
    from: &'a str,
    to: &'a str,
}

impl<'a> TwilioClient<'a> {
    pub fn new(account_sid: &'a str, auth_token: &'a str, from: &'a str, to: &'a str) -> Self {
        TwilioClient {
            account_sid,
            auth_token,
            from,
            to,
        }
    }
    fn handle_error(&self, body: String) -> Result<(), Error> {
        let error_response: ErrorResponse =
            serde_json::from_str(&body).expect("Unable to deserialise JSON error response.");
        println!("{:?}", body);
        println!(
            "SMS was not able to be sent because: {:?}.",
            error_response.message
        );
        Ok(())
    }

    fn handle_success(&self, body: String) -> Result<(), Error> {
        println!("{:?}", body);
        let sms_response: SMSResponse =
            serde_json::from_str(&body).expect("Unable to deserialise JSON success response.");
        println!("Your SMS with the body \"{:?}\".", sms_response.body);
        Ok(())
    }

    pub fn send_message(&self, content: &str) -> Result<(), Error> {
        let TwilioClient {
            account_sid,
            auth_token,
            from,
            to,
        } = self;
        let request_url =
            format!("https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json");
        let client = Client::new();
        let request_params = [("To", &to), ("From", &from), ("Body", &&content)];
        let response = client
            .post(request_url)
            .basic_auth(account_sid, Some(auth_token))
            .form(&request_params)
            .send()?;

        let status = response.status();
        let body = match response.text() {
            Ok(result) => result,
            Err(error) => panic!(
                "Problem extracting the JSON body content. Reason: {:?}",
                error
            ),
        };

        match status {
            StatusCode::BAD_REQUEST => self.handle_error(body),
            StatusCode::OK => self.handle_success(body),
            _ => {
                println!("Received status code: {}", status);
                Ok(())
            }
        }
    }
}
