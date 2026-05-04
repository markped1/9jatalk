import{writeFileSync,readFileSync}from'fs';const clean=readFileSync('src/App_clean.tsx','utf8');writeFileSync('src/App.tsx',clean+'\n','utf8');console.log('written');
