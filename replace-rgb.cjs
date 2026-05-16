const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/rgba\(255,92,0/g, 'rgba(219,99,33');
content = content.replace(/rgba\(255,255,255/g, 'rgba(255,242,212');
fs.writeFileSync('src/App.tsx', content, 'utf8');

// Also do it for other files if needed
const files = ['src/components/AboutPage.tsx', 'src/components/ForecastChart.tsx', 'src/components/HeatwaveSafetyTips.tsx', 'src/index.css'];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/rgba\(255,92,0/g, 'rgba(219,99,33');
    content = content.replace(/rgba\(255,100,0/g, 'rgba(219,99,33');
    content = content.replace(/rgba\(255,255,255/g, 'rgba(255,242,212');
    fs.writeFileSync(file, content, 'utf8');
  }
});
