export default { content:['./index.html','./src/**/*.{ts,tsx}'],
  theme:{extend:{fontFamily:{sans:['Inter','system-ui','sans-serif']},
    keyframes:{up:{from:{opacity:0,transform:'translateY(12px)'},to:{opacity:1,transform:'none'}}},
    animation:{up:'up .5s ease both'}}}, plugins:[] };
