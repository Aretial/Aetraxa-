const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.html')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.push('./index.html');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Regexes for tailwind classes with optional opacity
  // format: prefix-color/opacity or prefix-color
  
  // replace "-white" instances
  content = content.replace(/\b(bg|text|border|fill|stroke|from|via|to|ring|shadow)-white(\/(?:\[[0-9.%]+\]|[0-9]+))?\b/g, '$1-[#fff2d4]$2');
  
  // replace "-black" instances
  content = content.replace(/\b(bg|text|border|fill|stroke|from|via|to|ring|shadow)-black(\/(?:\[[0-9.%]+\]|[0-9]+))?\b/g, '$1-[#0c0a0a]$2');

  // replace stone variants that are dark
  content = content.replace(/\b(bg|text|border|from|via|to|ring|shadow)-stone-950(\/(?:\[[0-9.%]+\]|[0-9]+))?\b/g, '$1-[#0c0a0a]$2');
  content = content.replace(/\b(bg|text|border|from|via|to|ring|shadow)-stone-900(\/(?:\[[0-9.%]+\]|[0-9]+))?\b/g, '$1-[#0c0a0a]$2');
  content = content.replace(/\b(bg|text|border|from|via|to|ring|shadow)-stone-800(\/(?:\[[0-9.%]+\]|[0-9]+))?\b/g, '$1-[#0c0a0a]$2');

  // specific words in strings/values
  content = content.replace(/['"]white['"]/g, "'#fff2d4'");
  content = content.replace(/['"]black['"]/g, "'#0c0a0a'");
  
  // Hex replace Light
  content = content.replace(/#ffffff/gi, '#fff2d4');
  content = content.replace(/#fff(?![0-9a-z])/gi, '#fff2d4');
  content = content.replace(/#fff2d7/gi, '#fff2d4');
  
  // Hex replace Dark
  content = content.replace(/#000000/gi, '#0c0a0a');
  content = content.replace(/#000(?![0-9a-z])/gi, '#0c0a0a');
  content = content.replace(/#0d0d0d/gi, '#0c0a0a');
  content = content.replace(/#1a1a1a/gi, '#0c0a0a');
  content = content.replace(/#111111/gi, '#0c0a0a');
  content = content.replace(/#111(?![0-9a-z])/gi, '#0c0a0a');
  content = content.replace(/#222222/gi, '#0c0a0a');
  content = content.replace(/#222(?![0-9a-z])/gi, '#0c0a0a');
  content = content.replace(/#333333/gi, '#0c0a0a');
  content = content.replace(/#333(?![0-9a-z])/gi, '#0c0a0a');
  
  // Replace orange colors
  content = content.replace(/#c5571b/gi, '#db6321');
  content = content.replace(/#d86524/gi, '#db6321');
  content = content.replace(/#d86221/gi, '#db6321');
  content = content.replace(/#ff5c00/gi, '#db6321');
  content = content.replace(/#c45518/gi, '#db6321');
  content = content.replace(/#301305/gi, '#0c0a0a'); // too dark anyway
  
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Colors replaced successfully');
