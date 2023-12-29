import axios, { AxiosRequestConfig } from 'axios';
async function sendEmail(
  email: string,
  subject: string,
  subjectNumber: string,
  emailApiKey: string
) {
  const config: AxiosRequestConfig = {
    headers: {
      Authorization: `Bearer ${emailApiKey}`,
      'Content-Type': 'application/json',
    },
  };
  const data = {
    from: 'REGPO <onboarding@resend.dev>',
    to: [email],
    subject: `${subject} ${subjectNumber} Course Registration Alert`,
    text: `You can now register for ${subject} ${subjectNumber}`,
  };

  const url = 'https://api.resend.com/emails';
  return (await axios.post(url, data, config)).data;
}

export { sendEmail };
