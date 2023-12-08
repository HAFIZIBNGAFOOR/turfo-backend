const convert12HourTo24Hour =  (time12h)=> {
    const [time, modifier] = time12h.split(/\s+/); // Use a regular expression to match any whitespace character
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
      if (modifier === 'AM') {
        hours = '00';
      }
    } else if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    return `${hours}:${minutes}`;
  }
  const getCurrentTime = ()=> {
    console.log(' inside the get current time');
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return formattedTime.substring(0, 8);
}
const convert12HourTo24HourNumber =  (time12h)=> {
  if(time12h=='12:00 AM') return 24
  const [time, modifier] = time12h.split(/\s+/); // Use a regular expression to match any whitespace character
  let [hours, minutes] = time.split(':');
  if (hours === '12') {
    if (modifier === 'AM') {
      hours = '00';
    }
  } else if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  return Number(hours);
}

const convert24HourTo12HourString = (hour24) => {
  if (hour24 === 24) {
    return '12:00 AM';
  }

  const period = hour24 < 12 ? 'AM' : 'PM';
  const hours12 = hour24 % 12 || 12; // Convert 0 to 12
  const minutes = '00';

  return `${String(hours12).padStart(2, '0')}:${minutes} ${period}`;
};

const  generateRandomString = (length)=> {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return randomString;
}
module.exports ={
    getCurrentTime,
    convert12HourTo24Hour,
    convert12HourTo24HourNumber,
    convert24HourTo12HourString,
    generateRandomString
}