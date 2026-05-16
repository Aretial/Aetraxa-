import https from 'node:https';
const checkUrl = (url: string) => {
  https.get(url, (res) => {
    console.log(url, res.statusCode);
  }).on('error', (e) => {
    console.error(url, e.message);
  });
};
checkUrl('https://cdn.jsdelivr.net/gh/Nafees10/Jameel-Noori-Nastaleeq-Web-Font@master/JameelNooriNastaleeq-Regular.woff2');
checkUrl('https://cdn.jsdelivr.net/gh/Nafees10/Jameel-Noori-Nastaleeq-Web-Font/JameelNooriNastaleeq-Regular.woff2');
checkUrl('https://raw.githubusercontent.com/labeebklk/urdu-fonts/master/Jameel%20Noori%20Nastaleeq.ttf');
checkUrl('https://cdn.jsdelivr.net/npm/font-jameel-noori-nastaleeq/JameelNooriNastaleeq-Regular.woff2');
